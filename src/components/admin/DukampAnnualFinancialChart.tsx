import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { loadStatistics } from "@/components/admin/SellerStatisticsDialog";
import { loadStatisticsExpenses, statisticsExpensesInRange } from "@/lib/statistics-expenses";
import { netProfit } from "@/lib/net-profit";

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
  const december = useQuery({
    queryKey: [
      "admin-sales-statistics",
      "dukamp",
      "month",
      `${year - 1}-12-01`,
      `${year - 1}-12-31`,
    ],
    queryFn: () => loadStatistics(null, "month", `${year - 1}-12-01`, `${year - 1}-12-31`),
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
  const profit = (month: number) => {
    if (!month)
      return december.data?.dataQuality?.hasMarginData
        ? netProfit(december.data.summary?.margem_bruta, expense(year - 1, 12))
        : null;
    const row = statistics.data?.annualSeries?.find((r) => r.month === month);
    return row?.hasData ? netProfit(row.margem_bruta, expense(year, month)) : null;
  };
  const rows = Array.from({ length: 12 }, (_, i) => ({
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year, i, 1)),
    atual: mode === "expenses" ? expense(year, i + 1) : profit(i + 1),
    anterior: mode === "expenses" ? expense(i ? year : year - 1, i || 12) : profit(i),
  }));
  const pending =
    expenses.isPending || (mode === "profit" && (statistics.isPending || december.isPending));
  const error = expenses.isError || (mode === "profit" && (statistics.isError || december.isError));
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
            Ano mês a mês, comparado ao mês imediatamente anterior. Despesas com as exclusões das
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
      <div className="h-[350px]">
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
                void december.refetch();
              }}
            >
              Tentar novamente
            </button>
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis
                width={75}
                tickFormatter={(v) => Number(v).toLocaleString("pt-BR", { notation: "compact" })}
              />
              <Tooltip formatter={money} />
              <Legend />
              <Bar dataKey="anterior" name="Mês anterior" fill="#94A3B8" radius={[5, 5, 0, 0]} />
              <Bar
                dataKey="atual"
                name={mode === "expenses" ? "Despesas do mês" : "Lucro líquido do mês"}
                fill="#159447"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Meses sem relatório ficam sem valor; lucro líquido exige margem bruta e despesas
        disponíveis.
      </p>
    </section>
  );
}
