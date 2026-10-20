import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { partnerSales } from "@/lib/partners.functions";
import { adminUpdateDeliveryStatus } from "@/lib/orders.functions";
import { partnerDeliveryLabels, partnerPaymentLabels, recognizedPartnerSale } from "@/lib/partners";
import { useAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/cart";
import {
  PageHeading,
  SummaryCards,
  EmptyState,
  ErrorNotice,
  fieldClass,
  useAdminPartnerData,
} from "./PartnerUi";
import { PartnerSaleDetails } from "./PartnerSaleDetails";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";

export function PartnerSales({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const fetch = useServerFn(partnerSales);
  const update = useServerFn(adminUpdateDeliveryStatus);
  const [page, setPage] = useState(1);
  const [partnerId, setPartnerId] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const partners = useAdminPartnerData();
  const query = useQuery({
    queryKey: ["partner-sales", user?.id, admin, partnerId, page],
    queryFn: () => fetch({ data: { page, admin, partnerId: partnerId || undefined } }),
    enabled: !!user,
    refetchInterval: 30000,
  });
  useEffect(() => {
    setPage(1);
  }, [partnerId]);
  async function changeStatus(id: string, status: "preparando" | "a_caminho" | "entregue") {
    setUpdating(id);
    try {
      await update({ data: { orderId: id, status } });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["partner-sales"] }),
        client.invalidateQueries({ queryKey: ["partner-sale"] }),
        client.invalidateQueries({ queryKey: ["admin-partners"] }),
        client.invalidateQueries({ queryKey: ["partner-area"] }),
      ]);
      toast.success("Andamento atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUpdating(null);
    }
  }
  return (
    <>
      <PageHeading
        title="Gerenciar vendas"
        description={
          admin
            ? "Confira o cliente, os produtos, os valores e o frete. Após confirmar a compra, aceite a venda e defina a comissão nos detalhes."
            : "Acompanhe a confirmação das vendas, as comissões e as entregas."
        }
        action={
          <Button variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}>
            Atualizar vendas
          </Button>
        }
      />
      {admin && (
        <label className="mb-5 grid max-w-sm gap-2 text-sm font-medium">
          Filtrar por parceiro
          <select
            className={fieldClass}
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
          >
            <option value="">Todos os parceiros</option>
            {partners.data?.partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.razao_social}
                {p.deleted_at ? " (arquivado)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {query.isPending ? (
        <p>Carregando vendas...</p>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          <SummaryCards summaries={query.data.summaries} />
          {!query.data.orders.length ? (
            <EmptyState>
              Nenhuma venda registrada{partnerId ? " para este parceiro" : ""}.
              {!admin && (
                <p className="mt-3">
                  <Link to="/parceiro/registrar" className="font-medium text-primary underline">
                    Registrar a primeira compra
                  </Link>
                </p>
              )}
            </EmptyState>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      {[
                        "Pedido / cliente",
                        ...(admin ? ["Parceiro"] : []),
                        "Faturamento",
                        "Comissão",
                        "Total do pedido",
                        "Confirmação",
                        "Processo",
                        "Ações",
                      ].map((t) => (
                        <th key={t} className="whitespace-nowrap p-4 font-medium">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="min-w-48 p-4">
                          <p className="font-medium">{o.order_number}</p>
                          <p className="mt-1 text-xs">{o.customer_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.cidade}/
                            {o.estado}
                          </p>
                        </td>
                        {admin && <td className="min-w-40 p-4">{o.partner_name}</td>}
                        <td className="whitespace-nowrap p-4 tabular-nums">
                          {formatBRL(Number(o.partner_gross_total))}
                        </td>
                        <td className="whitespace-nowrap p-4 tabular-nums">
                          <span
                            className={
                              recognizedPartnerSale(o)
                                ? "font-medium text-primary"
                                : "text-muted-foreground"
                            }
                          >
                            {o.request_kind === "approval" && o.approval_status === "pending" ? "A definir" : formatBRL(Number(o.partner_commission_amount))}
                          </span>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {recognizedPartnerSale(o)
                              ? "Confirmada"
                              : o.payment_status === "refunded" ||
                                  o.delivery_status === "cancelada" ||
                                  o.refund_status !== "none"
                                ? "Não devida"
                                : o.request_kind === "approval" ? (o.approval_status === "rejected" ? "Não devida" : "Aguardando aceite") : "Prevista"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap p-4 tabular-nums">
                          {formatBRL(Number(o.total))}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs ${o.payment_status === "approved" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                          >
                            {o.request_kind === "approval" ? ({ pending: "Aguardando confirmação", approved: "Venda aceita", rejected: "Recusada" }[o.approval_status || "pending"]) : partnerPaymentLabels[o.payment_status] || o.payment_status}
                          </span>
                        </td>
                        <td className="min-w-44 p-4">
                          {o.request_kind === "approval" ? <span>{o.approval_status === "approved" ? partnerDeliveryLabels[o.delivery_status] : "Aguardando análise"}</span> : admin &&
                          o.fulfillment_method !== "pickup" &&
                          o.delivery_status !== "cancelada" ? (
                            <select
                              aria-label={`Processo do pedido ${o.order_number}`}
                              className={fieldClass}
                              disabled={
                                updating === o.id ||
                                o.payment_status !== "approved" ||
                                o.refund_status !== "none"
                              }
                              value={o.delivery_status}
                              onChange={(e) =>
                                changeStatus(
                                  o.id,
                                  e.target.value as "preparando" | "a_caminho" | "entregue",
                                )
                              }
                            >
                              <option value="preparando">Preparando</option>
                              <option value="a_caminho">Enviado</option>
                              <option value="entregue">Entregue</option>
                            </select>
                          ) : (
                            <span>
                              {o.payment_status === "approved"
                                ? partnerDeliveryLabels[o.delivery_status] || o.delivery_status
                                : "Aguardando confirmação"}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {admin ? (
                            <Button size="sm" variant="outline" onClick={() => setDetail(o.id)}>
                              Detalhes
                            </Button>
                          ) : (
                            <Button asChild size="sm" variant="outline">
                              <Link to="/parceiro/vendas/$id" params={{ id: o.id }}>
                                {o.request_kind !== "approval" && o.payment_status === "pending"
                                  ? "Pagamento / detalhes"
                                  : "Ver venda"}
                              </Link>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <p>
                  {query.data.count} vendas · página {page} de{" "}
                  {Math.max(1, Math.ceil(query.data.count / 25))}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page * 25 >= query.data.count}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da venda do parceiro</DialogTitle>
          </DialogHeader>
          {detail && <PartnerSaleDetails orderId={detail} admin />}
        </DialogContent>
      </Dialog>
    </>
  );
}
