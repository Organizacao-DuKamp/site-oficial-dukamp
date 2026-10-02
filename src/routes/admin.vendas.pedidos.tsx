import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListOrders, adminUpdateDeliveryStatus, manageOrderFulfillment } from "@/lib/orders.functions";
import { DELIVERY_LABELS, PICKUP_LOCATIONS, isPickup, type DeliveryStatus, type PickupLocation } from "@/lib/order-fulfillment";
import { OrderShippingPanel } from "@/components/admin/OrderShippingPanel";
import { OrderFulfillment } from "@/components/site/OrderFulfillment";
import { OrderCancellation } from "@/components/site/OrderCancellation";
import { formatBRL } from "@/lib/cart";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/vendas/pedidos")({
  validateSearch: (search: Record<string, unknown>): { orderId?: string } => ({ orderId: typeof search.orderId === "string" && /^[0-9a-f-]{36}$/i.test(search.orderId) ? search.orderId : undefined }),
  component: Pedidos,
});
function Pedidos() {
  const { orderId } = Route.useSearch();
  const fetchOrders = useServerFn(adminListOrders);
  const updateStatus = useServerFn(adminUpdateDeliveryStatus);
  const manage = useServerFn(manageOrderFulfillment);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-orders", "all", orderId || "all"], queryFn: () => fetchOrders({ data: { orderId } }), refetchInterval: 10000 });
  const mutation = useMutation({
    mutationFn: (data: { orderId: string; status?: DeliveryStatus; pickupLocation?: PickupLocation }) => data.status
      ? updateStatus({ data: { ...data, status: data.status as Exclude<DeliveryStatus,"cancelada"> } })
      : manage({ data: { orderId: data.orderId, action: "location", pickupLocation: data.pickupLocation, requestRefund: false } }),
    onSuccess: () => { toast.success("Pedido atualizado"); void qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: error => toast.error(error instanceof Error ? error.message : "Não foi possível atualizar"),
  });
  const rows = (q.data || []).filter((o: any) => {
    const matches = !search || `${o.order_number} ${o.customer_name} ${o.email}`.toLowerCase().includes(search.toLowerCase());
    return matches && (filter === "all" || (filter === "refund" ? o.refund_status === "requested" : o.delivery_status === filter));
  }).sort((a: any,b: any) => Number(b.refund_status === "requested") - Number(a.refund_status === "requested"));
  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">Lista de Pedidos</h1><p className="text-sm text-muted-foreground">Acompanhe entrega, retirada e reembolso. Pedidos entregues continuam disponíveis para edição.</p></div>
    <div className="flex flex-wrap gap-3"><Input className="max-w-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar pedido ou cliente" />
      <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="all">Todos os pedidos</SelectItem><SelectItem value="refund">Reembolsos solicitados</SelectItem>
        {Object.entries(DELIVERY_LABELS).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
      </SelectContent></Select>
    </div>
    {orderId && <Link to="/admin/vendas/pedidos" search={{ orderId: undefined }} className="text-sm underline">Ver todos os pedidos</Link>}
    {q.error && <p role="alert" className="text-destructive">{(q.error as Error).message}</p>}
    {q.isLoading && <p>Carregando pedidos...</p>}
    {q.error && <p role="alert" className="text-destructive">{(q.error as Error).message}</p>}
    {!q.isLoading && !rows.length && <p className="rounded-lg border p-6 text-muted-foreground">Nenhum pedido encontrado.</p>}
    {rows.map((o: any) => <div key={o.id} className={`rounded-lg border p-4 space-y-4 ${o.refund_status === "requested" ? "border-red-500 bg-red-50" : "bg-card"}`}>
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{o.order_number}</h2><p className="text-xs text-muted-foreground">{o.customer_name} · {o.email}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p></div><div className="text-right"><p className="font-bold">{formatBRL(Number(o.total))}</p>{o.refund_status === "requested" && <Badge variant="destructive">Reembolso solicitado</Badge>}</div></div>
      <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
        <p><strong>Vendedor:</strong> {o.seller_name || "Nenhum vendedor"}</p>
        {!isPickup(o) && <p><strong>Endereço:</strong> {[o.rua, o.numero, o.complemento, o.bairro, o.cidade, o.estado, o.cep].filter(Boolean).join(", ")}</p>}
        {o.referencia_entrega && <p><strong>Referência para entrega:</strong> {o.referencia_entrega}</p>}
        {o.pessoa_autorizada && <p><strong>Pessoa autorizada a receber:</strong> {o.pessoa_autorizada}</p>}
      </div>
      <OrderFulfillment order={o} />
      <div className="flex flex-wrap gap-3">
        {isPickup(o) && <div className="space-y-1"><p className="text-xs font-medium">Unidade de retirada</p><Select disabled={mutation.isPending} value={o.pickup_location || ""} onValueChange={value => mutation.mutate({ orderId: o.id, pickupLocation: value as PickupLocation })}><SelectTrigger className="w-72 max-w-full"><SelectValue placeholder="Escolha a unidade" /></SelectTrigger><SelectContent>{Object.entries(PICKUP_LOCATIONS).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>}
        <div className="space-y-1"><p className="text-xs font-medium">Status do pedido</p><Select disabled={mutation.isPending || o.refund_status !== "none"} value={o.delivery_status} onValueChange={value => mutation.mutate({ orderId: o.id, status: value as DeliveryStatus, pickupLocation: o.pickup_location || undefined })}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{o.delivery_status === "cancelada" && <SelectItem value="cancelada" disabled>Entrega cancelada</SelectItem>}{Object.entries(DELIVERY_LABELS).filter(([value]) => value !== "cancelada" && (isPickup(o) ? value !== "a_caminho" : value !== "pronto")).map(([value,label]) => <SelectItem key={value} value={value} disabled={value === "pronto" && (!o.pickup_location || o.payment_status !== "approved")}>{label}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <OrderCancellation order={o} admin />
      {!isPickup(o) && o.delivery_status !== "cancelada" && o.refund_status === "none" && <OrderShippingPanel order={o} />}
    </div>)}
  </div>;
}
