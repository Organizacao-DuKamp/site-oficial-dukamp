import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SellerCustomerScope = "portfolio" | "blue";
type CustomerRecord = Record<string, any>;
type Props = { customerId: string | null; scope: SellerCustomerScope; open: boolean; onOpenChange: (open: boolean) => void; onUpdated?: () => void };

async function authToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  return token;
}
async function loadCustomer(customerId: string, scope: SellerCustomerScope) {
  const token = await authToken();
  const params = new URLSearchParams({ source: "detail", id: customerId, scope });
  const response = await fetch(`/api/seller/clients?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a ficha.");
  return payload.customer as CustomerRecord;
}
async function saveCustomer(customerId: string, scope: SellerCustomerScope, fields: Record<string, string>) {
  const token = await authToken();
  const response = await fetch("/api/seller/clients", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateCustomer", customerId, scope, fields }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar o cliente.");
  return payload.customer as CustomerRecord;
}
const money = (value: any) => value === null || value === undefined || value === "" ? "—" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (value: any) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const text = (value: any) => String(value ?? "").trim() || "—";
const delay = (value: any) => value === null || value === undefined || value === "" ? "—" : `${value} dia${Number(value) === 1 ? "" : "s"}`;
function address(c: CustomerRecord, payment = false) {
  const suffix = payment ? "_pagamento" : "";
  return [[c[`endereco${suffix}`], c[`numero${suffix}`]].filter(Boolean).join(", "), [c[`bairro${suffix}`], [c[`cidade${suffix}`], c[`uf${suffix}`]].filter(Boolean).join("/"), c[`cep${suffix}`]].filter(Boolean).join(" • ")].filter(Boolean).join("\n") || "—";
}
function Field({ label, value }: { label: string; value: any }) { return <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-line text-sm font-medium">{text(value)}</dd></div>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-xl border p-4"><h3 className="mb-4 font-semibold">{title}</h3>{children}</section>; }

export function SellerCustomerDetailDialog({ customerId, scope, open, onOpenChange, onUpdated }: Props) {
  const [lastCustomerId, setLastCustomerId] = useState<string | null>(customerId);
  const [detailsOpen, setDetailsOpen] = useState(open);
  const [promptOpen, setPromptOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const effectiveId = customerId || lastCustomerId;

  useEffect(() => { if (customerId) setLastCustomerId(customerId); if (open) setDetailsOpen(true); }, [customerId, open]);
  const query = useQuery({ queryKey: ["seller-customer-detail", effectiveId, scope], enabled: detailsOpen && Boolean(effectiveId), queryFn: () => loadCustomer(effectiveId!, scope) });
  useEffect(() => {
    if (!query.data) return;
    const c = query.data;
    setForm({ endereco: c.endereco ?? "", numero: c.numero ?? "", bairro: c.bairro ?? "", cidade: c.cidade ?? "", uf: c.uf ?? "", cep: c.cep ?? "", contato: c.contato ?? "", telefone: c.telefone ?? "", telefone_2: c.telefone_2 ?? "", celular: c.celular ?? "", email: c.email ?? "", observacao_vendedor: c.observacao_vendedor ?? "", roteiro: c.roteiro ?? "" });
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => saveCustomer(effectiveId!, scope, form),
    onSuccess: () => { toast.success("Dados do cliente atualizados"); setEditMode(false); void query.refetch(); onUpdated?.(); },
    onError: (error: Error) => toast.error(error.message),
  });
  function closeDetails(next: boolean) {
    if (next) { setDetailsOpen(true); return; }
    setDetailsOpen(false); setEditMode(false); onOpenChange(false);
    if (effectiveId) window.setTimeout(() => setPromptOpen(true), 120);
  }

  const c = query.data;
  return <>
    <Dialog open={detailsOpen} onOpenChange={closeDetails}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>{c?.cliente || "Ficha do cliente"}</DialogTitle><DialogDescription>{c?.codigo ? `Código ${c.codigo} • ficha completa` : "Dados cadastrais e comerciais"}</DialogDescription></DialogHeader>
        {query.isPending ? <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando ficha...</div> : query.isError ? <p className="text-sm text-destructive">{query.error instanceof Error ? query.error.message : "Erro ao carregar."}</p> : c ? <div className="space-y-4">
          <Section title="Cadastro"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Cliente" value={c.cliente} /><Field label="Código" value={c.codigo} /><Field label="CNPJ/CPF" value={c.cnpj_cpf} /><Field label="Inscrição estadual" value={c.inscricao_estadual} /><Field label="Data de cadastro" value={dateBR(c.data_cadastro)} /><Field label="REPR" value={c.repr} /><Field label="COB" value={c.cob} /><Field label="Classificação L" value={c.classificacao_l} /><Field label="Conceito" value={c.conceito} /><Field label="Marcador do relatório" value={c.marcador_relatorio} /></dl></Section>
          <Section title="Vendedor responsável"><dl className="grid gap-4 sm:grid-cols-2"><Field label="Código do vendedor" value={c.vendedor_codigo} /><Field label="Vendedor" value={c.vendedor_nome} /></dl></Section>
          <Section title="Compras e histórico"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Última compra" value={dateBR(c.ultima_compra)} /><Field label="Valor da última" value={money(c.valor_ultima_compra)} /><Field label="Data da maior compra" value={dateBR(c.data_maior_compra)} /><Field label="Valor da maior compra" value={money(c.valor_maior_compra)} /><Field label="Compra no ano" value={money(c.compra_ano)} /><Field label="Ano anterior" value={money(c.compra_ano_anterior)} /><Field label="Média de atraso" value={delay(c.media_atraso_dias)} /><Field label="Maior atraso" value={delay(c.maior_atraso_dias)} /></dl></Section>
          <Section title="Endereços"><dl className="grid gap-4 sm:grid-cols-2"><Field label="Endereço principal" value={address(c)} /><Field label="Endereço de pagamento" value={address(c, true)} /></dl></Section>
          <Section title="Contato"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Contato" value={c.contato} /><Field label="Telefone" value={c.telefone} /><Field label="Telefone 2" value={c.telefone_2} /><Field label="Celular" value={c.celular} /><Field label="E-mail" value={c.email} /></dl></Section>
          <Section title="Informações comerciais"><dl className="grid gap-4 sm:grid-cols-2"><Field label="Observação do vendedor" value={c.observacao_vendedor} /><Field label="Roteiro de entrega" value={c.roteiro} /></dl></Section>
          <div className="text-xs text-muted-foreground">Relatório atualizado em {dateBR(c.dados_relatorio_atualizados_em)} • Vendedor atualizado em {dateBR(c.dados_vendedor_atualizados_em)}</div>
          {editMode && <Section title="Editar dados permitidos"><div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["endereco","Endereço"],["numero","Número"],["bairro","Bairro"],["cidade","Cidade"],["uf","UF"],["cep","CEP"],["contato","Contato"],["telefone","Telefone"],["telefone_2","Telefone 2"],["celular","Celular"],["email","E-mail"]].map(([name,label]) => <div key={name} className="space-y-1"><Label htmlFor={name}>{label}</Label><Input id={name} value={form[name] ?? ""} onChange={e => setForm(v => ({ ...v, [name]: e.target.value }))} /></div>)}</div>
            <div className="space-y-1"><Label htmlFor="observacao_vendedor">Observação</Label><Textarea id="observacao_vendedor" value={form.observacao_vendedor ?? ""} onChange={e => setForm(v => ({ ...v, observacao_vendedor: e.target.value }))} /></div>
            <div className="space-y-1"><Label htmlFor="roteiro">Roteiro de entrega</Label><Textarea id="roteiro" className="min-h-28" value={form.roteiro ?? ""} onChange={e => setForm(v => ({ ...v, roteiro: e.target.value }))} /></div>
          </div></Section>}
        </div> : null}
        <DialogFooter>{editMode ? <><Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4" /> {save.isPending ? "Salvando..." : "Salvar alterações"}</Button></> : <Button onClick={() => setEditMode(true)} disabled={!c}><Pencil className="h-4 w-4" /> Editar endereço, contato, observação e roteiro</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Deseja atualizar os dados?</DialogTitle><DialogDescription>Confira se endereço, contato, observação e roteiro de entrega continuam corretos antes de encerrar.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPromptOpen(false)}>Fechar mesmo</Button><Button onClick={() => { setPromptOpen(false); setEditMode(true); setDetailsOpen(true); }}>Atualizar dados</Button></DialogFooter></DialogContent>
    </Dialog>
  </>;
}
