import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListOrders } from "@/lib/orders.functions";
import { Loader2 } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/vendas/historico")({
  component: HistoricoVendas,
});

const DELIVERY_LABEL: Record<string, { label: string; className: string }> = {
  preparando: { label: "Preparando", className: "bg-amber-100 text-amber-900" },
  a_caminho: { label: "A caminho", className: "bg-blue-100 text-blue-900" },
  entregue: { label: "Entregue", className: "bg-green-100 text-green-900" },
};

function HistoricoVendas() {
  const fetchOrders = useServerFn(adminListOrders);
  const q = useQuery({
    queryKey: ["admin-orders", "all"],
    queryFn: () => fetchOrders({ data: {} }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Vendas</h1>
        <p className="text-sm text-muted-foreground">Todas as vendas registradas.</p>
      </div>
      {q.isLoading && <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>}
      <div className="border rounded-lg overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3">Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Data</th>
              <th className="p-3">Pagamento</th>
              <th className="p-3">Entrega</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((o) => {
              const dl = DELIVERY_LABEL[o.delivery_status] ?? DELIVERY_LABEL.preparando;
              return (
                <tr key={o.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3">
                    <div>{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.cidade}/{o.estado}</div>
                  </td>
                  <td className="p-3 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3">
                    <Badge variant={o.payment_status === "approved" ? "default" : "secondary"} className="uppercase text-[10px]">
                      {o.payment_status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${dl.className}`}>{dl.label}</span>
                  </td>
                  <td className="p-3 text-right font-semibold">{formatBRL(Number(o.total))}</td>
                </tr>
              );
            })}
            {q.data && q.data.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma venda ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
