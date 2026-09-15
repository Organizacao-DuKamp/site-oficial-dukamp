import { useState } from "react";
import { ArrowLeftRight, Landmark } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  BANK_MONTHS,
  bankAnnualSeries,
  bankComparison,
  previousBankPeriod,
  type BankReport,
} from "@/lib/bank-reports";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents: number) => currency.format(cents / 100);
const compact = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const tooltipMoney = (value: unknown) => currency.format(Number(value));
const panel = "min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6";
const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid #E2E8F0",
  boxShadow: "0 8px 24px #0F172A12",
  fontSize: 12,
};

export function BankRecordsPanel() {
  const { isMasterAdmin } = useAuth();
  const [period, setPeriod] = useState<{ year: number; month: number } | null>(null);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["admin", "bank-records"],
    enabled: isMasterAdmin,
    staleTime: 300_000,
    queryFn: async (): Promise<BankReport[]> => {
      const { data, error } = await (supabase as any)
        .from("dukamp_bank_reports")
        .select("year,month,source_name,payload")
        .order("year")
        .order("month");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!isMasterAdmin) return null;
  if (query.isPending) return <p role="status">Carregando registros bancários...</p>;
  if (query.isError)
    return (
      <div className={panel} role="alert">
        <h1 className="font-semibold">Não foi possível carregar os registros</h1>
        <p className="my-2 text-sm text-muted-foreground">Confira sua sessão e tente novamente.</p>
        <button className="underline" onClick={() => query.refetch()}>
          Tentar novamente
        </button>
      </div>
    );
  const reports = query.data;
  if (!reports.length) return <div className={panel}>Nenhum relatório bancário importado.</div>;
  const selected = period ?? reports[reports.length - 1];
  const current = reports.find((r) => r.year === selected.year && r.month === selected.month);
  const previousKey = previousBankPeriod(selected.year, selected.month);
  const previous = reports.find(
    (r) => r.year === previousKey.year && r.month === previousKey.month,
  );
  const annual = reports.filter((r) => r.year === selected.year);
  const annualTotal = annual.reduce((sum, r) => sum + r.payload.total, 0);
  const comparison = current
    ? bankComparison(current.payload.total, previous?.payload.total ?? null)
    : null;
  const years = [...new Set(reports.map((r) => r.year))].sort((a, b) => b - a);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const groups =
    current?.payload.groups.filter((g) =>
      normalize(g.name + " " + g.items.map((i) => i.description).join(" ")).includes(
        normalize(search),
      ),
    ) ?? [];
  const categoryNames = [
    ...new Set(
      [...(current?.payload.groups ?? []), ...(previous?.payload.groups ?? [])].map((g) => g.name),
    ),
  ];
  const categoryComparison = categoryNames.map((name) => ({
    name,
    atual: (current?.payload.groups.find((g) => g.name === name)?.subtotal ?? 0) / 100,
    anterior: previous
      ? (previous.payload.groups.find((g) => g.name === name)?.subtotal ?? 0) / 100
      : null,
  }));

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col justify-between gap-5 rounded-2xl border border-emerald-600/15 bg-gradient-to-br from-emerald-50/70 to-card p-5 dark:from-emerald-950/20 sm:p-6 xl:flex-row xl:items-end">
        <div className="min-w-0">
          <div className="mb-3 inline-flex rounded-xl bg-emerald-600/10 p-2.5 text-emerald-700 dark:text-emerald-400">
            <Landmark className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Despesas DuKamp / Controle bancário</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Registros bancários</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Relatórios mensais por grupo de despesas e memória de conciliação. Valores reproduzidos
            dos documentos enviados.
          </p>
        </div>
        <div className="flex min-w-0 shrink-0 gap-3 rounded-xl border bg-card/80 p-3">
          <label className="flex flex-col gap-1 text-xs font-medium">
            Ano
            <select
              aria-label="Ano dos registros"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              value={selected.year}
              onChange={(e) => setPeriod({ year: Number(e.target.value), month: selected.month })}
            >
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Mês
            <select
              aria-label="Mês dos registros"
              className="h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm"
              value={selected.month}
              onChange={(e) => setPeriod({ year: selected.year, month: Number(e.target.value) })}
            >
              {BANK_MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                  {!annual.some((r) => r.month === i + 1) ? " · sem relatório" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label={`Total conciliado · ${BANK_MONTHS[selected.month - 1]}`}
          value={current ? money(current.payload.total) : "Sem relatório"}
          note="Total informado no documento, não saldo disponível"
        />
        <Metric
          label={`Acumulado de ${selected.year}`}
          value={money(annualTotal)}
          note={`${annual.length} de 12 meses disponíveis · ano parcial quando incompleto`}
        />
        <Metric
          label="Comparação com mês anterior"
          comparison
          value={
            comparison
              ? `${comparison.difference > 0 ? "+ " : ""}${money(comparison.difference)}`
              : "Sem base"
          }
          note={
            comparison
              ? comparison.percent === null
                ? "Base anterior zerada; percentual indisponível"
                : `${comparison.percent >= 0 ? "+" : ""}${comparison.percent.toFixed(2)}% em relação a ${BANK_MONTHS[previousKey.month - 1]}/${previousKey.year}`
              : `Relatório de ${BANK_MONTHS[previousKey.month - 1]}/${previousKey.year} indisponível ou mês atual sem relatório`
          }
        />
        <Metric
          label="Ajuste líquido de conciliação"
          value={current ? money(current.payload.adjustment) : "—"}
          note="Incluído no total conciliado; não somar novamente"
        />
      </section>
      <section className={panel}>
        <h2 className="font-semibold">Evolução anual · {selected.year}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Meses sem relatório permanecem sem valor, não são considerados zero.
        </p>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart
              data={bankAnnualSeries(reports, selected.year)}
              margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
            >
              <CartesianGrid stroke="#CBD5E1" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={compact} width={65} />
              <Tooltip formatter={tooltipMoney} contentStyle={chartTooltipStyle} />
              <Legend />
              <Line
                dataKey="total"
                name="Total conciliado"
                stroke="#159447"
                strokeWidth={3}
                connectNulls={false}
              />
              <Line
                dataKey="original"
                name="Resumo original"
                stroke="#64748B"
                strokeWidth={2}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      {!current ? (
        <div className={panel}>
          <h2 className="font-semibold">
            Sem registros para {BANK_MONTHS[selected.month - 1]}/{selected.year}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha um mês com relatório. Nenhum valor foi estimado.
          </p>
        </div>
      ) : (
        <>
          <section className={panel}>
            <h2 className="font-semibold">Valores do mês por grupo</h2>
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
              {previous
                ? `Comparação com ${BANK_MONTHS[previous.month - 1]}/${previous.year}`
                : "Mês anterior indisponível; exibindo apenas o período selecionado."}{" "}
              · Ajuste de conciliação mostrado separadamente abaixo.
            </p>
            <div className="mt-4 h-[520px] w-full">
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={categoryComparison}
                  margin={{ left: 0, right: 12, top: 5, bottom: 5 }}
                >
                  <CartesianGrid stroke="#CBD5E1" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={125}
                    tick={{ fontSize: 9 }}
                    tickFormatter={(s) => (s.length > 21 ? s.slice(0, 20) + "…" : s)}
                  />
                  <Tooltip formatter={tooltipMoney} />
                  <Legend />
                  {previous && (
                    <Bar
                      dataKey="anterior"
                      name="Mês anterior"
                      fill="#94A3B8"
                      radius={[0, 3, 3, 0]}
                    />
                  )}
                  <Bar
                    dataKey="atual"
                    name="Mês selecionado"
                    fill="#159447"
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold">
              Registros de {BANK_MONTHS[current.month - 1]}/{current.year}
            </h2>
            <input
              aria-label="Buscar registros"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo ou descrição..."
              className="h-10 rounded-lg border bg-background px-3 text-sm sm:w-72"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {current.payload.groups.reduce((n, g) => n + g.items.length, 0)} rubricas em{" "}
            {current.payload.groups.length} grupos. Valores agregados mensais, sem inventar datas ou
            favorecidos.
          </p>
          <section className="grid items-start gap-4 xl:grid-cols-2">
            {groups.map((g) => (
              <article key={g.name} className={panel}>
                <div className="mb-3 flex flex-wrap justify-between gap-2 border-b pb-3">
                  <h3 className="text-sm font-semibold">{g.name}</h3>
                  <span className="font-bold tabular-nums">{money(g.subtotal)}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 text-left font-medium">Descrição</th>
                      <th className="pb-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3">{item.description}</td>
                        <td className="whitespace-nowrap py-2 text-right tabular-nums">
                          {money(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            ))}
          </section>
          {!groups.length && (
            <p className="text-sm text-muted-foreground">
              Nenhum grupo encontrado para essa busca.
            </p>
          )}
          <section className={panel}>
            <h2 className="font-semibold">Pagamento por fora / Conciliação</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Transcrição da memória do relatório. Saques, ajustes e linhas de totalização são
              distintos; valores negativos são preservados.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-2">Data / referência</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">Movimento</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {current.payload.reconciliation.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-b ${r.summary ? "bg-muted/50 font-semibold" : ""}`}
                    >
                      <td className="p-2">{r.reference || "Totalização"}</td>
                      <td className="p-2">{r.description}</td>
                      <td className="p-2 text-xs text-muted-foreground">{r.movement}</td>
                      <td className="whitespace-nowrap p-2 text-right tabular-nums">
                        {money(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Resumo original"
                value={money(current.payload.original)}
                note="Soma dos grupos"
              />
              <Metric
                label="Ajuste líquido"
                value={money(current.payload.adjustment)}
                note="Acréscimo ou redução"
              />
              <Metric
                label="Total conciliado"
                value={money(current.payload.total)}
                note="Original + ajuste líquido"
              />
            </div>
          </section>
          <details className={panel}>
            <summary className="cursor-pointer text-sm font-semibold">
              Conferir texto completo do relatório original
            </summary>
            <p className="mt-3 break-all text-xs text-muted-foreground">
              Fonte: {current.source_name}
            </p>
            <pre className="mt-4 whitespace-pre-wrap break-words text-xs leading-6">
              {current.payload.source_text}
            </pre>
          </details>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Base privada. Esta consulta não altera nem soma novamente os valores da visão geral de
        Despesas DuKamp.
      </p>
    </div>
  );
}
function Metric({
  label,
  value,
  note,
  comparison = false,
}: {
  label: string;
  value: string;
  note: string;
  comparison?: boolean;
}) {
  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-2xl border p-5 shadow-sm ${comparison ? "border-red-200 bg-gradient-to-br from-red-50 to-card dark:border-red-900/60 dark:from-red-950/30" : "border-border/70 bg-card"}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${comparison ? "bg-red-500" : "bg-emerald-600/70"}`}
      />
      <p
        className={`flex items-center gap-2 text-xs font-semibold ${comparison ? "text-red-700 dark:text-red-300" : "text-muted-foreground"}`}
      >
        {comparison && <ArrowLeftRight className="h-4 w-4 shrink-0" />}
        {label}
      </p>
      <p
        className={`mt-4 break-words text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${comparison ? "text-red-700 dark:text-red-300" : "text-foreground"}`}
      >
        {value}
      </p>
      <p
        className={`mt-3 text-xs leading-5 ${comparison ? "font-medium text-red-700 dark:text-red-300" : "text-muted-foreground"}`}
      >
        {note}
      </p>
    </div>
  );
}
