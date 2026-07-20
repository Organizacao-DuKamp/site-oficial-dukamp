import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminSalesStats } from "@/lib/orders.functions";
import {
  MessageSquare, ClipboardList, Users, Package, ShoppingBag,
  TrendingUp, Wallet, Clock, ArrowUpRight,
} from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: GeneralDashboard,
});

type Tone = "emerald" | "sky" | "violet" | "amber" | "rose" | "slate";

const TONES: Record<Tone, { grad: string; ring: string; icon: string }> = {
  emerald: { grad: "from-emerald-500/15 via-emerald-500/5 to-transparent", ring: "ring-emerald-500/20", icon: "bg-emerald-500/15 text-emerald-700" },
  sky:     { grad: "from-sky-500/15 via-sky-500/5 to-transparent",         ring: "ring-sky-500/20",     icon: "bg-sky-500/15 text-sky-700" },
  violet:  { grad: "from-violet-500/15 via-violet-500/5 to-transparent",   ring: "ring-violet-500/20",  icon: "bg-violet-500/15 text-violet-700" },
  amber:   { grad: "from-amber-500/15 via-amber-500/5 to-transparent",     ring: "ring-amber-500/25",   icon: "bg-amber-500/15 text-amber-700" },
  rose:    { grad: "from-rose-500/15 via-rose-500/5 to-transparent",       ring: "ring-rose-500/20",    icon: "bg-rose-500/15 text-rose-700" },
  slate:   { grad: "from-slate-500/10 via-slate-500/5 to-transparent",     ring: "ring-slate-500/20",   icon: "bg-slate-500/10 text-slate-700" },
};

function AreaCard({
  tone, icon: Icon, label, value, hint, to,
}: { tone: Tone; icon: any; label: string; value: React.ReactNode; hint?: string; to: string }) {
  const t = TONES[tone];
  return (
    <Link to={to} className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${t.grad} ring-1 ${t.ring} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Link>
  );
}

function GeneralDashboard() {
  const salesFn = useServerFn(adminSalesStats);
  const sales = useQuery({ queryKey: ["admin", "general", "sales"], queryFn: () => salesFn() });

  const counts = useQuery({
    queryKey: ["admin", "general", "counts"],
    queryFn: async () => {
      const [tickets, openTickets, requests, pendingReq, accounts, products] = await Promise.all([
        supabase.from("support_tickets").select("*", { count: "exact", head: true }),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("account_requests").select("*", { count: "exact", head: true }),
        supabase.from("account_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
      ]);
      return {
        tickets: tickets.count ?? 0,
        openTickets: openTickets.count ?? 0,
        requests: requests.count ?? 0,
        pendingReq: pendingReq.count ?? 0,
        accounts: accounts.count ?? 0,
        products: products.count ?? 0,
      };
    },
  });

  const s = sales.data;
  const c = counts.data;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/60 backdrop-blur border text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Visão geral · últimos 30 dias
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Dashboard geral</h1>
          <p className="text-sm text-muted-foreground mt-1">Um resumo de todas as áreas do painel administrativo.</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Faturamento líquido</div>
              <div className="text-3xl font-bold mt-1">{s ? formatBRL(s.liquido) : "..."}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Vendas aprovadas</div>
              <div className="text-3xl font-bold mt-1">{s?.ordersCount ?? "..."}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Entregas em aberto</div>
              <div className="text-3xl font-bold mt-1">{s?.openDeliveries ?? "..."}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Área cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AreaCard tone="sky"     icon={MessageSquare} label="Atendimentos" value={c?.openTickets ?? "..."} hint={`${c?.tickets ?? 0} tickets no total`} to="/admin/atendimentos" />
        <AreaCard tone="amber"   icon={ClipboardList} label="Solicitações" value={c?.pendingReq ?? "..."} hint={`${c?.requests ?? 0} solicitações registradas`} to="/admin/solicitacoes" />
        <AreaCard tone="violet"  icon={Users}         label="Contas"       value={c?.accounts ?? "..."}   hint="Usuários cadastrados" to="/admin/contas" />
        <AreaCard tone="emerald" icon={Package}       label="Estoque"      value={c?.products ?? "..."}   hint="Produtos ativos" to="/admin/estoque" />
        <AreaCard tone="rose"    icon={ShoppingBag}   label="Vendas"       value={s ? formatBRL(s.bruto) : "..."} hint={`${s?.pendingCount ?? 0} aguardando pagamento`} to="/admin/vendas/painel" />
        <AreaCard tone="slate"   icon={Wallet}        label="Taxas (MP)"   value={s ? formatBRL(s.taxas) : "..."} hint={`≈ ${s ? (s.taxaPct * 100).toFixed(2) : "0"}% por venda`} to="/admin/vendas/painel" />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Vendas nos últimos 7 dias</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Atualizado agora</p>
          </div>
        </div>
        <ChartContainer
          config={{ total: { label: "Total", color: "var(--color-primary)" } }}
          className="h-[260px] w-full"
        >
          <AreaChart data={s?.week ?? []} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gen-total" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => formatBRL(Number(v))} width={90} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
            <Area type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} fill="url(#gen-total)" />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
