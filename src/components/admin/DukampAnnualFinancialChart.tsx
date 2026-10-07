import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { loadStatistics } from "@/components/admin/SellerStatisticsDialog";
import { loadStatisticsExpenses, statisticsExpensesInRange } from "@/lib/statistics-expenses";
import { netProfit } from "@/lib/net-profit";

function barDateLabel(props: unknown) {
  const label = props as Record<string, unknown>;
  const { value } = label;
  const { x, y, width, height } = (label.viewBox ?? label) as Record<string, unknown>;
  const w = Number(width),
    h = Number(height);
  if (!value || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const centerX = Number(x) + w / 2,
    centerY = Number(y) + h / 2;
  const fontSize = Math.min(11, w - 4, (h - 4) / 3.2);
  if (fontSize <= 0) return null;
  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(-90 ${centerX} ${centerY})`}
      fill="#FFFFFF"
      fontSize={fontSize}
      fontWeight={600}
      pointerEvents="none"
    >
      {String(value)}
    </text>
  );
}

function barColor(value: number | null, previous = false) {
  return value !== null && value < 0
    ? previous
      ? "#991B1B"
      : "#DC2626"
    : previous
      ? "#166534"
      : "#159447";
}

export function DukampAnnualFinancialChart({ year }: { year: number }) {
  const [mode, setMode] = useState("expenses");
  const expenses = useQuery({
    queryKey: ["admin", "dukamp-statistics-expenses"],
    queryFn: () => loadStatisticsExpenses(supabase),
    staleTime: 0,
  });
  const statistics = useQuery({
    queryKey: ["admin-sales-statistics", "dukamp", "year", `${year}-01-01`, `${year}-12-31`],
    queryFn: () => loadStatistics(null, "year", `${year}-01-01`, `${year}-12-31`),
    staleTime: 0,
    enabled: mode === "profit",
  });
  const previousStatistics = useQuery({
    queryKey: [
      "admin-sales-statistics",
      "dukamp",
      "year",
      `${year - 1}-01-01`,
      `${year - 1}-12-31`,
    ],
    queryFn: () => loadStatistics(null, "year", `${year - 1}-01-01`, `${year - 1}-12-31`),
    enabled: mode === "profit",
    staleTime: 0,
  });
  const expense = (y: number, m: number) =>
    expenses.data
      ? statisticsExpensesInRange(
          expenses.data,
          `${y}-${String(m).padStart(2, "0")}-01`,
          `${y}-${String(m).padStart(2, "0")}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`,
        ).amount
      : null;
  const profit = (y: number, month: number) => {
    const source = y === year ? statistics.data : previousStatistics.data;
    const row = source?.annualSeries?.find((r) => r.month === month);
    return row?.hasData ? netProfit(row.margem_bruta, expense(y, month)) : null;
  };
  const rows = Array.from({ length: 12 }, (_, i) => ({
    atualDate: `${String(i + 1).padStart(2, "0")}/${String(year).slice(-2)}`,
    anteriorDate: `${String(i + 1).padStart(2, "0")}/${String(year - 1).slice(-2)}`,
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year, i, 1)),
    atual: mode === "expenses" ? expense(year, i + 1) : profit(year, i + 1),
    anterior: mode === "expenses" ? expense(year - 1, i + 1) : profit(year - 1, i + 1),
  })).map((row) => ({
    ...row,
    atualMagnitude: row.atual === null ? null : Math.abs(row.atual),
    anteriorMagnitude: row.anterior === null ? null : Math.abs(row.anterior),
  }));
  const pending =
    expenses.isPending ||
    (mode === "profit" && (statistics.isPending || previousStatistics.isPending));
  const error =
    expenses.isError || (mode === "profit" && (statistics.isError || previousStatistics.isError));
  const money = (v: unknown) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <section className="mt-6 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {mode === "expenses" ? "Despesas" : "Lucro líquido"} · {year}
          </h2>
          <p className="text-xs text-muted-foreground">
            Cada mês comparado ao mesmo mês do ano anterior. Despesas com as exclusões das
            Estatísticas DuKamp.
          </p>
        </div>
        <select
          aria-label="Indicador do gráfico anual"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="expenses">Despesas</option>
          <option value="profit">Lucro líquido</option>
        </select>
      </div>
      <div className="h-[350px] overflow-x-auto">
        {pending ? (
          <p role="status">Carregando gráfico...</p>
        ) : error ? (
          <p role="alert">
            Não foi possível carregar o gráfico.{" "}
            <button
              className="underline"
              onClick={() => {
                void expenses.refetch();
                void statistics.refetch();
                void previousStatistics.refetch();
              }}
            >
              Tentar novamente
            </button>
          </p>
        ) : (
          <div className="h-full min-w-[900px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis
                  width={75}
                  domain={[0, "auto"]}
                  tickFormatter={(v) => Number(v).toLocaleString("pt-BR", { notation: "compact" })}
                />
                <ReferenceLine y={0} stroke="#64748B" />
                <Tooltip
                  formatter={(_value, _name, item) => {
                    const previous = item.dataKey === "anteriorMagnitude";
                    const original = previous ? item.payload.anterior : item.payload.atual;
                    const date = previous ? item.payload.anteriorDate : item.payload.atualDate;
                    return [
                      <span style={{ color: barColor(original, previous) }}>
                        {money(original)}
                      </span>,
                      `${mode === "expenses" ? "Despesas" : "Lucro líquido"} · ${date}`,
                    ];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="atualMagnitude"
                  name={`${mode === "expenses" ? "Despesas" : "Lucro líquido"} · ${year}`}
                  fill="#159447"
                  radius={[5, 5, 0, 0]}
                >
                  {rows.map((row) => (
                    <Cell key={row.month} fill={barColor(row.atual)} />
                  ))}
                  <LabelList dataKey="atualDate" content={barDateLabel} />
                </Bar>
                <Bar
                  dataKey="anteriorMagnitude"
                  name={`${mode === "expenses" ? "Despesas" : "Lucro líquido"} · ${year - 1}`}
                  fill="#166534"
                  radius={[5, 5, 0, 0]}
                >
                  {rows.map((row) => (
                    <Cell key={row.month} fill={barColor(row.anterior, true)} />
                  ))}
                  <LabelList dataKey="anteriorDate" content={barDateLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Meses sem relatório ficam sem valor; lucro líquido exige margem bruta e despesas
        disponíveis. As barras crescem para cima pela magnitude do valor. O sinal original aparece
        ao passar o cursor: negativos em vermelho; zero ou positivos em verde. Tons escuros
        representam o ano anterior.
      </p>
    </section>
  );
}
