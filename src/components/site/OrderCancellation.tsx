import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { manageOrderFulfillment } from "@/lib/orders.functions";
import type { FulfillmentOrder } from "@/lib/order-fulfillment";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function OrderCancellation({ order, admin = false }: { order: FulfillmentOrder; admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(false);
  const [confirmedRefund, setConfirmedRefund] = useState(false);
  const [mode, setMode] = useState<"cancel" | "refunded">("cancel");
  const action = useServerFn(manageOrderFulfillment);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => action({ data: { orderId: order.id, action: mode, ...(mode === "cancel" ? { reason, requestRefund: refund } : {}) } }),
    onSuccess: () => {
      setOpen(false); setReason("");
      toast.success(mode === "refunded" ? "Reembolso registrado" : "Solicitação registrada");
      for (const key of ["admin-orders", "my-orders", "order", "audit"]) void qc.invalidateQueries({ queryKey: [key] });
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o pedido"),
  });
  if (order.refund_status === "refunded" || order.payment_status === "refunded") return null;
  const requested = order.refund_status === "requested";
  const delivered = order.delivery_status === "entregue";
  const cancelled = order.delivery_status === "cancelada";
  const paid = order.payment_status === "approved";
  const canCancel = !requested && (!cancelled || paid);
  return <>
    <div className="flex flex-wrap gap-2">
      {canCancel && <Button size="sm" variant="outline" className="text-red-700" onClick={() => { setMode("cancel"); setRefund(delivered || cancelled); setOpen(true); }}>
        {delivered || cancelled ? "Solicitar reembolso" : "Cancelar entrega"}
      </Button>}
      {admin && requested && <Button size="sm" onClick={() => { setMode("refunded"); setConfirmedRefund(false); setOpen(true); }}>Marcar como reembolsado</Button>}
    </div>
    <Dialog open={open} onOpenChange={value => { if (!mutation.isPending) setOpen(value); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "refunded" ? "Registrar reembolso" : "Cancelar entrega / solicitar reembolso"}</DialogTitle>
          <DialogDescription>{mode === "refunded" ? "Registre somente depois de efetuar o reembolso ao cliente. Esta ação não transfere dinheiro." : "A administração receberá a solicitação e poderá acompanhar o cancelamento no pedido."}</DialogDescription>
        </DialogHeader>
        {mode === "cancel" ? <>
          <label className="text-sm" htmlFor={`cancel-${order.id}`}>Motivo</label>
          <Textarea id={`cancel-${order.id}`} value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} placeholder="Descreva o motivo (mínimo de 3 caracteres)" />
          {paid && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refund} disabled={!admin && delivered} onChange={event => setRefund(event.target.checked)} />Também solicitar reembolso</label>}
        </> : <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmedRefund} onChange={event => setConfirmedRefund(event.target.checked)} />Já efetuei o reembolso ao cliente</label>}
        <Button disabled={mutation.isPending || (mode === "cancel" ? reason.trim().length < 3 : !confirmedRefund)} onClick={() => mutation.mutate()}>{mutation.isPending ? "Salvando..." : "Confirmar"}</Button>
      </DialogContent>
    </Dialog>
  </>;
}
