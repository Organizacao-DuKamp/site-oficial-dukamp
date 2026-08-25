import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useCart, formatBRL } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, MessageCircle, Loader2, Truck } from "lucide-react";
import { useSiteSettings, whatsappLink } from "@/lib/site-settings";
import { useAuth } from "@/lib/auth";
import { calculateShipping } from "@/lib/checkout.functions";
import { calculateDukampShipping } from "@/lib/dukamp-shipping.functions";
import { calculateCartTax } from "@/lib/tax.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  ssr: false,
  head: () => ({ meta: [{ title: "Meu carrinho — Dukamp" }] }),
  component: CarrinhoPage,
});

type Freight = {
  valor: number;
  prazoDias?: number;
  servico: string;
};

type CepInfo = {
  uf: string;
  latitude?: number;
  longitude?: number;
};

async function lookupCep(cep: string): Promise<CepInfo> {
  const digits = cep.replace(/\D/g, "");
  const [brasilApi, viaCep] = await Promise.allSettled([
    fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`).then(async (response) => {
      if (!response.ok) throw new Error("BrasilAPI indisponível");
      const data = await response.json() as any;
      return {
        uf: String(data.state || "").toUpperCase(),
        latitude: Number(data.location?.coordinates?.latitude),
        longitude: Number(data.location?.coordinates?.longitude),
      };
    }),
    fetch(`https://viacep.com.br/ws/${digits}/json/`).then(async (response) => {
      if (!response.ok) throw new Error("ViaCEP indisponível");
      const data = await response.json() as any;
      if (data.erro) throw new Error("CEP não encontrado");
      return { uf: String(data.uf || "").toUpperCase() };
    }),
  ]);

  const first = brasilApi.status === "fulfilled" ? brasilApi.value : null;
  const fallback = viaCep.status === "fulfilled" ? viaCep.value : null;
  const uf = first?.uf || fallback?.uf || "";
  if (uf.length !== 2) throw new Error("Não foi possível identificar a UF desse CEP.");

  return {
    uf,
    latitude: Number.isFinite(first?.latitude) ? first?.latitude : undefined,
    longitude: Number.isFinite(first?.longitude) ? first?.longitude : undefined,
  };
}

function CarrinhoPage() {
  const { items, setQty, remove, clear, total, count } = useCart();
  const { data: settings } = useSiteSettings();
  const { accountType } = useAuth();
  const calcCorreios = useServerFn(calculateShipping);
  const calcDukamp = useServerFn(calculateDukampShipping);
  const calcTax = useServerFn(calculateCartTax);

  const [cep, setCep] = useState("");
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [frete, setFrete] = useState<Freight | null>(null);
  const [taxAmount, setTaxAmount] = useState<number | null>(null);
  const [destinationUf, setDestinationUf] = useState("");

  const cartSignature = useMemo(
    () => items.map((item) => `${item.id}:${item.quantity}:${item.price}`).join("|"),
    [items],
  );

  useEffect(() => {
    setFrete(null);
    setTaxAmount(null);
    setDestinationUf("");
  }, [cartSignature]);

  const grandTotal = total + (frete?.valor ?? 0) + (taxAmount ?? 0);

  async function calculateFreightAndTaxes() {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }
    if (!items.length) return;

    setLoadingCalculation(true);
    setFrete(null);
    setTaxAmount(null);
    setDestinationUf("");

    try {
      const info = await lookupCep(digits);
      const itemPayload = items.map((item) => ({ product_id: item.id, quantity: item.quantity }));
      let selectedFreight: Freight | null = null;

      if (info.latitude != null && info.longitude != null) {
        try {
          const ownFreight = await calcDukamp({
            data: {
              items: itemPayload,
              latitude: info.latitude,
              longitude: info.longitude,
            },
          }) as any;
          if (ownFreight?.option) selectedFreight = ownFreight.option as Freight;
        } catch (error) {
          console.error("[Carrinho] Frete Dukamp indisponível", error);
        }
      }

      if (!selectedFreight) {
        const correios = await calcCorreios({
          data: { cepDestino: digits, items: itemPayload },
        }) as any;
        const options = (correios?.opcoes ?? [correios]).filter(Boolean) as Freight[];
        if (!options.length) throw new Error("Nenhuma opção de frete disponível para esse CEP.");
        selectedFreight = [...options].sort((a, b) => a.valor - b.valor)[0];
      }

      const taxes = await calcTax({
        data: {
          destinationUf: info.uf,
          accountType: accountType === "produtor" ? "produtor" : "cliente",
          items: itemPayload,
        },
      }) as any;

      setFrete(selectedFreight);
      setTaxAmount(Number(taxes.taxAmount ?? 0));
      setDestinationUf(info.uf);
      toast.success(`Frete e impostos calculados para ${info.uf}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível calcular frete e impostos.";
      toast.error(message, { duration: 9000 });
    } finally {
      setLoadingCalculation(false);
    }
  }

  function finalizar() {
    if (items.length === 0) return;
    const linhas = items
      .map(
        (item) =>
          `• ${item.name} — ${item.quantity}× ${formatBRL(item.price)} = ${formatBRL(item.price * item.quantity)}`,
      )
      .join("\n");
    const extras = frete && taxAmount != null
      ? `\nFrete (${frete.servico}): ${formatBRL(frete.valor)}\nImpostos (ICMS): ${formatBRL(taxAmount)}${destinationUf ? ` — ${destinationUf}` : ""}`
      : "";
    const msg = `Olá! Gostaria de finalizar o pedido:\n\n${linhas}${extras}\n\nTotal: ${formatBRL(grandTotal)}`;
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
          <p className="text-sm text-muted-foreground mt-2">Adicione produtos para continuar com sua compra.</p>
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
          {items.map((item) => {
            const subtotal = item.price * item.quantity;
            return (
              <div key={item.id} className="flex gap-4 p-3 border rounded-lg bg-card">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded bg-muted shrink-0 overflow-hidden">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium line-clamp-2 text-sm sm:text-base">{item.name}</div>
                    <button
                      onClick={() => remove(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Remover"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Unidade: {formatBRL(item.price)}</div>

                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <div className="inline-flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Diminuir"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          if (raw === "") {
                            setQty(item.id, 1);
                            return;
                          }
                          const n = parseInt(raw, 10);
                          if (Number.isFinite(n) && n > 0) setQty(item.id, n);
                        }}
                        onBlur={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          setQty(item.id, Number.isFinite(n) && n > 0 ? n : 1);
                        }}
                        className="h-8 w-14 text-center border-0 focus-visible:ring-0 px-0"
                        inputMode="numeric"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty(item.id, item.quantity + 1)}
                        aria-label="Aumentar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="font-semibold text-sm sm:text-base">{formatBRL(subtotal)}</div>
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
          <div className="border rounded-lg bg-card p-4 sticky top-4 space-y-4">
            <h2 className="font-semibold">Resumo do pedido</h2>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value);
                    setFrete(null);
                    setTaxAmount(null);
                    setDestinationUf("");
                  }}
                  placeholder="CEP de entrega"
                  inputMode="numeric"
                  maxLength={9}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateFreightAndTaxes}
                  disabled={loadingCalculation}
                  aria-label="Calcular frete e impostos"
                >
                  {loadingCalculation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                className="w-full"
                variant="secondary"
                onClick={calculateFreightAndTaxes}
                disabled={loadingCalculation}
              >
                {loadingCalculation ? "Calculando..." : "Calcular frete"}
              </Button>
            </div>

            <div className="text-sm space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({count} {count === 1 ? "item" : "itens"})</span>
                <span>{formatBRL(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground gap-3">
                <span>Frete{frete?.servico ? ` (${frete.servico})` : ""}</span>
                <span>{frete ? formatBRL(frete.valor) : "Calcular pelo CEP"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Impostos (ICMS){destinationUf ? ` · ${destinationUf}` : ""}</span>
                <span>{taxAmount != null ? formatBRL(taxAmount) : "Calculado com o frete"}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatBRL(grandTotal)}</span>
              </div>
            </div>

            <Button className="w-full" asChild>
              <Link to="/checkout">Finalizar compra</Link>
            </Button>
            <Button className="w-full" variant="outline" onClick={finalizar}>
              <MessageCircle className="h-4 w-4" /> Finalizar pelo WhatsApp
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              O imposto é calculado por produto conforme o código tributário 000/040 e a UF de entrega.
            </p>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
