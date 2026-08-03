import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money, quoteById, rpc } from "@/lib/seller-quotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/vendedor/orcamentos/$quoteId")({ component: QuoteDetail });
function QuoteDetail() {
  const { quoteId } = Route.useParams(); const qc = useQueryClient(); const [search, setSearch] = useState(""); const [quantities, setQuantities] = useState<Record<string, number>>({});
  const quote = useQuery({ queryKey: ["seller-quote", quoteId], queryFn: () => quoteById(quoteId) });
  const products = useQuery({ queryKey: ["quote-products", search], enabled: quote.data?.status === "draft", queryFn: async () => { let q = supabase.from("products").select("id,name,code,stock").eq("active", true).gt("stock", 0).limit(20); if (search) q = q.ilike("name", `%${search}%`); return (await q.order("name")).data ?? []; } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["seller-quote", quoteId] }); qc.invalidateQueries({ queryKey: ["seller-quotes"] }); };
  const action = useMutation({ mutationFn: ({ name, args }: { name: string; args: Record<string, unknown> }) => rpc(name, args), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  if (quote.isLoading) return <p>Carregando…</p>; if (!quote.data) return <p>Orçamento não encontrado.</p>; const q = quote.data; const draft = q.status === "draft";
  const total = q.seller_quote_items?.reduce((s, i) => s + i.quantity * Number(i.unit_price_snapshot ?? 0), 0) ?? 0;
  return <div className="mx-auto max-w-5xl space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Orçamento para {q.client_name_snapshot ?? q.client?.full_name ?? q.client_email_snapshot ?? q.client?.email}</h1><p className="text-sm text-muted-foreground">Validade: {new Date(q.valid_until).toLocaleString("pt-BR")}</p></div><Badge>{q.status}</Badge></div>
    <Card><CardHeader><CardTitle>Itens</CardTitle></CardHeader><CardContent className="space-y-2">{q.seller_quote_items?.map((i) => <div key={i.id} className="flex items-center justify-between rounded-md border p-3"><span>{i.quantity}× {i.product_name_snapshot ?? "Produto selecionado"}</span><div className="flex items-center gap-3">{i.unit_price_snapshot != null && <strong>{money(i.quantity * Number(i.unit_price_snapshot))}</strong>}{draft && <Button size="icon" variant="ghost" onClick={() => action.mutate({ name: "remove_seller_quote_item", args: { _quote_id: q.id, _product_id: i.product_id } })}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}{!q.seller_quote_items?.length && <p className="text-sm text-muted-foreground">Adicione pelo menos um produto.</p>}{!draft && <div className="pt-3 text-right text-lg font-bold">Total: {money(total)}</div>}</CardContent></Card>
    {draft && <Card><CardHeader><CardTitle>Adicionar produtos do catálogo</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Buscar produto…" value={search} onChange={(e) => setSearch(e.target.value)} />{products.data?.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-md border p-3"><span className="min-w-0 flex-1 truncate">{p.name} <small className="text-muted-foreground">({p.stock} disponíveis)</small></span><Input className="w-20" type="number" min={1} max={p.stock} value={quantities[p.id] ?? 1} onChange={(e) => setQuantities({ ...quantities, [p.id]: Number(e.target.value) })} /><Button variant="outline" onClick={() => action.mutate({ name: "save_seller_quote_item", args: { _quote_id: q.id, _product_id: p.id, _quantity: quantities[p.id] ?? 1 } })}>Adicionar</Button></div>)}</CardContent></Card>}
    {draft && <div className="flex justify-end"><Button disabled={!q.seller_quote_items?.length || action.isPending} onClick={() => action.mutate({ name: "send_seller_quote", args: { _quote_id: q.id } })}><Send className="mr-2 h-4 w-4" />Validar preços e enviar</Button></div>}
  </div>;
}
