import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useServerFn } from "@tanstack/react-start";
import { listMyOrders } from "@/lib/orders.functions";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { formatBRL } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Truck, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/minhas-compras")({
  ssr: false,
  head: () => ({ meta: [{ title: "Minhas Compras — Dukamp" }] }),
  component: MyOrdersPage,
});

const DELIVERY_LABEL = {
  preparando: { label: "Preparando", icon: Package, color: "bg-amber-100 text-amber-800 border-amber-200" },
  a_caminho: { label: "A caminho", icon: Truck, color: "bg-blue-100 text-blue-800 border-blue-200" },
  entregue: { label: "Entregue", icon: CheckCircle2, color: "bg-green-100 text-green-800 border-green-200" },
} as const;

function MyOrdersPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const fetchOrders = useServerFn(listMyOrders);
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const q = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  if (loading || !user) {
    return <SiteLayout><div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Minhas Compras</h1>
        {q.isLoading && <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>}
        {q.data && q.data.length === 0 && (
          <div className="border rounded-lg p-8 text-center bg-card">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Você ainda não tem compras.</p>
            <Button asChild className="mt-4"><Link to="/produtos">Ver produtos</Link></Button>
          </div>
        )}
        <div className="space-y-3">
          {q.data?.map((o) => {
            const isApproved = o.payment_status === "approved";
            const dl = DELIVERY_LABEL[o.delivery_status as keyof typeof DELIVERY_LABEL] ?? DELIVERY_LABEL.preparando;
            const Icon = dl.icon;
            return (
              <Link
                key={o.id}
                to="/pedido/$id"
                params={{ id: o.id }}
                className="block border rounded-lg p-4 bg-card hover:border-primary transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">Pedido {o.order_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatBRL(Number(o.total))}</div>
                    <div className="text-xs text-muted-foreground uppercase">{o.payment_status}</div>
                  </div>
                </div>
                {isApproved && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${dl.color}`}>
                      <Icon className="h-3.5 w-3.5" /> {dl.label}
                    </span>
                    {o.delivered_at && (
                      <span className="text-xs text-muted-foreground">
                        em {new Date(o.delivered_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                )}
                {!isApproved && o.payment_status === "pending" && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
                    <Clock className="h-3.5 w-3.5" /> Aguardando pagamento
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </SiteLayout>
  );
}
