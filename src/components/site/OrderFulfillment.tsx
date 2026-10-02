import { DELIVERY_LABELS, isPickup, PICKUP_LOCATIONS, type FulfillmentOrder, type PickupLocation } from "@/lib/order-fulfillment";

export function OrderFulfillment({ order }: { order: FulfillmentOrder & { shipping_service?: string | null } }) {
  const pickup = isPickup(order);
  const status = DELIVERY_LABELS[order.delivery_status as keyof typeof DELIVERY_LABELS] || "Preparando";
  return <div className="space-y-2 text-sm">
    <p className="font-semibold">{pickup ? "Retirada na loja" : "Entrega"} · {status}</p>
    {order.refund_status === "requested" && <p className="font-medium text-red-700">Reembolso solicitado — aguardando a administração.</p>}
    {order.refund_status === "refunded" && <p className="font-medium text-green-700">Reembolso registrado pela administração.</p>}
    {pickup && <>
      <p>{order.pickup_location ? PICKUP_LOCATIONS[order.pickup_location as PickupLocation] : "A administração informará a unidade de retirada."}</p>
      {order.delivery_status === "pronto" && order.pickup_deadline_at
        ? <p className="font-medium text-green-700">Pronto desde {new Date(order.pickup_ready_at!).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Retire até {new Date(order.pickup_deadline_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>
        : order.delivery_status === "preparando" && <p className="text-muted-foreground">O prazo de 7 dias começa quando o pedido for marcado como Pronto.</p>}
    </>}
    {order.cancellation_reason && <p className="text-muted-foreground">Motivo do cancelamento: {order.cancellation_reason}</p>}
  </div>;
}
