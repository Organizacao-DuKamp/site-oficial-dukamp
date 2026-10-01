import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type BankSummary = {
  year: number;
  month: number;
  payload: {
    total: number;
    bank_totals?: { credits: number };
  };
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents: number) => currency.format(cents / 100);
const card = "rounded-2xl border bg-card p-5 shadow-sm";

function previous(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function difference(current: number | null, prior: number | null) {
  if (current === null || prior === null) return "Sem base no mês anterior";
  const delta = current - prior;
  return `${delta > 0 ? "+" : ""}${money(delta)} vs. mês anterior`;
}

export function BankOverviewMetrics({ year, month }: { year: number; month: number }) {
  const reports = useQuery({
    queryKey: ["admin", "dukamp-bank-overview"],
    queryFn: async (): Promise<BankSummary[]> => {
      const { data, error } = await (supabase as any)
        .from("dukamp_bank_reports")
        .select("year,month,payload")
        .order("year")
        .order("month");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  if (reports.isPending) return <p role="status">Carregando resultado bancário...</p>;
  if (reports.isError)
    return <p role="alert" className={card}>Não foi possível consultar os registros bancários.</p>;

  const current = reports.data.find((r) => r.year === year && r.month === month);
  const previousPeriod = previous(year, month);
  const prior = reports.data.find(
    (r) => r.year === previousPeriod.year && r.month === previousPeriod.month,
  );
  const credits = current?.payload.bank_totals?.credits ?? null;
  const expenses = current?.payload.total ?? null;
  const result = credits !== null && expenses !== null ? credits - expenses : null;
  const priorCredits = prior?.payload.bank_totals?.credits ?? null;
  const priorExpenses = prior?.payload.total ?? null;
  const priorResult = priorCredits !== null && priorExpenses !== null
    ? priorCredits - priorExpenses : null;

  return (
    <section aria-label="Resultado dos registros bancários" className="mb-5">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Resultado dos registros bancários</h2>
        <p className="text-xs text-muted-foreground">
          Entradas do extrato menos despesas do resumo mensal. Os créditos bancários podem incluir
          valores que não são vendas; este resultado não substitui o lucro contábil.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className={card}>
          <p className="text-sm text-muted-foreground">Lucro bruto · entradas bancárias</p>
          <p className="mt-3 text-2xl font-bold tabular-nums">{credits === null ? "Sem dados" : money(credits)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{difference(credits, priorCredits)}</p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted-foreground">Despesas DuKamp · resumo bancário</p>
          <p className="mt-3 text-2xl font-bold tabular-nums">{expenses === null ? "Sem relatório" : money(expenses)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{difference(expenses, priorExpenses)}</p>
        </div>
        <div className={`${card} ${result === null ? "" : result < 0 ? "border-red-300" : "border-emerald-300"}`}>
          <p className="text-sm text-muted-foreground">Resultado · entradas − despesas</p>
          <p className={`mt-3 text-2xl font-bold tabular-nums ${result === null ? "" : result < 0 ? "text-red-700" : "text-emerald-700"}`}>
            {result === null ? "Sem dados suficientes" : money(result)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {result === null ? "Extrato de entradas indisponível para este mês" : result < 0 ? "Negativo" : "Positivo"}
            {result !== null ? ` · ${difference(result, priorResult)}` : ""}
          </p>
        </div>
      </div>
      {current?.payload.bank_totals && (
        <p className="mt-2 text-xs text-muted-foreground">
          Valores do registro bancário; os saques sem conciliação não foram somados novamente às despesas.
        </p>
      )}
    </section>
  );
}
