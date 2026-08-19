import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, Clock3, Eye, Loader2, MapPin, Phone, Search, Users } from "lucide-react";
import { SellerCustomerDetailDialog } from "@/components/sellers/SellerCustomerDetailDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 25;
type BlueCustomer = { id: string; codigo: string | null; cliente: string | null; cidade: string | null; uf: string | null; telefone: string | null; celular: string | null; email: string | null; ultima_compra: string | null; valor_ultima_compra: number | null; compra_ano: number | null; valor_maior_compra: number | null };
type ResponseData = { cutoffDate?: string; clients?: BlueCustomer[]; count?: number; error?: string };

export const Route = createFileRoute("/vendedor/area-azul")({ head: () => ({ meta: [{ title: "Lista Azul — Painel do Vendedor" }] }), component: BlueAreaPage });

async function loadBlueArea(search: string, page: number): Promise<ResponseData> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const params = new URLSearchParams({ search, page: String(page), pageSize: String(PAGE_SIZE) });
  const response = await fetch(`/api/seller/area-azul?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar a Lista Azul.");
  return payload;
}
const dateBR = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Sem compra registrada";
const money = (value?: number | null) => value == null ? "—" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function inactive(value?: string | null) {
  if (!value) return "Sem compra registrada";
  const last = new Date(`${value.slice(0, 10)}T12:00:00`), now = new Date();
  let months = (now.getFullYear() - last.getFullYear()) * 12 + now.getMonth() - last.getMonth();
  if (now.getDate() < last.getDate()) months -= 1;
  return `${Math.max(0, months)} ${months === 1 ? "mês" : "meses"}`;
}

function BlueAreaPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => setPage(1), [debounced]);
  const query = useQuery({ queryKey: ["seller-blue-area", debounced, page], enabled: Boolean(user?.id), queryFn: () => loadBlueArea(debounced, page) });
  const count = query.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return <div className="max-w-6xl space-y-6">
    <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="flex items-start gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><Clock3 className="h-5 w-5" /></div><div><h1 className="text-2xl font-bold">Lista Azul</h1><p className="mt-1 text-sm text-muted-foreground">Clientes há mais de 6 meses sem comprar, disponíveis para toda a equipe de vendas.</p><p className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300"><Users className="h-3.5 w-3.5" /> Todos os vendedores podem consultar a ficha e atualizar somente os campos permitidos.</p></div></div>
    </div>
    {query.isPending ? <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando...</div> : query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Erro ao consultar a Lista Azul</AlertTitle><AlertDescription>{query.error instanceof Error ? query.error.message : "Tente novamente."}</AlertDescription></Alert> : <>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-muted-foreground">{count.toLocaleString("pt-BR")} clientes • corte: {dateBR(query.data?.cutoffDate)}</span><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, código, cidade ou contato..." /></div></div>
      <div className="space-y-3">{(query.data?.clients ?? []).map(customer => <Card key={customer.id}><CardContent className="grid gap-4 p-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:items-center">
        <div><div className="flex flex-wrap items-center gap-2"><strong>{customer.cliente || "Cliente sem nome"}</strong>{customer.codigo && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">#{customer.codigo}</span>}</div><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {[customer.cidade, customer.uf].filter(Boolean).join("/") || "Cidade não informada"}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {customer.celular || customer.telefone || customer.email || "Sem contato"}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => setSelectedId(customer.id)}><Eye className="h-4 w-4" /> Ver ficha completa</Button></div>
        <div><span className="text-xs text-muted-foreground">Última compra</span><p className="mt-1 flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="h-4 w-4" /> {dateBR(customer.ultima_compra)}</p><p className="text-xs text-muted-foreground">{money(customer.valor_ultima_compra)}</p></div>
        <div><span className="text-xs text-muted-foreground">Tempo sem comprar</span><p className="mt-1 font-semibold">{inactive(customer.ultima_compra)}</p></div>
        <div><span className="text-xs text-muted-foreground">Compra no ano</span><p className="mt-1 font-medium">{money(customer.compra_ano)}</p><p className="text-xs text-muted-foreground">Maior: {money(customer.valor_maior_compra)}</p></div>
      </CardContent></Card>)}</div>
      {pageCount > 1 && <div className="flex items-center justify-between rounded-xl border bg-card p-3"><span className="text-sm text-muted-foreground">Página {page} de {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(v => v + 1)}>Próxima</Button></div></div>}
    </>}
    <SellerCustomerDetailDialog customerId={selectedId} scope="blue" open={Boolean(selectedId)} onOpenChange={open => { if (!open) setSelectedId(null); }} onUpdated={() => void query.refetch()} />
  </div>;
}
