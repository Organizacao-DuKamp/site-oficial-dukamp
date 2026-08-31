import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { SellerCustomerDetailDialog } from "@/components/sellers/SellerCustomerDetailDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 25;
type BlueSort =
  | "oldest_last_purchase"
  | "newest_last_purchase"
  | "highest_largest_purchase"
  | "lowest_largest_purchase"
  | "highest_year_purchase"
  | "oldest_registration"
  | "newest_registration"
  | "newest_blue_entry"
  | "name_asc";
type BlueFilters = {
  sort: BlueSort;
  seller: string;
  lastPurchaseFrom: string;
  lastPurchaseTo: string;
  largestPurchaseMin: string;
  largestPurchaseMax: string;
  enteredWithinDays: string;
};
type SellerOption = { code: string; name: string };
type BlueCustomer = {
  id: string;
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
  data_cadastro: string | null;
  vendedor_codigo: string | null;
  vendedor_nome: string | null;
  entersBlueAt?: string | null;
};
type ResponseData = {
  cutoffDate?: string;
  clients?: BlueCustomer[];
  count?: number;
  sellers?: SellerOption[];
  error?: string;
};

const DEFAULT_FILTERS: BlueFilters = {
  sort: "oldest_last_purchase",
  seller: "",
  lastPurchaseFrom: "",
  lastPurchaseTo: "",
  largestPurchaseMin: "",
  largestPurchaseMax: "",
  enteredWithinDays: "",
};
const SORT_OPTIONS: Array<{ value: BlueSort; label: string }> = [
  { value: "oldest_last_purchase", label: "Última compra mais antiga" },
  { value: "newest_last_purchase", label: "Última compra mais recente" },
  { value: "highest_largest_purchase", label: "Maior valor de compra" },
  { value: "lowest_largest_purchase", label: "Menor valor de compra" },
  { value: "highest_year_purchase", label: "Maior compra no ano" },
  { value: "oldest_registration", label: "Cadastro mais antigo" },
  { value: "newest_registration", label: "Cadastro mais novo" },
  { value: "newest_blue_entry", label: "Entrada mais recente na Lista Azul" },
  { value: "name_asc", label: "Nome (A-Z)" },
];

export const Route = createFileRoute("/vendedor/area-azul")({
  head: () => ({ meta: [{ title: "Lista Azul — Painel do Vendedor" }] }),
  component: BlueAreaPage,
});

async function loadBlueArea(
  search: string,
  page: number,
  filters: BlueFilters,
): Promise<ResponseData> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const params = new URLSearchParams({
    search,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort: filters.sort,
  });
  if (filters.seller) params.set("seller", filters.seller);
  if (filters.lastPurchaseFrom) params.set("lastPurchaseFrom", filters.lastPurchaseFrom);
  if (filters.lastPurchaseTo) params.set("lastPurchaseTo", filters.lastPurchaseTo);
  if (filters.largestPurchaseMin) params.set("largestPurchaseMin", filters.largestPurchaseMin);
  if (filters.largestPurchaseMax) params.set("largestPurchaseMax", filters.largestPurchaseMax);
  if (filters.enteredWithinDays) params.set("enteredWithinDays", filters.enteredWithinDays);
  const response = await fetch(`/api/seller/area-azul?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar a Lista Azul.");
  return payload;
}

const dateBR = (value?: string | null) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
    : "Sem compra registrada";
const money = (value?: number | null) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function blueEntryDate(lastPurchase?: string | null) {
  if (!lastPurchase) return null;
  const date = new Date(`${lastPurchase.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}
function inactive(value?: string | null) {
  if (!value) return "Sem compra registrada";
  const last = new Date(`${value.slice(0, 10)}T12:00:00`),
    now = new Date();
  let months = (now.getFullYear() - last.getFullYear()) * 12 + now.getMonth() - last.getMonth();
  if (now.getDate() < last.getDate()) months -= 1;
  return `${Math.max(0, months)} ${months === 1 ? "mês" : "meses"}`;
}

function BlueAreaPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState<BlueFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(
    () => setPage(1),
    [
      debounced,
      filters.sort,
      filters.seller,
      filters.lastPurchaseFrom,
      filters.lastPurchaseTo,
      filters.largestPurchaseMin,
      filters.largestPurchaseMax,
      filters.enteredWithinDays,
    ],
  );

  const query = useQuery({
    queryKey: [
      "seller-blue-area",
      debounced,
      page,
      filters.sort,
      filters.seller,
      filters.lastPurchaseFrom,
      filters.lastPurchaseTo,
      filters.largestPurchaseMin,
      filters.largestPurchaseMax,
      filters.enteredWithinDays,
    ],
    enabled: Boolean(user?.id),
    queryFn: () => loadBlueArea(debounced, page, filters),
  });
  const count = query.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const clients = query.data?.clients ?? [];
  const activeFilterCount =
    [
      filters.seller,
      filters.lastPurchaseFrom,
      filters.lastPurchaseTo,
      filters.largestPurchaseMin,
      filters.largestPurchaseMax,
      filters.enteredWithinDays,
    ].filter(Boolean).length + (filters.sort !== DEFAULT_FILTERS.sort ? 1 : 0);
  const updateFilter = <Key extends keyof BlueFilters>(key: Key, value: BlueFilters[Key]) =>
    setFilters((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lista Azul</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Clientes há mais de 6 meses sem comprar, disponíveis para toda a equipe de vendas.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
              <Users className="h-3.5 w-3.5" /> Todos os vendedores podem consultar a ficha e
              atualizar somente os campos permitidos.
            </p>
          </div>
        </div>
      </div>
      {query.isPending ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao consultar a Lista Azul</AlertTitle>
          <AlertDescription>
            {query.error instanceof Error ? query.error.message : "Tente novamente."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {count.toLocaleString("pt-BR")} clientes • corte:{" "}
                      {dateBR(query.data?.cutoffDate)}
                    </span>
                    {query.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use a busca e os filtros abaixo para encontrar os melhores clientes para
                    prospecção.
                  </p>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente, código, cidade ou contato..."
                    aria-label="Buscar na Lista Azul"
                  />
                </div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <SlidersHorizontal className="h-4 w-4 text-blue-600" /> Filtros da Lista Azul
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Combine data, valor, entrada na lista e vendedor.
                    </p>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros ({activeFilterCount})
                    </Button>
                  )}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="blue-sort">Ordenar por</Label>
                    <Select
                      value={filters.sort}
                      onValueChange={(value) => updateFilter("sort", value as BlueSort)}
                    >
                      <SelectTrigger id="blue-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blue-seller">Vendedor</Label>
                    <Select
                      value={filters.seller || "__all__"}
                      onValueChange={(value) =>
                        updateFilter("seller", value === "__all__" ? "" : value)
                      }
                    >
                      <SelectTrigger id="blue-seller">
                        <SelectValue placeholder="Todos os vendedores" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__all__">Todos os vendedores</SelectItem>
                        {(query.data?.sellers ?? []).map((seller) => (
                          <SelectItem key={seller.code} value={seller.code}>
                            {seller.name} ({seller.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blue-entry-window">Entrada na Lista Azul</Label>
                    <Select
                      value={filters.enteredWithinDays || "__all__"}
                      onValueChange={(value) =>
                        updateFilter("enteredWithinDays", value === "__all__" ? "" : value)
                      }
                    >
                      <SelectTrigger id="blue-entry-window">
                        <SelectValue placeholder="Qualquer data" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Qualquer data</SelectItem>
                        <SelectItem value="7">Entraram nos últimos 7 dias</SelectItem>
                        <SelectItem value="30">Entraram nos últimos 30 dias</SelectItem>
                        <SelectItem value="90">Entraram nos últimos 90 dias</SelectItem>
                        <SelectItem value="180">Entraram nos últimos 6 meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blue-last-from">Última compra desde</Label>
                    <Input
                      id="blue-last-from"
                      type="date"
                      value={filters.lastPurchaseFrom}
                      onChange={(e) => updateFilter("lastPurchaseFrom", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blue-last-to">Última compra até</Label>
                    <Input
                      id="blue-last-to"
                      type="date"
                      value={filters.lastPurchaseTo}
                      onChange={(e) => updateFilter("lastPurchaseTo", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blue-largest-min">Maior compra a partir de</Label>
                    <Input
                      id="blue-largest-min"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={filters.largestPurchaseMin}
                      onChange={(e) => updateFilter("largestPurchaseMin", e.target.value)}
                      placeholder="R$ mínimo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blue-largest-max">Maior compra até</Label>
                    <Input
                      id="blue-largest-max"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={filters.largestPurchaseMax}
                      onChange={(e) => updateFilter("largestPurchaseMax", e.target.value)}
                      placeholder="R$ máximo"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {clients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <SlidersHorizontal className="h-9 w-9 text-muted-foreground" />
                <p className="font-medium">Nenhum cliente encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Ajuste a busca ou remova algum filtro para ampliar os resultados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {clients.map((customer) => {
                const entryDate = customer.entersBlueAt ?? blueEntryDate(customer.ultima_compra);
                return (
                  <Card key={customer.id}>
                    <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{customer.cliente || "Cliente sem nome"}</strong>
                          {customer.codigo && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              #{customer.codigo}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />{" "}
                          {[customer.cidade, customer.uf].filter(Boolean).join("/") ||
                            "Cidade não informada"}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />{" "}
                          {customer.celular || customer.telefone || customer.email || "Sem contato"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Vendedor:{" "}
                          {customer.vendedor_nome || customer.vendedor_codigo || "Não informado"}
                        </p>
                        <Button
                          className="mt-3"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedId(customer.id)}
                        >
                          <Eye className="h-4 w-4" /> Ver ficha completa
                        </Button>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Última compra</span>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                          <CalendarDays className="h-4 w-4" /> {dateBR(customer.ultima_compra)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {money(customer.valor_ultima_compra)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Tempo sem comprar</span>
                        <p className="mt-1 font-semibold">{inactive(customer.ultima_compra)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Entrou na Lista Azul: {entryDate ? dateBR(entryDate) : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Compra no ano</span>
                        <p className="mt-1 font-medium">{money(customer.compra_ano)}</p>
                        <p className="text-xs text-muted-foreground">
                          Maior: {money(customer.valor_maior_compra)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {pageCount > 1 && (
            <div className="flex items-center justify-between rounded-xl border bg-card p-3">
              <span className="text-sm text-muted-foreground">
                Página {page} de {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <SellerCustomerDetailDialog
        customerId={selectedId}
        scope="blue"
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onUpdated={() => void query.refetch()}
      />
    </div>
  );
}
