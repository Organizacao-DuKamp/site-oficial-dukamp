import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewPartnerSale } from "@/lib/partners.functions";
import { partnerDeliveryLabels, type PartnerOrder } from "@/lib/partners";
import { selectionSummary } from "@/lib/product-options";
import { formatBRL } from "@/lib/cart";
import { Field, fieldClass } from "./PartnerUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PartnerRequestDetails({ order: o, admin, refresh }: { order: PartnerOrder; admin: boolean; refresh: () => unknown }) {
  const review = useServerFn(reviewPartnerSale), client = useQueryClient();
  const [commission, setCommission] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState(o.delivery_status);
  useEffect(() => { setDelivery(o.delivery_status); }, [o.delivery_status]);
  const approved = o.approval_status === "approved", pending = o.approval_status === "pending";
  async function act(action: "approve" | "reject" | "delivery") {
    if (busy) return;
    if (action === "approve" && (commission.trim() === "" || !Number.isFinite(Number(commission)) || Number(commission) < 0 || Number(commission) > Number(o.total) || Math.abs(Number(commission) * 100 - Math.round(Number(commission) * 100)) > 0.000001)) {
      toast.error("Informe a comissão em reais, com até duas casas decimais, entre zero e o total da venda."); return;
    }
    setBusy(true);
    try {
      await review({ data: { id: o.id, action,
        ...(action === "approve" ? { commission: Number(commission) } : {}),
        ...(action === "reject" ? { reason } : {}),
        ...(action === "delivery" ? { status: delivery as "preparando" | "pronto" | "a_caminho" | "entregue" } : {}),
      } });
      await Promise.all(["partner-sale","partner-sales","partner-area","admin-partners","partner-products","my-store"].map(key => client.invalidateQueries({ queryKey: [key] })));
      await client.invalidateQueries({ queryKey: ["admin", "pending-partner-sales-count"] });
      await refresh();
      toast.success(action === "approve" ? "Venda aceita e comissão registrada." : action === "reject" ? "Venda recusada." : "Entrega atualizada.");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const amount = (label: string, value: unknown) => <p className="flex justify-between gap-3"><span>{label}</span><strong>{formatBRL(Number(value || 0))}</strong></p>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">Pedido {o.order_number}</h1><p className="text-sm text-muted-foreground">{o.partner_name} · {new Date(o.created_at).toLocaleString("pt-BR")}</p></div>
      <Button variant="outline" onClick={() => refresh()}>Atualizar</Button>
    </div>
    <section role="status" className="rounded-xl border bg-primary/5 p-5">
      <h2 className="font-semibold">{pending ? "Pedido registrado — aguardando confirmação da Dukamp" : approved ? "Venda aceita pela Dukamp" : "Venda não confirmada"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{pending ? "O registro foi enviado sem pagamento. A Dukamp entrará em contato com o cliente para confirmar a compra. Após a aceitação, a comissão aparecerá aqui." : approved ? "A compra foi confirmada pelo administrador. Acompanhe a comissão e a entrega abaixo." : o.rejection_reason || "Entre em contato com a Dukamp para mais informações."}</p>
    </section>
    <section className="space-y-3 rounded-xl border bg-card p-5 text-sm">
      <h2 className="font-semibold">Produtos e valores</h2>
      {o.order_items.map((item, index) => <div key={item.id || index} className="flex justify-between gap-3 border-b py-2">
        <div><p>{item.quantity} × {item.name}</p><p className="text-xs text-muted-foreground">{selectionSummary(item.selected_options)} · {formatBRL(Number(item.unit_price))} / unidade</p></div><span>{formatBRL(Number(item.subtotal))}</span>
      </div>)}
      {amount("Produtos", o.subtotal)}{amount(`Frete (${o.shipping_service || "a confirmar"})`, o.shipping_cost)}{amount("Total da venda", o.total)}
      <p className="flex justify-between gap-3 border-t pt-3"><span>Comissão do parceiro</span><strong>{approved ? formatBRL(Number(o.partner_commission_amount)) : pending ? "A definir após confirmação" : "Não devida"}</strong></p>
      {approved && o.commission_payout_month && <p>Pagamento previsto até o 10º dia útil de {new Date(o.commission_payout_month + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}.</p>}
      <p className="text-xs text-muted-foreground">Comissões aprovadas no mês: pagamento pela chave Pix até o 10º dia útil do mês seguinte.</p>
      {admin && <p className="break-all">Chave Pix do parceiro: <strong>{o.partner_pix_key || "Ainda não cadastrada"}</strong></p>}
    </section>
    <div className="grid gap-5 md:grid-cols-2">
      <section className="space-y-2 rounded-xl border bg-card p-5 text-sm">
        <h2 className="font-semibold">Ficha e contato do cliente</h2>
        <p>{o.customer_name}</p><p>CPF/CNPJ: {o.cpf_cnpj}</p><p>E-mail: {o.email}</p><p>Telefone: {o.phone}</p>
        {Object.entries(o.partner_customer_details || {}).filter(([k,v]) => k !== "cobranca" && !!v).map(([k,v]) => <p key={k}>{({ contato:"Contato", telefone_alternativo:"Outro telefone", inscricao_estadual:"Inscrição estadual", propriedade:"Propriedade", observacoes:"Observações" } as Record<string,string>)[k] || k}: {String(v)}</p>)}
      </section>
      <section className="space-y-2 rounded-xl border bg-card p-5 text-sm">
        <h2 className="font-semibold">{o.fulfillment_method === "pickup" ? "Retirada / endereço cadastrado" : "Entrega"}</h2>
        <p>{o.rua}, {o.numero} {o.complemento}</p><p>{o.bairro} · {o.cidade}/{o.estado}</p><p>CEP: {o.cep}</p>
        {o.referencia_entrega && <p>Referência: {o.referencia_entrega}</p>}{o.pessoa_autorizada && <p>Recebedor: {o.pessoa_autorizada}</p>}
        {o.partner_customer_details?.cobranca && <div className="border-t pt-2"><p className="font-medium">Endereço de cobrança</p><p>{o.partner_customer_details.cobranca.rua}, {o.partner_customer_details.cobranca.numero} · {o.partner_customer_details.cobranca.bairro}</p><p>{o.partner_customer_details.cobranca.cidade}/{o.partner_customer_details.cobranca.estado} · CEP {o.partner_customer_details.cobranca.cep}</p></div>}
      </section>
    </div>
    {admin && pending && <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Confirmar compra com o cliente</h2>
      <p className="text-sm text-muted-foreground">Após entrar em contato e confirmar a compra, informe a comissão do parceiro em reais e aceite a venda. O estoque será baixado ao aceitar.</p>
      <Field label="Comissão do parceiro (R$)" required><Input type="number" min="0" max={Number(o.total)} step="0.01" value={commission} onChange={e => setCommission(e.target.value)} placeholder="Informe o valor" /></Field>
      <Button disabled={busy || commission.trim() === ""} onClick={() => act("approve")}>{busy ? "Salvando..." : "Aceitar venda e definir comissão"}</Button>
      <div className="space-y-3 border-t pt-4"><Field label="Motivo da recusa"><Textarea value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></Field><Button variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => act("reject")}>Recusar venda</Button></div>
    </section>}
    {approved && <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">Andamento: {partnerDeliveryLabels[o.delivery_status] || o.delivery_status}</h2>
      {admin && <div className="flex flex-wrap gap-3"><select aria-label="Etapa da entrega" className={fieldClass} value={delivery} onChange={e => setDelivery(e.target.value)}>
        <option value="preparando">Preparando</option>{o.fulfillment_method === "pickup" ? <option value="pronto">Pronto para retirada</option> : <option value="a_caminho">Enviado</option>}<option value="entregue">Entregue</option>
      </select><Button disabled={busy} onClick={() => act("delivery")}>Atualizar entrega</Button></div>}
    </section>}
    {!admin && <Button asChild variant="outline"><Link to="/parceiro/vendas">Voltar a Gerenciar vendas</Link></Button>}
  </div>;
}
