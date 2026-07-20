import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useSupport } from "@/lib/support";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { ShoppingCart, History, MessageCircle, LogOut } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Minha conta — Dukamp" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { items } = useCart();
  const { ticket, openChat, startTicket } = useSupport();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (isAdmin) nav({ to: "/admin" });
  }, [loading, user, isAdmin, nav]);

  if (loading || !user || isAdmin) return null;

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <SiteLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Minha conta</h1>
            <p className="text-sm text-muted-foreground">Olá, {user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg p-5 bg-card flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Meu carrinho</h2>
            </div>
            <p className="text-sm text-muted-foreground flex-1">
              {cartCount === 0 ? "Seu carrinho está vazio." : `${cartCount} item(s) no carrinho.`}
            </p>
            <Button asChild size="sm" className="mt-3 w-fit">
              <Link to={cartCount > 0 ? "/carrinho" : "/produtos"}>
                {cartCount > 0 ? "Ver carrinho" : "Ver produtos"}
              </Link>
            </Button>
          </div>

          <div className="border rounded-lg p-5 bg-card flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Histórico de compras</h2>
            </div>
            <div className="flex-1 text-sm text-muted-foreground">
              <div className="border rounded-md mt-2 divide-y">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex justify-between">
                  <span>Pedido</span><span>Status</span>
                </div>
                <div className="px-3 py-6 text-center text-xs">Nenhum pedido ainda.</div>
              </div>
              <p className="text-[11px] mt-2 italic">Em breve: integração com pedidos e pagamentos.</p>
            </div>
          </div>

          <div className="border rounded-lg p-5 bg-card flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Atendimento</h2>
            </div>
            <p className="text-sm text-muted-foreground flex-1">
              {ticket
                ? ticket.status === "closed"
                  ? "Seu último atendimento foi encerrado."
                  : "Você tem um atendimento em andamento."
                : "Fale com nossa equipe pelo chat."}
            </p>
            <div className="mt-3">
              {ticket && ticket.status !== "closed" ? (
                <Button size="sm" onClick={openChat}>Abrir chat</Button>
              ) : (
                <Button size="sm" onClick={() => startTicket().then(openChat)}>
                  Iniciar atendimento
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
