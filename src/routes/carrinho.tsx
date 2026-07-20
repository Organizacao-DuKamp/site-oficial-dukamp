import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useCart, formatBRL } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, MessageCircle } from "lucide-react";
import { useSiteSettings, whatsappLink } from "@/lib/site-settings";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  ssr: false,
  head: () => ({ meta: [{ title: "Meu carrinho — Dukamp" }] }),
  component: CarrinhoPage,
});

function CarrinhoPage() {
  const { items, setQty, remove, clear, total, count } = useCart();
  const { data: settings } = useSiteSettings();
  const nav = useNavigate();

  function finalizar() {
    if (items.length === 0) return;
    const linhas = items
      .map(
        (i) =>
          `• ${i.name} — ${i.quantity}× ${formatBRL(i.price)} = ${formatBRL(
            i.price * i.quantity,
          )}`,
      )
      .join("\n");
    const msg = `Olá! Gostaria de finalizar o pedido:\n\n${linhas}\n\nTotal: ${formatBRL(
      total,
    )}`;
    const url = whatsappLink(settings?.phone, msg);
    window.open(url, "_blank", "noopener");
    toast.success("Pedido enviado para o WhatsApp");
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="max-w-xl mx-auto text-center py-16">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted grid place-items-center mb-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Adicione produtos para continuar com sua compra.
          </p>
          <Button asChild className="mt-6">
            <Link to="/produtos">
              <ArrowLeft className="h-4 w-4" />
              Continuar comprando
            </Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meu carrinho</h1>
          <p className="text-sm text-muted-foreground">
            {count} {count === 1 ? "item" : "itens"} no carrinho
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clear();
            toast.success("Carrinho esvaziado");
          }}
        >
          <Trash2 className="h-4 w-4" /> Esvaziar
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((i) => {
            const subtotal = i.price * i.quantity;
            return (
              <div
                key={i.id}
                className="flex gap-4 p-3 border rounded-lg bg-card"
              >
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded bg-muted shrink-0 overflow-hidden">
                  {i.image && (
                    <img
                      src={i.image}
                      alt={i.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium line-clamp-2 text-sm sm:text-base">
                      {i.name}
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Remover"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Unidade: {formatBRL(i.price)}
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <div className="inline-flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty(i.id, i.quantity - 1)}
                        disabled={i.quantity <= 1}
                        aria-label="Diminuir"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="text"
                        value={i.quantity}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          if (raw === "") {
                            setQty(i.id, 1);
                            return;
                          }
                          const n = parseInt(raw, 10);
                          if (Number.isFinite(n) && n > 0) setQty(i.id, n);
                        }}
                        onBlur={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          setQty(i.id, Number.isFinite(n) && n > 0 ? n : 1);
                        }}
                        className="h-8 w-14 text-center border-0 focus-visible:ring-0 px-0"
                        inputMode="numeric"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty(i.id, i.quantity + 1)}
                        aria-label="Aumentar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="font-semibold text-sm sm:text-base">
                      {formatBRL(subtotal)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button variant="outline" asChild className="mt-2">
            <Link to="/produtos">
              <ArrowLeft className="h-4 w-4" /> Continuar comprando
            </Link>
          </Button>
        </div>

        <aside className="lg:col-span-1">
          <div className="border rounded-lg bg-card p-4 sticky top-4 space-y-3">
            <h2 className="font-semibold">Resumo do pedido</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({count} {count === 1 ? "item" : "itens"})</span>
                <span>{formatBRL(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>A combinar</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>
            <Button className="w-full" asChild>
              <Link to="/checkout">Finalizar compra</Link>
            </Button>
            <Button className="w-full" variant="outline" onClick={finalizar}>
              <MessageCircle className="h-4 w-4" /> Finalizar pelo WhatsApp
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              No checkout você calcula frete pelos Correios e paga com Pix (Mercado Pago).
            </p>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
