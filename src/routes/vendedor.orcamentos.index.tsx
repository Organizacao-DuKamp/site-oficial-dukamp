import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { sellerQuotes } from "@/lib/seller-quotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/vendedor/orcamentos/")({ component: QuoteList, head: () => ({ meta: [{ title: "Orçamentos — Vendedor Dukamp" }] }) });
const labels = { draft: "Rascunho", sent: "Enviado", accepted: "Aceito", declined: "Recusado", expired: "Vencido" };
function QuoteList() {
  const query = useQuery({ queryKey: ["seller-quotes"], queryFn: sellerQuotes });
  return <div className="mx-auto max-w-5xl space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Orçamentos</h1><p className="text-sm text-muted-foreground">Crie propostas com preços validados no envio.</p></div><Button asChild><Link to="/vendedor/orcamentos/novo"><Plus className="mr-2 h-4 w-4" />Novo</Link></Button></div>
    {query.isLoading && <p>Carregando…</p>}{query.isError && <p className="text-destructive">Não foi possível carregar os orçamentos.</p>}
    <div className="space-y-3">{query.data?.map((q) => <Link key={q.id} to="/vendedor/orcamentos/$quoteId" params={{ quoteId: q.id }}><Card className="transition hover:border-primary"><CardContent className="flex items-center justify-between gap-3 p-4"><div><strong>{q.client_name_snapshot ?? q.client?.full_name ?? q.client_email_snapshot ?? q.client?.email ?? "Cliente"}</strong><p className="text-xs text-muted-foreground">Criado em {new Date(q.created_at).toLocaleDateString("pt-BR")} · {q.seller_quote_items?.length ?? 0} itens</p></div><Badge variant={q.status === "accepted" ? "default" : "secondary"}>{labels[q.status]}</Badge></CardContent></Card></Link>)}</div>
    {!query.isLoading && !query.data?.length && <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum orçamento criado.</CardContent></Card>}
  </div>;
}
