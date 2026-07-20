import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminSalesStats } from "@/lib/orders.functions";
import { Loader2, TrendingUp, Receipt, Wallet, Package, Clock, ArrowUpRight, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/vendas/painel")({
  component: PainelVendas,
});

type Tone = "emerald" | "sky" | "amber" | "rose" | "violet" | "slate";

const TONES: Record<Tone, { grad: string; ring: string; icon: string; accent: string }> = {
  emerald: {
    grad: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-500/20",
    icon: "bg-emerald-500/15 text-emerald-700",
    accent: "text-emerald-700",
  },
  sky: {
    grad: "from-sky-500/15 via-sky-500/5 to-transparent",
    ring: "ring-sky-500/20",
    icon: "bg-sky-500/15 text-sky-700",
    accent: "text-sky-700",
  },
  amber: {
    grad: "from-amber-500/15 via-amber-500/5 to-transparent",
    ring: "ring-amber-500/25",
    icon: "bg-amber-500/15 text-amber-700",
    accent: "text-amber-700",
  },
  rose: {
    grad: "from-rose-500/15 via-rose-500/5 to-transparent",
    ring: "ring-rose-500/20",
    icon: "bg-rose-500/15 text-rose-700",
    accent: "text-rose-700",
  },
  violet: {
    grad: "from-violet-500/15 via-violet-500/5 to-transparent",
    ring: "ring-violet-500/20",
    icon: "bg-violet-500/15 text-violet-700",
    accent: "text-violet-700",
  },
  slate: {
    grad: "from-slate-500/15 via-slate-500/5 to-transparent",
    ring: "ring-slate-500/20",
    icon: "bg-slate-500/15 text-slate-700",
    accent: "text-slate-700",
  },
};

function StatCard({
  icon: Icon, label, value, hint, tone = "emerald", featured,
}: {
  icon: any; label: string; value: string; hint?: string; tone?: Tone; featured?: boolean;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm ring-1 ${t.ring} transition-all hover:shadow-md hover:-translate-y-0.5 ${featured ? "sm:col-span-2" : ""}`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.grad}`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className={`h-11 w-11 rounded-xl grid place-items-center ${t.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-2 py-1 text-[10px] font-medium text-muted-foreground border">
              <Sparkles className="h-3 w-3" /> DESTAQUE
            </span>
          )}
        </div>
        <div className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className={`mt-1 text-3xl font-bold tracking-tight ${featured ? t.accent : "text-foreground"}`}>{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function PainelVendas() {
  const fetchStats = useServerFn(adminSalesStats);
  const q = useQuery({
    queryKey: ["admin-sales-stats"],
    queryFn: () => fetchStats(),
  });

  if (q.isLoading || !q.data) {
    return <div className="py-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  }
  const s = q.data;
  const ticket = s.ordersCount ? s.bruto / s.ordersCount : 0;
  const peak = Math.max(...s.week.map((d) => d.total), 0);
  const peakDay = s.week.find((d) => d.total === peak && peak > 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-background/70 backdrop-blur border rounded-full px-3 py-1">
              <TrendingUp className="h-3.5 w-3.5" /> Últimos 30 dias
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Painel de Vendas</h1>
            <p className="mt-1 text-sm text-muted-foreground">Visão geral do desempenho, taxas e entregas do período.</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Faturamento líquido</div>
            <div className="text-3xl sm:text-4xl font-bold text-primary">{formatBRL(s.liquido)}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1">
              <ArrowUpRight className="h-3 w-3" /> {s.ordersCount} vendas aprovadas
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} tone="emerald" label="Faturamento bruto" value={formatBRL(s.bruto)} hint={`${s.ordersCount} pedidos aprovados`} />
        <StatCard icon={Wallet} tone="violet" label="Ticket médio" value={formatBRL(ticket)} hint="Valor médio por venda" />
        <StatCard icon={Receipt} tone="rose" label="Taxas Mercado Pago" value={formatBRL(s.taxas)} hint={`${(s.taxaPct * 100).toFixed(2)}% sobre Pix`} />
        <StatCard icon={Clock} tone="amber" label="Aguardando pagamento" value={String(s.pendingCount)} hint="Pix não confirmados" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Package} tone="sky" label="Entregas em aberto" value={String(s.openDeliveries)} hint="Preparando ou a caminho" />
        <StatCard icon={Sparkles} tone="slate" label="Melhor dia da semana" value={peakDay ? peakDay.label : "—"} hint={peakDay ? formatBRL(peak) : "Sem vendas ainda"} />
      </div>

      {/* Chart */}
      <div className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Vendas dos últimos 7 dias</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Total faturado por dia</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            Receita diária
          </div>
        </div>
        <ChartContainer
          config={{ total: { label: "Total", color: "var(--color-primary)" } }}
          className="h-72 w-full"
        >
          <AreaChart data={s.week} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} className="fill-muted-foreground" />
            <YAxis tickLine={false} axisLine={false} fontSize={12} className="fill-muted-foreground"
                   tickFormatter={(v) => `R$${Number(v).toFixed(0)}`} width={56} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2.5}
              fill="url(#salesFill)"
              dot={{ r: 4, strokeWidth: 2, fill: "var(--color-card)", stroke: "var(--color-total)" }}
              activeDot={{ r: 6, strokeWidth: 2, fill: "var(--color-total)", stroke: "var(--color-card)" }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
