import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadStatisticsExpenses, statisticsExpensesInRange } from "@/lib/statistics-expenses";
import { netProfit } from "@/lib/net-profit";
import { BarChart3 } from "lucide-react";
import { loadStatistics, StatisticsMetricCard } from "@/components/admin/SellerStatisticsDialog";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function DukampCommercialMetrics({ mode, from, to }: { mode: "month" | "year" | "custom"; from: string; to: string }) {
  const query = useQuery({
    queryKey: ["admin-sales-statistics", "dukamp", mode, from, to],
    queryFn: () => loadStatistics(null, mode, from, to),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const expensesQuery = useQuery({
    queryKey: ["admin", "dukamp-statistics-expenses"],
    queryFn: () => loadStatisticsExpenses(supabase),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const expenses = expensesQuery.data ? statisticsExpensesInRange(expensesQuery.data, from, to) : null;
  const pending = query.isPending || expensesQuery.isPending;
  const failed = query.isError || expensesQuery.isError;
  const profit = pending || failed ? null : netProfit(query.data?.summary?.margem_bruta, expenses?.amount);
  const expenseValue = expensesQuery.isPending ? "Carregando..." : expensesQuery.isError ? "Indisponível" : expenses?.amount == null ? "Não disponível" : money(expenses.amount);
  const profitValue = pending ? "Carregando..." : failed ? "Indisponível" : profit === null ? "Não disponível" : money(profit);
  const expenseHelper = expensesQuery.isPending ? "Consultando relatórios mensais" : expensesQuery.isError ? "Não foi possível consultar as despesas" : expenses?.amount == null ? "Relatório mensal ainda não disponível" : !expenses.complete ? `${expenses.availableMonths} de ${expenses.expectedMonths} meses disponíveis` : mode === "custom" ? "Total dos meses incluídos; sem rateio diário" : undefined;
  const summary = query.data?.summary;
  const comparison = query.data?.comparison;
  const helper = query.isPending ? "Consultando estatísticas" : query.isError ? "Não foi possível consultar as estatísticas" : undefined;
  const value = (key: string) => query.isPending ? "Carregando..." : query.isError || !summary ? "Indisponível" : money(summary[key] ?? 0);

  return (
    <section aria-label="Indicadores principais da DuKamp" className="rounded-2xl border border-primary/25 bg-gradient-to-br from-emerald-50/70 to-card p-4 shadow-sm dark:from-emerald-950/20 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><BarChart3 className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-semibold">Desempenho comercial DuKamp</h2>
          <p className="text-xs text-muted-foreground">Vendas, custo total e margem bruta das Estatísticas DuKamp no período selecionado.</p>
        </div>
      </div>
      {query.isError && <button onClick={() => query.refetch()} className="mb-3 text-sm underline">Tentar novamente</button>}
      <div className="grid gap-3 md:grid-cols-3">
        <StatisticsMetricCard label="Vendas" value={value("total_venda")} trend={comparison?.total_venda} helper={helper} />
        <StatisticsMetricCard label="Custo total" value={value("total_custo")} trend={comparison?.total_custo} inverse helper={helper} />
        <StatisticsMetricCard label="Margem bruta" value={value("margem_bruta")} trend={comparison?.margem_bruta} helper={helper} />
      </div>
      <div className="mt-4 border-t border-primary/15 pt-4">
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Faturamento → custo total (mercadoria) → margem bruta recebida → despesas → lucro líquido</p>
        <div className="grid gap-3 md:grid-cols-2">
          <StatisticsMetricCard label="Despesas" value={expenseValue} helper={expenseHelper ?? "Mesmas despesas filtradas das Estatísticas DuKamp"} />
          <StatisticsMetricCard label="Lucro líquido" value={profitValue} valueTone={profit === null ? undefined : profit < 0 ? "negative" : "positive"} helper={expenseHelper ?? "Margem bruta − despesas"} />
        </div>
      </div>
      {query.data?.dataQuality?.partialWithoutBaseline && <p className="mt-3 text-xs text-muted-foreground">O relatório de vendas não permite separar exatamente todos os dias desse intervalo.</p>}
    </section>
  );
}
