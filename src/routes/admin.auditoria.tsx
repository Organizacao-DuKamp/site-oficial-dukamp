import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export const Route = createFileRoute("/admin/auditoria")({ component: AuditPage });
const ACTIONS: Record<string,string> = { insert:"Criação",update:"Alteração",delete:"Exclusão",admin_login:"Acesso administrativo" };
const TABLES: Record<string,string> = { products:"Produtos do site",erp_products:"Produtos do ERP",orders:"Pedidos",order_items:"Itens dos pedidos",dukamp_stock_items:"Estoque DuKamp",admin_access:"Acessos administrativos",profiles:"Contas",user_roles:"Permissões",erp_suppliers:"Fornecedores",erp_purchase_orders:"Compras",site_settings:"Configurações",support_messages:"Mensagens",support_tickets:"Atendimentos",dukamp_expense_monthly_values:"Despesas",dukamp_bank_reports:"Registros bancários" };
function AuditPage() {
  const [page,setPage] = useState(0); const [table,setTable] = useState("all"); const [action,setAction] = useState("all");
  const [since,setSince] = useState(""); const [until,setUntil] = useState(""); const [selected,setSelected] = useState<any>(null);
  const q = useQuery({ queryKey:["audit",page,table,action,since,until],refetchInterval:15000,
    queryFn:async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sessão expirada");
      const params = new URLSearchParams({ page:String(page) });
      if (table !== "all") params.set("table",table); if (action !== "all") params.set("action",action);
      if (since) params.set("since",new Date(since+"T00:00:00-03:00").toISOString());
      if (until) params.set("until",new Date(until+"T23:59:59.999-03:00").toISOString());
      const response = await fetch("/api/admin/audit?"+params,{ headers:{ Authorization:`Bearer ${data.session.access_token}` },cache:"no-store" });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Erro ao carregar auditoria"); return payload as { rows:any[];total:number };
    },
  });
  const detail = useQuery({
    queryKey:["audit-detail",selected?.id], enabled:!!selected,
    queryFn:async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Entre novamente");
      const response = await fetch("/api/admin/audit?id="+encodeURIComponent(selected!.id),{ headers:{ Authorization:`Bearer ${data.session.access_token}` },cache:"no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Erro ao carregar detalhes");
      return payload;
    },
  });
  const change = (setter:(value:string)=>void) => (value:string) => { setter(value);setPage(0); };
  return <div className="space-y-4 min-w-0">
    <div><h1 className="text-2xl font-bold">Auditoria</h1><p className="text-sm text-muted-foreground">Acessos de administradores e alterações de dados. Os registros começam na implantação desta área.</p></div>
    <div className="flex flex-wrap gap-3">
      <Select value={table} onValueChange={change(setTable)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as áreas</SelectItem>{Object.entries(TABLES).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
      <Select value={action} onValueChange={change(setAction)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem>{Object.entries(ACTIONS).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
      <label className="text-xs">De<Input type="date" value={since} onChange={event => change(setSince)(event.target.value)} /></label>
      <label className="text-xs">Até<Input type="date" value={until} onChange={event => change(setUntil)(event.target.value)} /></label>
      <Button variant="outline" onClick={() => q.refetch()}>Atualizar</Button>
    </div>
    {q.error && <p role="alert" className="text-destructive">{(q.error as Error).message}</p>}
    <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead><tr className="bg-muted text-left">{["Quando","Responsável","IP","Ação","Área / registro","Campos",""].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>
      {q.data?.rows.map(row => <tr key={row.id} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString("pt-BR")}</td><td className="p-3"><p>{row.actor_name || row.actor_email || (row.actor_id ? "Usuário identificado" : "Sistema / integração")}</p><p className="text-xs text-muted-foreground">{row.actor_email || row.actor_id}</p></td><td className="p-3 font-mono text-xs">{row.actor_ip || "Não disponível"}</td><td className="p-3">{ACTIONS[row.action] || row.action}</td><td className="p-3"><p>{TABLES[row.entity_table] || row.entity_table}</p><p className="text-xs font-mono">{row.entity_id}</p></td><td className="p-3 max-w-64 text-xs">{row.changed_fields.join(", ") || "—"}</td><td className="p-3"><Button size="sm" variant="outline" onClick={() => setSelected(row)}>Detalhes</Button></td></tr>)}
      {!q.isLoading && !q.data?.rows.length && <tr><td colSpan={7} className="p-8 text-center">Nenhum registro neste filtro.</td></tr>}
    </tbody></table></div>
    <div className="flex items-center justify-between text-sm"><span>{q.data?.total || 0} registros · página {page+1}</span><div className="flex gap-2"><Button variant="outline" disabled={!page} onClick={() => setPage(page-1)}>Anterior</Button><Button variant="outline" disabled={(page+1)*50 >= (q.data?.total || 0)} onClick={() => setPage(page+1)}>Próxima</Button></div></div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Detalhes da ação</DialogTitle><DialogDescription>{selected && `${ACTIONS[selected.action] || selected.action} · ${TABLES[selected.entity_table] || selected.entity_table}`}</DialogDescription></DialogHeader>
      {detail.isLoading && <p>Carregando detalhes...</p>}
      {detail.error && <p role="alert" className="text-destructive">{(detail.error as Error).message}</p>}
      {detail.data && <div className="grid gap-4 sm:grid-cols-2">{["before_data","after_data"].map((key,index) => <div key={key} className="min-w-0"><h3 className="mb-2 font-semibold">{index ? "Depois" : "Antes"}</h3><pre className="rounded bg-muted p-3 overflow-auto text-xs max-h-96">{JSON.stringify(detail.data?.[key],null,2)}</pre></div>)}</div>}
    </DialogContent></Dialog>
  </div>;
}
