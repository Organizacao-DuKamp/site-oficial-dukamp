import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { SellerClientList, type SellerClient } from "@/components/sellers/SellerClientList";
import { SellerCustomerDetailDialog } from "@/components/sellers/SellerCustomerDetailDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAGE_SIZE = 10;
type SellerClientsResponse = { associationMissing?: boolean; sellerCodeMissing?: boolean; seller?: { id: string; name: string; code?: string | null }; clients?: SellerClient[]; count?: number; error?: string };

export const Route = createFileRoute("/vendedor/clientes")({ head: () => ({ meta: [{ title: "Clientes — Painel do Vendedor" }] }), component: SellerClientsPage });

async function token() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sessão expirada. Entre novamente.");
  return accessToken;
}
async function loadSellerClients(search: string, page: number): Promise<SellerClientsResponse> {
  const accessToken = await token();
  const params = new URLSearchParams({ source: "portfolio", search, page: String(page), pageSize: String(PAGE_SIZE) });
  const response = await fetch(`/api/seller/clients?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as SellerClientsResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar os clientes.");
  return payload;
}
async function submitSale(customerCode: string, saleNotes: string, saleValue: string) {
  const accessToken = await token();
  const response = await fetch("/api/seller/clients", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "submitSale", customerCode, saleNotes, saleValue }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível enviar a solicitação.");
  return payload;
}

function RegisterSaleArea() {
  const [customerCode, setCustomerCode] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const mutation = useMutation({ mutationFn: () => submitSale(customerCode.trim(), saleNotes.trim(), saleValue), onSuccess: (payload: any) => { toast.success(`Solicitação enviada para ${payload.customer?.name || "o cliente"}`); setCustomerCode(""); setSaleNotes(""); setSaleValue(""); }, onError: (error: Error) => toast.error(error.message) });
  return <div className="max-w-2xl space-y-6"><div><h1 className="text-2xl font-bold">Registrar venda</h1><p className="mt-1 text-sm text-muted-foreground">Envie a venda para conferência e atualização manual pelo administrativo.</p></div><Card><CardHeader><CardTitle>Nova solicitação de venda</CardTitle><CardDescription>O código precisa pertencer à sua carteira de clientes.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="sale-customer-code">Código do cliente</Label><Input id="sale-customer-code" value={customerCode} onChange={e => setCustomerCode(e.target.value)} placeholder="Ex.: 093130" maxLength={50} /></div><div className="space-y-2"><Label htmlFor="sale-notes">Observação da venda / produtos</Label><Textarea id="sale-notes" className="min-h-32" value={saleNotes} onChange={e => setSaleNotes(e.target.value)} placeholder="Informe os produtos vendidos, quantidades ou outras observações importantes." maxLength={4000} /></div><div className="space-y-2"><Label htmlFor="sale-value">Valor da venda</Label><Input id="sale-value" inputMode="decimal" value={saleValue} onChange={e => setSaleValue(e.target.value)} placeholder="Ex.: 1250,90" /></div><Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !customerCode.trim() || !saleNotes.trim() || !saleValue.trim()}><Send className="h-4 w-4" /> {mutation.isPending ? "Enviando..." : "Enviar solicitação"}</Button></CardContent></Card></div>;
}

function SellerClientsPage() {
  const { user } = useAuth();
  const [registerMode, setRegisterMode] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  useEffect(() => { const sync = () => setRegisterMode(new URLSearchParams(window.location.search).get("registrarVenda") === "1"); sync(); window.addEventListener("popstate", sync); return () => window.removeEventListener("popstate", sync); }, []);
  useEffect(() => { const timeout = window.setTimeout(() => setDebouncedSearch(search), 300); return () => window.clearTimeout(timeout); }, [search]);
  useEffect(() => setPage(1), [debouncedSearch]);
  const query = useQuery({ queryKey: ["seller-portfolio-clients", user?.id, debouncedSearch, page], enabled: Boolean(user?.id) && !registerMode, queryFn: () => loadSellerClients(debouncedSearch, page) });
  const count = query.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  if (registerMode) return <RegisterSaleArea />;

  return <div className="max-w-5xl space-y-6"><div><h1 className="text-2xl font-bold">Clientes</h1><p className="mt-1 text-sm text-muted-foreground">{query.data?.seller?.code ? `Carteira sincronizada pelo código de vendedor ${query.data.seller.code}.` : "Sua carteira de clientes é sincronizada pelo código de vendedor cadastrado pelo administrador."}</p></div>{query.isPending ? <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando clientes...</div> : query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível consultar os clientes</AlertTitle><AlertDescription>{query.error instanceof Error ? query.error.message : "Tente novamente."}</AlertDescription></Alert> : query.data?.sellerCodeMissing ? <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Código do vendedor não configurado</AlertTitle><AlertDescription>Peça ao Administrador Mestre para cadastrar o código de vendedor correspondente ao ERP.</AlertDescription></Alert> : <><div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">{count.toLocaleString("pt-BR")} clientes vinculados ao código {query.data?.seller?.code || "—"}.</div><SellerClientList clients={query.data?.clients ?? []} search={search} onSearchChange={setSearch} page={page} pageCount={pageCount} onPageChange={setPage} showActions={false} onViewDetails={client => setSelectedClientId(client.id)} /></>}
  <SellerCustomerDetailDialog customerId={selectedClientId} scope="portfolio" open={Boolean(selectedClientId)} onOpenChange={open => { if (!open) setSelectedClientId(null); }} onUpdated={() => void query.refetch()} /></div>;
}
