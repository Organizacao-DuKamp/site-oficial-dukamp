import { useQuery } from "@tanstack/react-query";
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
      {query.data?.dataQuality?.partialWithoutBaseline && <p className="mt-3 text-xs text-muted-foreground">O relatório de vendas não permite separar exatamente todos os dias desse intervalo.</p>}
    </section>
  );
}
