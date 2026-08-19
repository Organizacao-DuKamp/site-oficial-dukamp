import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, Loader2, ShoppingCart, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type NearBlueClient = {
  id: string;
  codigo: string | null;
  cliente: string | null;
  cidade: string | null;
  uf: string | null;
  ultima_compra: string;
  entersBlueAt: string;
  daysRemaining: number;
};

type SellerDashboardResponse = {
  sellerCodeMissing?: boolean;
  seller?: { id: string; name: string; code: string | null };
  portfolioCount?: number;
  nearBlueClients?: NearBlueClient[];
  nearBlueCount?: number;
  topCustomers?: Array<{ name: string; total: number; demo?: boolean }>;
  sales?: { year: number; month: number; total: number; count: number };
  error?: string;
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const Route = createFileRoute("/vendedor/")({
  head: () => ({ meta: [{ title: "Painel do Vendedor — Dukamp" }] }),
  component: SellerHome,
});

async function loadDashboard(year: number, month: number): Promise<SellerDashboardResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const params = new URLSearchParams({
    source: "dashboard",
    year: String(year),
    month: String(month),
  });
  const response = await fetch(`/api/seller/clients?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as SellerDashboardResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o painel.");
  return payload;
}

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBR(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function SellerHome() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const years = Array.from({ length: 6 }, (_, index) => today.getFullYear() - index);

  const query = useQuery({
    queryKey: ["seller-dashboard", user?.id, year, month],
    enabled: Boolean(user?.id),
    queryFn: () => loadDashboard(year, month),
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel do Vendedor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe sua carteira, clientes em atenção e vendas do período.
          </p>
        </div>
        {query.data?.seller?.code && (
          <Badge variant="secondary" className="w-fit">
            Código do vendedor: {query.data.seller.code}
          </Badge>
        )}
      </div>

      {query.isPending ? (
        <div className="flex min-h-60 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando painel...
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o painel</AlertTitle>
          <AlertDescription>
            {query.error instanceof Error ? query.error.message : "Tente novamente."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {query.data?.sellerCodeMissing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Código do vendedor ainda não configurado</AlertTitle>
              <AlertDescription>
                Um administrador precisa registrar seu código em Administrativo &gt; Contas. Assim sua carteira de clientes será sincronizada automaticamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Clientes na carteira</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <Users className="h-6 w-6 text-primary" />
                  {(query.data?.portfolioCount ?? 0).toLocaleString("pt-BR")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Sincronizados pelo código do vendedor.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Próximos da Lista Azul</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <CalendarClock className="h-6 w-6 text-amber-600" />
                  {(query.data?.nearBlueCount ?? 0).toLocaleString("pt-BR")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Clientes que completarão 6 meses sem comprar nos próximos 30 dias.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Vendas no período</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <ShoppingCart className="h-6 w-6 text-emerald-600" />
                  {money(query.data?.sales?.total)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {(query.data?.sales?.count ?? 0).toLocaleString("pt-BR")} venda(s) online aprovada(s).
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarClock className="h-5 w-5 text-amber-600" /> Clientes perto do prazo de 6 meses
                </CardTitle>
                <CardDescription>
                  Antecipe o contato antes que esses clientes entrem na Lista Azul.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(query.data?.nearBlueClients ?? []).length === 0 ? (
                  <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                    Nenhum cliente da sua carteira está a até 30 dias do prazo de 6 meses.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(query.data?.nearBlueClients ?? []).map((client) => (
                      <div key={client.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">{client.cliente || "Cliente sem nome"}</p>
                            {client.codigo && <Badge variant="outline">#{client.codigo}</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[client.cidade, client.uf].filter(Boolean).join("/") || "Cidade não informada"} • Última compra: {dateBR(client.ultima_compra)}
                          </p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            {client.daysRemaining} {client.daysRemaining === 1 ? "dia" : "dias"}
                          </p>
                          <p className="text-xs text-muted-foreground">Entra em {dateBR(client.entersBlueAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-amber-500" /> Top 3 do ano
                  </CardTitle>
                  <Badge variant="outline">Demonstrativo</Badge>
                </div>
                <CardDescription>
                  Dados fictícios temporários; serão conectados ao histórico real depois.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(query.data?.topCustomers ?? []).map((customer, index) => (
                  <div key={`${customer.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">#{index + 1}</p>
                      <p className="truncate text-sm font-medium">{customer.name}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold">{money(customer.total)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendas por mês</CardTitle>
              <CardDescription>
                Selecione mês e ano para consultar as vendas online aprovadas identificadas como clientes da sua carteira.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 md:grid-cols-[180px_180px_1fr] md:items-end">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Ano</span>
                  <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Mês</span>
                  <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((label, index) => <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border bg-muted/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {MONTHS[month - 1]} de {year}
                  </p>
                  <p className="mt-1 text-3xl font-bold">{money(query.data?.sales?.total)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(query.data?.sales?.count ?? 0).toLocaleString("pt-BR")} venda(s) aprovada(s) encontradas no site.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
