import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, Clock3, Loader2, MapPin, Phone, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 25;

type BlueAreaCustomer = {
  codigo: string | null;
  cliente: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  ultima_compra: string | null;
  valor_ultima_compra: number | null;
  compra_ano: number | null;
  valor_maior_compra: number | null;
};

type BlueAreaResponse = {
  associationMissing?: boolean;
  seller?: {
    id: string;
    name: string;
    erpSellerCode: string;
    erpSellerName: string;
  };
  cutoffDate?: string;
  clients?: BlueAreaCustomer[];
  count?: number;
  page?: number;
  pageSize?: number;
  error?: string;
};

export const Route = createFileRoute("/vendedor/area-azul")({
  head: () => ({ meta: [{ title: "Área Azul — Painel do Vendedor" }] }),
  component: BlueAreaPage,
});

async function loadBlueArea(search: string, page: number): Promise<BlueAreaResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const params = new URLSearchParams({
    search,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  const response = await fetch(`/api/seller/area-azul?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as BlueAreaResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar a Área Azul.");
  return payload;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem compra registrada";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function inactiveTime(value: string | null | undefined) {
  if (!value) return "Nunca comprou / sem registro";
  const last = new Date(`${value.slice(0, 10)}T12:00:00`);
  const today = new Date();
  let months = (today.getFullYear() - last.getFullYear()) * 12 + today.getMonth() - last.getMonth();
  if (today.getDate() < last.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths
    ? `${years} ${years === 1 ? "ano" : "anos"} e ${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`
    : `${years} ${years === 1 ? "ano" : "anos"}`;
}

function BlueAreaPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch]);

  const query = useQuery({
    queryKey: ["seller-blue-area", user?.id, debouncedSearch, page],
    enabled: Boolean(user?.id),
    queryFn: () => loadBlueArea(debouncedSearch, page),
  });

  const count = query.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-950 dark:text-blue-100">Área Azul</h1>
              <p className="mt-1 text-sm text-blue-800/80 dark:text-blue-200/80">
                Clientes da sua carteira que estão há mais de 6 meses sem comprar.
              </p>
            </div>
          </div>
          {!query.isPending && !query.isError && !query.data?.associationMissing && (
            <div className="rounded-xl bg-white/80 px-4 py-3 text-center shadow-sm dark:bg-background/70">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{count.toLocaleString("pt-BR")}</div>
              <div className="text-xs text-muted-foreground">clientes na Área Azul</div>
            </div>
          )}
        </div>
      </div>

      {query.isPending ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando Área Azul...
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível consultar a Área Azul</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{query.error instanceof Error ? query.error.message : "Tente novamente."}</span>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : query.data?.associationMissing ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Carteira comercial ainda não vinculada</AlertTitle>
          <AlertDescription>
            Um administrador precisa abrir esta conta no painel administrativo e selecionar o campo “Vendedor do ERP”.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="font-medium">
                {query.data?.seller?.erpSellerCode} - {query.data?.seller?.erpSellerName}
              </span>
              {query.data?.cutoffDate && (
                <span className="ml-2 text-muted-foreground">
                  • última compra anterior a {formatDate(query.data.cutoffDate)}
                </span>
              )}
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Buscar cliente, código, cidade ou contato..."
              />
            </div>
          </div>

          {(query.data?.clients ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {debouncedSearch
                  ? "Nenhum cliente da Área Azul corresponde à pesquisa."
                  : "Nenhum cliente está há mais de 6 meses sem comprar."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(query.data?.clients ?? []).map((customer) => {
                const contact = customer.celular || customer.telefone || customer.email;
                return (
                  <Card key={customer.codigo ?? customer.cliente} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-semibold">{customer.cliente || "Cliente sem nome"}</h2>
                            {customer.codigo && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                #{customer.codigo}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {[customer.cidade, customer.uf].filter(Boolean).join("/") || "Cidade não informada"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {contact || "Sem contato"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Última compra</div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                            <CalendarDays className="h-4 w-4 text-blue-600" /> {formatDate(customer.ultima_compra)}
                          </div>
                          {customer.ultima_compra && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {formatCurrency(customer.valor_ultima_compra)}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tempo sem comprar</div>
                          <div className="mt-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
                            {inactiveTime(customer.ultima_compra)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Compra no ano</div>
                          <div className="mt-1 text-sm font-medium">{formatCurrency(customer.compra_ano)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Maior compra: {formatCurrency(customer.valor_maior_compra)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
              <div className="text-sm text-muted-foreground">
                Página {page} de {pageCount} • {count.toLocaleString("pt-BR")} clientes
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
