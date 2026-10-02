import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, Pencil, Plus, Trash2, Clock, UserRound, RefreshCw } from "lucide-react";
import { AUDIT_ACTIONS, AUDIT_AREAS, auditChanges, auditDate, auditFields, auditLabel, auditRecord, auditSummary, type AuditRow } from "@/lib/audit-presentation";
import { AuditValue } from "@/components/admin/AuditValue";
export const Route = createFileRoute("/admin/auditoria")({ component: AuditPage });
const ICONS = { insert:Plus, update:Pencil, delete:Trash2, admin_login:LogIn };
const COLORS: Record<string,string> = { insert:"bg-emerald-50 text-emerald-700",update:"bg-blue-50 text-blue-700",delete:"bg-red-50 text-red-700",admin_login:"bg-purple-50 text-purple-700" };
async function fetchAudit(params: URLSearchParams) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sua sessão expirou. Entre novamente para consultar a auditoria.");
  const response = await fetch("/api/admin/audit?"+params, { headers:{ Authorization:`Bearer ${data.session.access_token}` },cache:"no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a auditoria.");
  return payload;
}
function AuditPage() {
  const [page,setPage] = useState(0); const [table,setTable] = useState("all"); const [action,setAction] = useState("all");
  const [since,setSince] = useState(""); const [until,setUntil] = useState(""); const [selected,setSelected] = useState<AuditRow|null>(null);
  const q = useQuery({ queryKey:["audit",page,table,action,since,until],refetchInterval:15000,
    queryFn:async (): Promise<{ rows:AuditRow[];total:number }> => {
      const params = new URLSearchParams({ page:String(page) });
      if (table !== "all") params.set("table",table); if (action !== "all") params.set("action",action);
      if (since) params.set("since",new Date(since+"T00:00:00-03:00").toISOString());
      if (until) params.set("until",new Date(until+"T23:59:59.999-03:00").toISOString());
      return fetchAudit(params);
    },
  });
  const detail = useQuery({ queryKey:["audit-detail",selected?.id],enabled:!!selected,
    queryFn:async (): Promise<AuditRow> => fetchAudit(new URLSearchParams({ id:selected!.id })),
  });
  const change = (setter:(value:string)=>void) => (value:string) => { setter(value);setPage(0); };
  const event = detail.data || selected;
  const changes = detail.data ? auditChanges(detail.data) : [];
  const filtered = table !== "all" || action !== "all" || since || until;
  return <div className="space-y-5 min-w-0">
    <div><h1 className="text-2xl font-bold">Auditoria</h1><p className="text-sm text-muted-foreground mt-1">Veja quem fez cada ação e o que mudou no site.</p></div>
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="space-y-1.5 text-xs font-medium">Área<Select value={table} onValueChange={change(setTable)}><SelectTrigger className="w-56" aria-label="Área da auditoria"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as áreas</SelectItem>{Object.entries(AUDIT_AREAS).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-1.5 text-xs font-medium">Tipo de ação<Select value={action} onValueChange={change(setAction)}><SelectTrigger className="w-52" aria-label="Tipo de ação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem>{Object.entries(AUDIT_ACTIONS).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-1.5 text-xs font-medium">A partir de<Input type="date" value={since} onChange={e => change(setSince)(e.target.value)} /></label>
        <label className="space-y-1.5 text-xs font-medium">Até<Input type="date" value={until} onChange={e => change(setUntil)(e.target.value)} /></label>
        <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
        {filtered && <Button variant="ghost" onClick={() => {setTable("all");setAction("all");setSince("");setUntil("");setPage(0);}}>Limpar filtros</Button>}
      </div>
      <p className="text-xs text-muted-foreground">Horários de Brasília. O histórico começa na ativação da auditoria.</p>
    </div>
    {q.error && <p role="alert" className="text-destructive">{(q.error as Error).message}</p>}
    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead><tr className="bg-muted/50 text-left">{["Quando","Quem fez","O que aconteceu","O que mudou", ""].map((label,index) => <th key={index} className="p-4 font-medium">{label}</th>)}</tr></thead><tbody>
      {q.data?.rows.map(row => {
        const Icon = ICONS[row.action as keyof typeof ICONS] || Pencil;
        const fields = auditFields(row);
        const name = row.actor_name || row.actor_email || (row.actor_id ? row.people?.[row.actor_id] || "Usuário identificado" : "Sistema / integração");
        return <tr key={row.id} className="border-t align-top hover:bg-muted/20">
          <td className="p-4 whitespace-nowrap text-xs">{auditDate(row.created_at)}</td>
          <td className="p-4 min-w-40"><p className="font-medium break-words">{name}</p>{row.actor_email && row.actor_email !== name && <p className="text-xs text-muted-foreground break-all">{row.actor_email}</p>}<p className="mt-1 text-xs text-muted-foreground">IP: {row.actor_ip || "não registrado"}</p></td>
          <td className="p-4 min-w-56"><div className="flex items-start gap-2.5"><span className={`rounded-lg p-1.5 ${COLORS[row.action] || "bg-muted"}`}><Icon className="h-4 w-4" /></span><div><p className="font-medium">{auditSummary(row)}</p><p className="mt-1 text-xs text-muted-foreground break-words">{auditRecord(row)}</p><Badge variant="secondary" className="mt-2 text-[10px] font-normal">{AUDIT_AREAS[row.entity_table] || "Outras informações do site"}</Badge></div></div></td>
          <td className="p-4 min-w-40"><div className="flex flex-wrap gap-1.5">{fields.slice(0,3).map(field => <span key={field} className="rounded-md bg-muted px-2 py-1 text-xs">{auditLabel(field)}</span>)}</div>{fields.length > 3 && <p className="mt-2 text-xs text-muted-foreground">e mais {fields.length-3} {fields.length-3 === 1 ? "informação" : "informações"}</p>}{row.action === "admin_login" && <span className="text-xs text-muted-foreground">Entrada registrada</span>}</td>
          <td className="p-4"><Button size="sm" variant="outline" onClick={() => setSelected(row)}>{row.action === "admin_login" ? "Ver acesso" : "Ver alterações"}</Button></td>
        </tr>;
      })}
      {q.isLoading && <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />Carregando histórico...</td></tr>}
      {!q.isLoading && !q.error && !q.data?.rows.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Nenhuma ação encontrada. Experimente mudar os filtros.</td></tr>}
    </tbody></table></div>
    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{q.data?.total || 0} ações encontradas · página {page+1}</span><div className="flex gap-2"><Button variant="outline" disabled={!page || q.isFetching} onClick={() => setPage(page-1)}>Anterior</Button><Button variant="outline" disabled={q.isFetching || (page+1)*50 >= (q.data?.total || 0)} onClick={() => setPage(page+1)}>Próxima</Button></div></div>
    <Dialog open={!!selected} onOpenChange={open => {if (!open) setSelected(null);}}><DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto"><DialogHeader><DialogTitle>{event ? auditSummary(event) : "Detalhes da ação"}</DialogTitle><DialogDescription>{event && auditRecord(event)}</DialogDescription></DialogHeader>
      {event && <div className="grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2"><div><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />Quem fez</p><p className="font-medium mt-1">{event.actor_name || event.actor_email || (event.actor_id ? event.people?.[event.actor_id] || "Usuário identificado" : "Sistema / integração")}</p></div><div><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Quando</p><p className="font-medium mt-1">{auditDate(event.created_at)} (Brasília)</p></div><p className="text-xs text-muted-foreground sm:col-span-2">IP da ação: {event.actor_ip || "não registrado para esta ação"}</p></div>}
      {detail.isLoading && <p className="py-6 text-center"><Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />Carregando alterações...</p>}
      {detail.error && <p role="alert" className="text-destructive">{(detail.error as Error).message}</p>}
      {detail.data?.action === "admin_login" && <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">Este administrador entrou no painel. Nenhum dado do site foi alterado nesta ação.</div>}
      {detail.data && detail.data.action !== "admin_login" && <div className="space-y-3"><p className="text-sm text-muted-foreground">{detail.data.action === "insert" ? "Informações cadastradas nesta ação:" : detail.data.action === "delete" ? "Informações do registro que foi excluído:" : `${changes.length} ${changes.length === 1 ? "informação foi alterada" : "informações foram alteradas"}. Compare os valores abaixo.`}</p>
        {changes.map(item => <section key={item.key} className="rounded-lg border overflow-hidden"><h3 className="bg-muted/40 px-4 py-2 text-sm font-semibold">{item.label}</h3><div className={`grid gap-0 ${detail.data!.action === "update" ? "sm:grid-cols-2" : ""}`}>
          {detail.data!.action !== "insert" && <div className="p-4 space-y-2 min-w-0"><p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">{detail.data!.action === "delete" ? "Valor que foi excluído" : "Antes"}</p><AuditValue field={item.field} value={item.before} people={detail.data!.people || {}} /></div>}
          {detail.data!.action !== "delete" && <div className="p-4 space-y-2 bg-emerald-50/50 min-w-0 sm:border-l"><p className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700">{detail.data!.action === "insert" ? "Valor cadastrado" : "Depois"}</p><AuditValue field={item.field} value={item.after} people={detail.data!.people || {}} /></div>}
        </div></section>)}
      </div>}
      <div className="flex justify-end border-t pt-3"><Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button></div>
    </DialogContent></Dialog>
  </div>;
}
