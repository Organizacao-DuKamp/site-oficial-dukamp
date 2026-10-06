import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bankOverviewRangeAmounts, type BankOverviewReport } from "@/lib/bank-overview";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents: number) => currency.format(cents / 100);
const card = "rounded-2xl border bg-card p-5 shadow-sm";

function difference(current: number | null, prior: number | null, label: string) {
  if (current === null || prior === null) return `Sem base no ${label}`;
  const delta = current - prior;
  return `${delta > 0 ? "+" : ""}${money(delta)} vs. ${label}`;
}

export function BankOverviewMetrics({ periods, previousPeriods, comparisonLabel }: { periods: number[]; previousPeriods: number[]; comparisonLabel: string }) {
  const reports = useQuery({
    queryKey: ["admin", "dukamp-bank-overview", "statement-summary"],
    queryFn: async (): Promise<BankOverviewReport[]> => {
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

  const { credits, expenses, result, availableMonths } = bankOverviewRangeAmounts(reports.data, periods);
  const { credits: priorCredits, expenses: priorExpenses, result: priorResult } = bankOverviewRangeAmounts(reports.data, previousPeriods);

  return (
    <section aria-label="Resultado dos registros bancários" className="mb-5">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Resultado dos registros bancários</h2>
        <p className="text-xs text-muted-foreground">
          Entradas do extrato menos despesas do resumo bancário. Os créditos bancários podem incluir
          valores que não são vendas; este resultado não substitui o lucro contábil.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className={card}>
          <p className="text-sm text-muted-foreground">Lucro bruto · entradas bancárias</p>
          <p className="mt-3 text-2xl font-bold tabular-nums">{credits === null ? "Sem dados" : money(credits)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{difference(credits, priorCredits, comparisonLabel)}</p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted-foreground">Despesas DuKamp · resumo bancário</p>
          <p className="mt-3 text-2xl font-bold tabular-nums">{expenses === null ? "Sem relatório" : money(expenses)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{difference(expenses, priorExpenses, comparisonLabel)}</p>
        </div>
        <div className={`${card} ${result === null ? "" : result < 0 ? "border-red-300" : "border-emerald-300"}`}>
          <p className="text-sm text-muted-foreground">Resultado · entradas − despesas</p>
          <p className={`mt-3 text-2xl font-bold tabular-nums ${result === null ? "" : result < 0 ? "text-red-700" : "text-emerald-700"}`}>
            {result === null ? "Sem dados suficientes" : money(result)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {result === null ? "Extrato de entradas indisponível para este período" : result < 0 ? "Negativo" : "Positivo"}
            {result !== null ? ` · ${difference(result, priorResult, comparisonLabel)}` : ""}
          </p>
        </div>
      </div>
      {availableMonths > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {periods.length > 1 && `${availableMonths} de ${periods.length} meses com dados bancários completos. `}Valores do registro bancário; os saques sem conciliação não foram somados novamente às despesas.
        </p>
      )}
    </section>
  );
}
