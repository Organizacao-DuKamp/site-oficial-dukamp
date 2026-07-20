import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListOrders, adminUpdateDeliveryStatus, type DeliveryStatus } from "@/lib/orders.functions";
import { Loader2, Package, Truck, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/vendas/pedidos")({
  component: PedidosAtivos,
});

const OPTIONS: Array<{ value: DeliveryStatus; label: string; icon: any }> = [
  { value: "preparando", label: "Preparando", icon: Package },
  { value: "a_caminho", label: "A caminho", icon: Truck },
  { value: "entregue", label: "Entregue", icon: CheckCircle2 },
];

function PedidosAtivos() {
  const fetchOrders = useServerFn(adminListOrders);
  const updateStatus = useServerFn(adminUpdateDeliveryStatus);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-orders", "open"],
    queryFn: () => fetchOrders({ data: { onlyOpen: true } }),
  });

  const m = useMutation({
    mutationFn: (v: { orderId: string; status: DeliveryStatus }) => updateStatus({ data: v }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Lista de Pedidos</h1>
        <p className="text-sm text-muted-foreground">Pedidos pagos aguardando entrega. Altere o status conforme o andamento.</p>
      </div>
      {q.isLoading && <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>}
      {q.data && q.data.length === 0 && (
        <div className="border rounded-lg p-8 text-center bg-card text-muted-foreground">
          Nenhum pedido em aberto no momento.
        </div>
      )}
      <div className="space-y-2">
        {q.data?.map((o) => (
          <div key={o.id} className="border rounded-lg p-4 bg-card flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="font-semibold">{o.order_number}</div>
              <div className="text-xs text-muted-foreground">{o.customer_name} — {o.cidade}/{o.estado}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{formatBRL(Number(o.total))}</div>
            </div>
            <div className="w-48">
              <Select
                value={o.delivery_status ?? "preparando"}
                onValueChange={(v) => m.mutate({ orderId: o.id, status: v as DeliveryStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPTIONS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      <span className="inline-flex items-center gap-2"><op.icon className="h-4 w-4" /> {op.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
