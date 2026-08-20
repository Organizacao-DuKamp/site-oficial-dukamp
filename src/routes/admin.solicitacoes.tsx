import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordRecoveryRequests } from "@/components/admin/PasswordRecoveryRequests";
import { Check, Clock, Eye, ShieldAlert, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/solicitacoes")({ component: SolicitacoesPage });
const money = (value: any) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function SolicitacoesPage() {
  const { isAdmin, user, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  const saleRequests = useQuery({
    enabled: isAdmin,
    queryKey: ["seller-sale-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("seller_sale_requests").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const markSeen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("seller_sale_requests").update({ status: "seen", seen_at: new Date().toISOString(), seen_by: user!.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Solicitação marcada como vista"); qc.invalidateQueries({ queryKey: ["seller-sale-requests"] }); },
    onError: (error: any) => toast.error(error.message),
  });

  const accountRequests = useQuery({
    enabled: isAdmin,
    queryKey: ["account_requests", tab],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("account_requests").select("*").eq("status", tab).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const approve = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).rpc("approve_account_request", { _request_id: id, _reviewer: user!.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Solicitação aprovada"); qc.invalidateQueries({ queryKey: ["account_requests"] }); },
    onError: (error: any) => toast.error(error.message),
  });
  const reject = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("account_requests").update({ status: "rejected", reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Solicitação rejeitada"); qc.invalidateQueries({ queryKey: ["account_requests"] }); },
    onError: (error: any) => toast.error(error.message),
  });

  if (loading) return null;
  if (!isAdmin) return <div className="mx-auto mt-12 max-w-md space-y-2 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="text-xl font-bold">Acesso restrito</h1></div>;
  const newSales = (saleRequests.data ?? []).filter((r: any) => r.status === "new").length;

  return <div className="space-y-8">
    <div><h1 className="text-2xl font-bold">Solicitações</h1><p className="text-sm text-muted-foreground">Solicitações de recuperação de senha, vendas e pedidos de alteração de conta.</p></div>

    <PasswordRecoveryRequests />

    <Card>
      <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Solicitações de venda</CardTitle><CardDescription>O administrativo confere a venda e atualiza manualmente o cliente em Vendas &gt; Clientes.</CardDescription></div>{newSales > 0 && <Badge>{newSales} nova{newSales === 1 ? "" : "s"}</Badge>}</div></CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Vendedor</TableHead><TableHead>Cliente</TableHead><TableHead>Produtos / observação</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>
        {saleRequests.isLoading && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
        {!saleRequests.isLoading && (saleRequests.data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma solicitação de venda.</TableCell></TableRow>}
        {(saleRequests.data ?? []).map((r: any) => <TableRow key={r.id} className={r.status === "new" ? "bg-amber-50/50 dark:bg-amber-950/10" : undefined}>
          <TableCell><Badge variant={r.status === "new" ? "default" : "secondary"}>{r.status === "new" ? "Nova" : "Vista"}</Badge></TableCell>
          <TableCell><div className="font-medium">{r.seller_name}</div><div className="text-xs text-muted-foreground">Código {r.seller_code}</div></TableCell>
          <TableCell><div className="font-medium">{r.customer_name}</div><div className="text-xs text-muted-foreground">Código {r.customer_code}</div></TableCell>
          <TableCell className="max-w-sm whitespace-pre-wrap text-sm">{r.sale_notes}</TableCell>
          <TableCell className="font-semibold">{money(r.sale_value)}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
          <TableCell className="text-right">{r.status === "new" ? <Button size="sm" variant="outline" onClick={() => markSeen.mutate(r.id)} disabled={markSeen.isPending}><Eye className="h-4 w-4" /> Marcar vista</Button> : <span className="text-xs text-muted-foreground">{r.seen_at ? new Date(r.seen_at).toLocaleDateString("pt-BR") : "Vista"}</span>}</TableCell>
        </TableRow>)}
      </TableBody></Table></div></CardContent>
    </Card>

    <div className="space-y-4">
      <div><h2 className="text-xl font-bold">Solicitações de conta</h2><p className="text-sm text-muted-foreground">Pedidos de cadastro como Produtor Rural e Empresa.</p></div>
      <div className="flex gap-2">{(["pending", "approved", "rejected"] as const).map(status => <Button key={status} size="sm" variant={tab === status ? "default" : "outline"} onClick={() => setTab(status)}>{status === "pending" ? "Pendentes" : status === "approved" ? "Aprovadas" : "Rejeitadas"}</Button>)}</div>
      <div className="overflow-x-auto rounded-lg border bg-card"><Table><TableHeader><TableRow><TableHead>Solicitante</TableHead><TableHead>Tipo</TableHead><TableHead>UF</TableHead><TableHead>Documento</TableHead><TableHead className="hidden md:table-cell">Contato</TableHead><TableHead className="hidden md:table-cell">Data</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
        {accountRequests.isLoading && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
        {!accountRequests.isLoading && (accountRequests.data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma solicitação.</TableCell></TableRow>}
        {(accountRequests.data ?? []).map((r: any) => <TableRow key={r.id}><TableCell className="font-medium"><div>{r.full_name}</div><div className="text-xs text-muted-foreground">{r.email}</div></TableCell><TableCell><Badge variant="secondary">{r.requested_type === "produtor" ? "Produtor Rural" : r.requested_type === "empresa" ? "Empresa" : r.requested_type}</Badge></TableCell><TableCell>{r.uf}</TableCell><TableCell className="text-xs">{r.cnpj ? `CNPJ: ${r.cnpj}` : `CPF: ${r.cpf}`}</TableCell><TableCell className="hidden md:table-cell text-xs"><div>{r.phone}</div><div className="text-muted-foreground">{r.contact_email}</div></TableCell><TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell><TableCell className="text-right">{r.status === "pending" ? <div className="flex justify-end gap-1"><Button size="sm" onClick={() => approve.mutate(r.id)} disabled={approve.isPending}><Check className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => reject.mutate(r.id)} disabled={reject.isPending}><X className="h-4 w-4" /></Button></div> : <Badge variant={r.status === "approved" ? "default" : "destructive"}>{r.status === "approved" ? "Aprovada" : "Rejeitada"}</Badge>}</TableCell></TableRow>)}
      </TableBody></Table></div>
      {tab === "pending" && <Card className="bg-muted/30"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> Como funciona</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Ao aprovar, o tipo da conta e os dados cadastrais são atualizados automaticamente.</CardContent></Card>}
    </div>
  </div>;
}
