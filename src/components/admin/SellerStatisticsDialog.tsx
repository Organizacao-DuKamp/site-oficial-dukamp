import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  FileSpreadsheet,
  Loader2,
  MapPin,
  PackageOpen,
  Percent,
  Search,
  ShoppingCart,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Seller } from "@/lib/sellers";

type PeriodMode = "month" | "day" | "year" | "custom";

type StatisticsResponse = {
  error?: string;
  sellerCodeMissing?: boolean;
  seller?: { id: string | null; name: string; code: string | null };
  period?: { from: string; to: string; previousFrom?: string; previousTo?: string };
  summary?: Record<string, number>;
  previousSummary?: Record<string, number>;
  comparison?: Record<string, number | null>;
  dataQuality?: {
    hasMarginData: boolean;
    hasPreviousMarginData?: boolean;
    partialWithoutBaseline: boolean;
  };
  annualSeries?: Array<{
    month: number;
    label: string;
    total_venda: number;
    previous_total_venda: number;
    margem_bruta: number;
    tonelagem: number;
    hasData: boolean;
    previousHasData?: boolean;
  }>;
  comparisonSeries?: Array<{ label: string; current: number; previous: number }>;
  marginReport?: Record<string, string | number | null> | null;
  clients?: Array<{
    id: string;
    code: string;
    name: string;
    city: string | null;
    uf: string | null;
    phone: string | null;
    email: string | null;
    lastPurchase: string | null;
    annualPurchase: number;
  }>;
  nearBlueClients?: Array<{
    id: string;
    codigo: string;
    cliente: string;
    cidade: string | null;
    uf: string | null;
    ultima_compra: string;
    entersBlueAt: string;
    daysRemaining: number;
  }>;
  topCustomers?: Array<{
    id: string;
    code: string;
    name: string;
    city: string | null;
    uf: string | null;
    total: number;
  }>;
  actions?: Array<{
    id: string;
    type: "sale" | "quote";
    title: string;
    description: string;
    customerCode: string | null;
    value: number;
    status: string;
    notes: string | null;
    sellerName: string | null;
    createdAt: string;
  }>;
};

function money(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function number(value: unknown, digits = 2) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function dateBR(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function dateTimeBR(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function lastDayOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0, 12)).toISOString().slice(0, 10);
}

function resolvePeriod(
  mode: PeriodMode,
  values: { day: string; month: string; year: string; customFrom: string; customTo: string },
) {
  const today = new Date().toISOString().slice(0, 10);
  if (mode === "day") return { from: values.day, to: values.day };
  if (mode === "month") {
    const from = `${values.month}-01`;
    const fullEnd = lastDayOfMonth(values.month);
    return { from, to: values.month === today.slice(0, 7) ? today : fullEnd };
  }
  if (mode === "year") {
    const from = `${values.year}-01-01`;
    return { from, to: values.year === today.slice(0, 4) ? today : `${values.year}-12-31` };
  }
  return { from: values.customFrom, to: values.customTo };
}

async function loadStatistics(sellerId: string | null, mode: PeriodMode, from: string, to: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const params = new URLSearchParams({ view: "statistics", from, to, preset: mode });
  if (sellerId) params.set("sellerId", sellerId);

  const response = await fetch(`/api/admin/seller-margin-reports?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as StatisticsResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar as estatísticas.");
  return payload;
}

function Trend({ value, inverse = false }: { value: number | null | undefined; inverse?: boolean }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">sem base anterior disponível</span>;
  }

  const good = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
        good ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-600"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior
    </span>
  );
}

function MetricCard({
  label,
  value,
  trend,
  inverse,
  helper,
}: {
  label: string;
  value: string;
  trend?: number | null;
  inverse?: boolean;
  helper?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <div className="mt-3 min-h-6">
        {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : <Trend value={trend} inverse={inverse} />}
      </div>
    </div>
  );
}

function ReportField({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        accent
          ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-background"
          : "border-border/70 bg-background/80 hover:border-primary/20"
      }`}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className={`mt-2 break-words font-bold ${accent ? "text-xl" : "text-base"}`}>{value}</dd>
    </div>
  );
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    sent: "Enviado",
    accepted: "Aceito",
    declined: "Recusado",
    expired: "Expirado",
    pending: "Pendente",
    reviewed: "Revisado",
    completed: "Concluído",
  };
  return labels[value] ?? value;
}

function previousLabel(mode: PeriodMode) {
  return mode === "day"
    ? "Dia anterior"
    : mode === "month"
      ? "Mês anterior"
      : mode === "year"
        ? "Ano anterior"
        : "Período anterior";
}

function SectionTitle({
  icon: Icon,
  title,
  description,
  aside,
}: {
  icon: typeof BarChart3;
  title: string;
  description?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {aside}
    </div>
  );
}

export function SellerStatisticsDialog({ seller }: { seller?: Seller | null }) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PeriodMode>("month");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(today.slice(0, 4));
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(today);
  const [clientSearch, setClientSearch] = useState("");
  const period = resolvePeriod(mode, { day, month, year, customFrom, customTo });

  const query = useQuery({
    queryKey: ["admin-sales-statistics", seller?.id ?? "dukamp", mode, period.from, period.to],
    enabled: open && Boolean(period.from && period.to && period.from <= period.to),
    queryFn: () => loadStatistics(seller?.id ?? null, mode, period.from, period.to),
  });

  const filteredClients = useMemo(() => {
    const clients = query.data?.clients ?? [];
    const search = clientSearch.trim().toLocaleLowerCase("pt-BR");
    if (!search) return clients;
    return clients.filter((client) =>
      [client.name, client.code, client.city, client.uf, client.phone, client.email]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search),
    );
  }, [query.data?.clients, clientSearch]);

  const summary = query.data?.summary ?? {};
  const comparison = query.data?.comparison ?? {};
  const isDukamp = !seller;
  const currentYear = Number(period.to.slice(0, 4));
  const report = query.data?.marginReport;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isDukamp ? (
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" /> Estatísticas DuKamp
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-1.5 h-4 w-4" /> Estatísticas
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[94vh] w-[96vw] max-w-[1480px] overflow-y-auto border-border/60 bg-muted/20 p-0 shadow-2xl">
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/90">
          <DialogHeader className="pr-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                  {isDukamp ? "Estatísticas DuKamp" : `Estatísticas • ${seller.name}`}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {isDukamp
                    ? "Visão consolidada da operação comercial, margem, carteira e atividades."
                    : `Desempenho completo do vendedor${seller.erp_seller_code ? ` • COD VEND ${seller.erp_seller_code}` : ""}.`}
                </DialogDescription>
              </div>
              <div className="hidden items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground md:flex">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {dateBR(period.from)} a {dateBR(period.to)}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 pb-6 sm:px-6">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Período da análise</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Escolha como os dados devem ser comparados.</p>
              </div>
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/50 p-1">
                {(["month", "day", "year", "custom"] as PeriodMode[]).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={mode === item ? "bg-background text-primary shadow-sm hover:bg-background" : "text-muted-foreground"}
                    onClick={() => setMode(item)}
                  >
                    {item === "month" ? "Mês" : item === "day" ? "Dia" : item === "year" ? "Ano" : "Data específica"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:max-w-xl sm:grid-cols-2">
              {mode === "day" && <Input type="date" value={day} onChange={(event) => setDay(event.target.value)} />}
              {mode === "month" && <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />}
              {mode === "year" && <Input type="number" min={2025} max={2100} value={year} onChange={(event) => setYear(event.target.value)} />}
              {mode === "custom" && (
                <>
                  <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
                  <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
                </>
              )}
            </div>
          </div>

          {query.isPending ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Consolidando dados...
            </div>
          ) : query.isError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-700">
              {query.error instanceof Error ? query.error.message : "Não foi possível carregar as estatísticas."}
            </div>
          ) : query.data?.sellerCodeMissing ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <p className="font-semibold text-amber-700">Código do vendedor ainda não vinculado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Feche esta janela, clique no lápis deste vendedor e informe o campo <b>COD VEND (ERP)</b>.
              </p>
            </div>
          ) : query.data ? (
            <Tabs defaultValue="overview" className="space-y-5">
              <TabsList className="sticky top-[92px] z-20 grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-border/60 bg-background/95 p-1.5 shadow-sm backdrop-blur">
                <TabsTrigger value="overview" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Visão geral
                </TabsTrigger>
                <TabsTrigger value="margin" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Margem lucro
                </TabsTrigger>
                <TabsTrigger value="actions" className="rounded-xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Últimas ações
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Vendas" value={money(summary.total_venda)} trend={comparison.total_venda} />
                  <MetricCard label="Margem bruta" value={money(summary.margem_bruta)} trend={comparison.margem_bruta} />
                  <MetricCard label="Margem" value={`${number(summary.margem_percentual)}%`} trend={comparison.margem_percentual} />
                  <MetricCard label="Tonelagem" value={`${number(summary.tonelagem, 3)} t`} trend={comparison.tonelagem} />
                  <MetricCard label="Custo total" value={money(summary.total_custo)} trend={comparison.total_custo} inverse />
                  <MetricCard label="Devoluções" value={money(summary.devolucao)} trend={comparison.devolucao} inverse />
                  <MetricCard label="Sacarias" value={money(summary.sacarias)} trend={comparison.sacarias} />
                  <MetricCard label="Balcão" value={money(summary.balcao)} trend={comparison.balcao} />
                  <MetricCard label="Aditivos" value={money(summary.aditivos)} trend={comparison.aditivos} />
                  <MetricCard label="Comissão representante" value={money(summary.comissao_representante)} trend={comparison.comissao_representante} />
                  <MetricCard label="Orçamentos" value={number(summary.quotes, 0)} trend={comparison.quotes} />
                  <MetricCard label="Registros de venda" value={number(summary.sale_requests, 0)} trend={comparison.sale_requests} />
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  <SectionTitle
                    icon={BarChart3}
                    title={`Evolução de vendas • ${currentYear} × ${currentYear - 1}`}
                    description="Comparação mensal do ano atual com o histórico do ano anterior."
                    aside={
                      <div className="flex items-center gap-3 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium">
                        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600" />{currentYear}</span>
                        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-500" />{currentYear - 1}</span>
                      </div>
                    }
                  />
                  <div className="h-80 w-full px-2 pb-3 pt-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={query.data.annualSeries ?? []} barGap={-24} margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesCurrent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.72} />
                          </linearGradient>
                          <linearGradient id="salesPrevious" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.62} />
                            <stop offset="100%" stopColor="#f87171" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 6" vertical={false} opacity={0.35} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${Math.round(Number(value) / 1000)}k`} width={68} />
                        <Tooltip
                          cursor={{ fill: "rgba(148,163,184,.08)" }}
                          contentStyle={{ borderRadius: 14, border: "1px solid rgba(148,163,184,.25)", boxShadow: "0 12px 30px rgba(0,0,0,.12)" }}
                          formatter={(value, name) => [money(value), name]}
                          labelFormatter={(label) => String(label).toUpperCase()}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="previous_total_venda" name={`${currentYear - 1} • anterior`} fill="url(#salesPrevious)" radius={[9, 9, 3, 3]} barSize={30} />
                        <Bar dataKey="total_venda" name={`${currentYear} • atual`} fill="url(#salesCurrent)" radius={[9, 9, 3, 3]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  <SectionTitle
                    icon={CircleDollarSign}
                    title={`Atual × ${previousLabel(mode)}`}
                    description="Comparação direta do período escolhido com a base imediatamente anterior."
                  />
                  <div className="h-64 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={query.data.comparisonSeries ?? []} barGap={-34}>
                        <CartesianGrid strokeDasharray="4 6" vertical={false} opacity={0.3} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${Math.round(Number(value) / 1000)}k`} />
                        <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 14 }} />
                        <Bar dataKey="previous" name={previousLabel(mode)} fill="#ef4444" fillOpacity={0.48} radius={[10, 10, 3, 3]} barSize={42} />
                        <Bar dataKey="current" name="Atual" fill="#16a34a" fillOpacity={0.9} radius={[10, 10, 3, 3]} barSize={42} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {query.data.dataQuality?.partialWithoutBaseline && mode === "day" && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
                    Para alguns dias antigos não existe fechamento diário individual. O histórico mensal e anual existente continua sendo usado normalmente nas comparações.
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                    <SectionTitle icon={Trophy} title="Top 3 clientes" description="Maiores clientes da carteira no ano." />
                    <div className="space-y-2 p-4">
                      {(query.data.topCustomers ?? []).map((client, index) => (
                        <div
                          key={client.id}
                          className="group flex items-center gap-3 rounded-2xl border border-transparent bg-muted/30 p-3 transition-all hover:border-primary/15 hover:bg-primary/[0.035]"
                        >
                          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${index === 0 ? "bg-amber-500/15 text-amber-700" : index === 1 ? "bg-slate-400/15 text-slate-600" : "bg-orange-500/15 text-orange-700"}`}>
                            {index + 1}º
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{client.name}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {client.code} • {[client.city, client.uf].filter(Boolean).join("/") || "Sem local"}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {money(client.total)}
                          </span>
                        </div>
                      ))}
                      {!query.data.topCustomers?.length && <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de clientes.</p>}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:col-span-2">
                    <SectionTitle
                      icon={CalendarDays}
                      title="Próximos à Lista Azul"
                      description="Clientes que estão perto de completar o período sem compra."
                      aside={<span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{summary.near_blue_count ?? 0} cliente(s)</span>}
                    />
                    <div className="max-h-72 overflow-auto px-4 pb-4">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="sticky top-0 z-10 bg-card text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="py-3">Cliente</th>
                            <th>Local</th>
                            <th>Entrada</th>
                            <th className="text-right">Faltam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(query.data.nearBlueClients ?? []).map((client) => (
                            <tr key={client.id} className="border-t border-border/50 transition-colors hover:bg-muted/30">
                              <td className="py-3 pr-3 font-medium">{client.cliente}</td>
                              <td className="text-muted-foreground">{[client.cidade, client.uf].filter(Boolean).join("/") || "—"}</td>
                              <td className="text-muted-foreground">{dateBR(client.entersBlueAt)}</td>
                              <td className="text-right">
                                <span className={`inline-flex min-w-12 justify-center rounded-full px-2 py-1 text-xs font-bold ${client.daysRemaining <= 3 ? "bg-red-500/10 text-red-600" : client.daysRemaining <= 7 ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary"}`}>
                                  {client.daysRemaining}d
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!query.data.nearBlueClients?.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente entra na Lista Azul nos próximos 30 dias.</p>}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
                      <div>
                        <h3 className="font-semibold">Lista de clientes</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">{summary.portfolio_count ?? 0} cliente(s) na carteira atual.</p>
                      </div>
                    </div>
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-10 rounded-xl bg-muted/30 pl-9" placeholder="Buscar cliente..." value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} />
                    </div>
                  </div>
                  <div className="max-h-96 overflow-auto px-4 pb-4">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="sticky top-0 z-10 bg-card text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="py-3">Código</th>
                          <th>Cliente</th>
                          <th>Cidade</th>
                          <th>Última compra</th>
                          <th className="text-right">Compra no ano</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClients.map((client) => (
                          <tr key={client.id} className="border-t border-border/50 transition-colors hover:bg-muted/30">
                            <td className="py-3 pr-3"><span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{client.code}</span></td>
                            <td className="font-medium">{client.name}</td>
                            <td className="text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[client.city, client.uf].filter(Boolean).join("/") || "—"}</span>
                            </td>
                            <td className="text-muted-foreground">{dateBR(client.lastPurchase)}</td>
                            <td className="text-right font-semibold">{money(client.annualPurchase)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="margin" className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-emerald-500/10 via-background to-background px-5 py-5">
                    <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Análise comercial</p>
                          <h3 className="mt-1 text-lg font-bold">Relatório Margem Venda</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">Indicadores financeiros e composição da venda do período selecionado.</p>
                        </div>
                      </div>
                      {report && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold">COD {String(report.report_seller_code ?? "—")}</span>
                          <span className="rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold">{String(report.report_seller_name ?? "—")}</span>
                          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                            {dateBR(String(report.period_start))} → {dateBR(String(report.period_end))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {report ? (
                    <div className="space-y-6 p-5">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <ReportField label="Total de vendas" value={money(report.total_venda)} accent />
                        <ReportField label="Margem bruta" value={money(report.margem_bruta)} accent />
                        <ReportField label="Margem" value={`${number(report.margem_percentual)}%`} accent />
                        <ReportField label="Tonelagem" value={`${number(report.tonelagem, 3)} t`} accent />
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <div className="mb-4 flex items-center gap-2">
                          <WalletCards className="h-4 w-4 text-primary" />
                          <div><h4 className="text-sm font-semibold">Resultado comercial</h4><p className="text-xs text-muted-foreground">Venda, custo, devolução e comissão.</p></div>
                        </div>
                        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <ReportField label="TOT_VENDA" value={money(report.total_venda)} />
                          <ReportField label="TT_CUSTO" value={money(report.total_custo)} />
                          <ReportField label="DEVOLUCAO" value={money(report.devolucao)} />
                          <ReportField label="CMS_REP" value={money(report.comissao_representante)} />
                        </dl>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <div className="mb-4 flex items-center gap-2">
                          <PackageOpen className="h-4 w-4 text-primary" />
                          <div><h4 className="text-sm font-semibold">Composição das vendas</h4><p className="text-xs text-muted-foreground">Distribuição entre aditivos, sacarias e balcão.</p></div>
                        </div>
                        <dl className="grid gap-3 sm:grid-cols-3">
                          <ReportField label="ADITIVOS" value={money(report.aditivos)} />
                          <ReportField label="SACARIAS" value={money(report.sacarias)} />
                          <ReportField label="BALCAO" value={money(report.balcao)} />
                        </dl>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <div className="mb-4 flex items-center gap-2">
                          <Percent className="h-4 w-4 text-primary" />
                          <div><h4 className="text-sm font-semibold">Margem por canal</h4><p className="text-xs text-muted-foreground">Margem absoluta e percentual de cada grupo.</p></div>
                        </div>
                        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <ReportField label="MR_ADITI" value={money(report.margem_aditivos)} />
                          <ReportField label="% MRG ADITIVOS" value={`${number(report.margem_aditivos_percentual)}%`} />
                          <ReportField label="MR_SACAR" value={money(report.margem_sacarias)} />
                          <ReportField label="% MRG SACARIAS" value={`${number(report.margem_sacarias_percentual)}%`} />
                          <ReportField label="MR_BALCA" value={money(report.margem_balcao)} />
                          <ReportField label="% MRG BALCAO" value={`${number(report.margem_balcao_percentual)}%`} />
                        </dl>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                        <span>Fonte: <b className="font-medium text-foreground">{String(report.source_file ?? "—")}</b></span>
                        <span>COD {String(report.report_seller_code ?? "—")} • {String(report.report_seller_name ?? "—")}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 p-5">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <ReportField label="Total de vendas" value={money(summary.total_venda)} accent />
                        <ReportField label="Margem bruta" value={money(summary.margem_bruta)} accent />
                        <ReportField label="Margem" value={`${number(summary.margem_percentual)}%`} accent />
                        <ReportField label="Tonelagem" value={`${number(summary.tonelagem, 3)} t`} accent />
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <ReportField label="DEVOLUCAO" value={money(summary.devolucao)} />
                          <ReportField label="ADITIVOS" value={money(summary.aditivos)} />
                          <ReportField label="SACARIAS" value={money(summary.sacarias)} />
                          <ReportField label="BALCAO" value={money(summary.balcao)} />
                          <ReportField label="TT_CUSTO" value={money(summary.total_custo)} />
                          <ReportField label="CMS_REP" value={money(summary.comissao_representante)} />
                          <ReportField label="MR_ADITI" value={money(summary.margem_aditivos)} />
                          <ReportField label="MR_SACAR" value={money(summary.margem_sacarias)} />
                          <ReportField label="MR_BALCA" value={money(summary.margem_balcao)} />
                        </dl>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label="Orçamentos" value={number(summary.quotes, 0)} trend={comparison.quotes} />
                  <MetricCard label="Valor orçado" value={money(summary.quote_value)} trend={comparison.quote_value} />
                  <MetricCard label="Registros de venda" value={number(summary.sale_requests, 0)} trend={comparison.sale_requests} />
                  <MetricCard label="Valor registrado" value={money(summary.sale_value)} trend={comparison.sale_value} />
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  <SectionTitle icon={ShoppingCart} title="Todas as ações no período" description="Orçamentos e registros de venda em ordem cronológica." />
                  <div className="max-h-[54vh] divide-y divide-border/50 overflow-auto">
                    {(query.data.actions ?? []).map((action) => (
                      <div key={action.id} className="group flex gap-3 p-4 transition-colors hover:bg-muted/30">
                        <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          {action.type === "quote" ? <FileSpreadsheet className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{action.title} • {action.description}</p>
                            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{dateTimeBR(action.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {isDukamp && action.sellerName ? `${action.sellerName} • ` : ""}
                            {statusLabel(action.status)}
                            {action.value > 0 ? ` • ${money(action.value)}` : ""}
                          </p>
                          {action.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.notes}</p>}
                        </div>
                      </div>
                    ))}
                    {!query.data.actions?.length && <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma ação encontrada neste período.</p>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
