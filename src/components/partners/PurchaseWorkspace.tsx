import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Calculator, Plus, Trash2, Truck, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { quotePartnerPurchase, partnerQuoteSchema } from "@/lib/partners.functions";
import {
  createPixOrder,
  computePaymentTotals,
  CARD_FEE_TABLE,
  type CardInstallments,
} from "@/lib/checkout.functions";
import { partnerQuoteFingerprint, type PartnerCartItem } from "@/lib/partners";
import { lookupCepWithFallback } from "@/lib/cep";
import { formatBRL } from "@/lib/cart";
import { readProductOptions } from "@/lib/product-options";
import { usePartnerProducts } from "./PartnerUi";
import {
  usePurchaseDraft,
  emptyPartnerAddress as emptyAddress,
  type PartnerCartLine as CartLine,
} from "./PurchaseDraft";
import { PageHeading, Field, fieldClass, ErrorNotice, EmptyState } from "./PartnerUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const emptyCustomer = {
  customer_name: "",
  cpf_cnpj: "",
  email: "",
  phone: "",
  referencia_entrega: "",
  pessoa_autorizada: "",
};
type Quote = Awaited<ReturnType<typeof quotePartnerPurchase>>;
export function PurchaseWorkspace({
  mode,
  initialProduct,
}: {
  mode: "simulate" | "register";
  initialProduct?: string;
}) {
  const query = usePartnerProducts();
  const navigate = useNavigate();
  const calculate = useServerFn(quotePartnerPurchase);
  const createOrder = useServerFn(createPixOrder);
  const {
    cart,
    setCart,
    address,
    setAddress,
    fulfillment,
    setFulfillment,
    coordinates,
    setCoordinates,
  } = usePurchaseDraft();
  const initialProductApplied = useRef(false);
  useEffect(() => {
    if (!initialProduct || initialProductApplied.current) return;
    initialProductApplied.current = true;
    setCart((current) =>
      current.some((item) => item.product_id === initialProduct)
        ? current
        : [
            ...current,
            {
              key: crypto.randomUUID(),
              product_id: initialProduct,
              quantity: 1,
              selected_options: [],
            },
          ],
    );
  }, [initialProduct, setCart]);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [extra, setExtra] = useState({
    inscricao_estadual: "",
    contato: "",
    telefone_alternativo: "",
    propriedade: "",
    observacoes: "",
  });
  const [billing, setBilling] = useState(emptyAddress);
  const [differentBilling, setDifferentBilling] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<"pix" | "boleto" | "card">("pix");
  const [installments, setInstallments] = useState<CardInstallments>(1);
  const [now, setNow] = useState(Date.now());
  const input = {
    ...address,
    items: cart.map(({ key, ...item }) => item),
    fulfillment_method: fulfillment,
    ...(coordinates.latitude !== "" && coordinates.longitude !== ""
      ? { latitude: Number(coordinates.latitude), longitude: Number(coordinates.longitude) }
      : {}),
  };
  const inputKey = partnerQuoteFingerprint(input) + JSON.stringify(coordinates);
  const latestInputKey = useRef(inputKey);
  latestInputKey.current = inputKey;
  const lastCalculation = useRef(0);
  useEffect(() => {
    setQuote(null);
  }, [inputKey]);
  useEffect(() => {
    if (!quote) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [quote]);
  const expired = !!quote && Date.parse(quote.expires_at) <= now;
  const payment = quote
    ? computePaymentTotals(quote.net, method, method === "card" ? installments : null)
    : null;
  const products = query.data || [];
  const filtered = products
    .filter(
      (p) =>
        p.stock > 0 &&
        p.price > 0 &&
        `${p.name} ${p.code || ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
    )
    .slice(0, 8);
  const subtotal = cart.reduce(
    (sum, item) =>
      sum + (products.find((p) => p.id === item.product_id)?.price || 0) * item.quantity,
    0,
  );
  function addProduct(id: string) {
    setCart((current) => [
      ...current,
      { key: crypto.randomUUID(), product_id: id, quantity: 1, selected_options: [] },
    ]);
  }
  function changeLine(key: string, changes: Partial<CartLine>) {
    setCart((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  }
  async function lookup() {
    const cep = address.cep.replace(/\D/g, "");
    if (cep.length !== 8) return toast.error("Informe um CEP com 8 dígitos.");
    setLookupBusy(true);
    try {
      const result = await lookupCepWithFallback(cep);
      if (latestInputKey.current !== inputKey) return;
      setAddress((old) => ({
        ...old,
        ...Object.fromEntries(
          Object.entries(result).filter(([key, value]) => key !== "coordinates" && !!value),
        ),
      }));
      setCoordinates(
        result.coordinates
          ? {
              latitude: String(result.coordinates.latitude),
              longitude: String(result.coordinates.longitude),
            }
          : { latitude: "", longitude: "" },
      );
      toast.success("Endereço localizado. Confira número e complemento.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLookupBusy(false);
    }
  }
  async function simulate(service?: string) {
    if (busy) return;
    const calculation = ++lastCalculation.current;
    const key = inputKey;
    setQuote(null);
    setBusy(true);
    try {
      const data = partnerQuoteSchema.parse({ ...input, shipping_service: service });
      const result = await calculate({ data });
      if (latestInputKey.current !== key || calculation !== lastCalculation.current) return;
      setQuote(result);
      setNow(Date.now());
      toast.success("Simulação calculada com preços e frete atuais.");
    } catch (e) {
      toast.error(e instanceof z.ZodError ? e.issues[0].message : (e as Error).message);
    } finally {
      if (calculation === lastCalculation.current) setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "simulate") return void simulate();
    if (!quote || expired) return toast.error("Calcule uma simulação válida antes de registrar.");
    if (busy) return;
    setBusy(true);
    try {
      const result = await createOrder({
        data: {
          ...address,
          ...customer,
          partner_quote_id: quote.id,
          partner_customer_details: {
            ...extra,
            ...(differentBilling ? { cobranca: billing } : {}),
          },
          items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            selected_options: item.selected_options,
            unit_price: products.find((p) => p.id === item.product_id)?.price || 0,
          })),
          shipping_cost: quote.shipping.valor,
          shipping_service: quote.shipping.servico,
          shipping_deadline_days: quote.shipping.prazoDias,
          fulfillment_method: fulfillment,
          payment_method: method,
          card_installments: method === "card" ? installments : undefined,
        },
      });
      await navigate({ to: "/parceiro/vendas/$id", params: { id: result.orderId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const addressField = (key: keyof typeof address, label: string, required = true) => (
    <Field key={key} label={label} required={required}>
      <Input
        required={required}
        maxLength={key === "estado" ? 2 : 200}
        value={address[key]}
        onChange={(e) => {
          setAddress({ ...address, [key]: e.target.value });
          if (key === "cep") setCoordinates({ latitude: "", longitude: "" });
        }}
      />
    </Field>
  );
  return (
    <>
      <PageHeading
        title={mode === "simulate" ? "Simular compra" : "Registrar compra"}
        description={
          mode === "simulate"
            ? "Monte o pedido, informe o endereço e consulte o total, o frete e sua comissão."
            : "Preencha os dados essenciais do cliente e gere um pagamento para a conta da Dukamp."
        }
      />
      {query.isPending ? (
        <p>Carregando produtos...</p>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => query.refetch()} />
      ) : (
        <form
          onSubmit={submit}
          className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
        >
          <div className="min-w-0 space-y-6">
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <ShoppingCart className="h-5 w-5 text-primary" />
                1. Produtos do pedido
              </h2>
              <Input
                aria-label="Buscar produto para adicionar"
                placeholder="Buscar produto ou código para adicionar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="my-3 grid gap-2 sm:grid-cols-2">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p.id)}
                    className="flex items-center gap-3 rounded-lg border p-3 text-left text-sm hover:border-primary/40"
                  >
                    {p.images?.[0] && (
                      <img className="h-10 w-10 shrink-0 object-contain" src={p.images[0]} alt="" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatBRL(p.price)} · {p.stock} em estoque
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                ))}
              </div>
              {!cart.length ? (
                <EmptyState>Adicione os produtos que o cliente deseja comprar.</EmptyState>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const product = products.find((p) => p.id === item.product_id);
                    return (
                      <div key={item.key} className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-40 flex-1">
                            <p className="text-sm font-medium">
                              {product?.name || "Produto indisponível"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBRL(product?.price || 0)} por unidade · estoque{" "}
                              {product?.stock ?? 0}
                            </p>
                          </div>
                          <Field label="Quantidade">
                            <Input
                              aria-label={`Quantidade de ${product?.name || "produto"}`}
                              className="w-24"
                              type="number"
                              min={1}
                              max={product?.stock || 1}
                              required
                              value={item.quantity}
                              onChange={(e) =>
                                changeLine(item.key, { quantity: Number(e.target.value) })
                              }
                            />
                          </Field>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover ${product?.name || "produto"}`}
                            onClick={() => setCart(cart.filter((i) => i.key !== item.key))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {readProductOptions(product?.options).map((option) => (
                            <Field key={option.id} label={option.name} required>
                              <select
                                className={fieldClass}
                                required
                                value={
                                  item.selected_options.find((c) => c.option_id === option.id)
                                    ?.value_id || ""
                                }
                                onChange={(e) =>
                                  changeLine(item.key, {
                                    selected_options: [
                                      ...item.selected_options.filter(
                                        (c) => c.option_id !== option.id,
                                      ),
                                      { option_id: option.id, value_id: e.target.value },
                                    ],
                                  })
                                }
                              >
                                <option value="">Selecione uma opção</option>
                                {option.values.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            {mode === "register" && (
              <section className="rounded-xl border bg-card p-5">
                <h2 className="mb-2 font-semibold">2. Ficha do cliente</h2>
                <p className="mb-4 text-xs text-muted-foreground">
                  Nome, CPF/CNPJ, e-mail e telefone são necessários para cobrança, nota e entrega.
                  Os demais dados da ficha são opcionais.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["customer_name", "Nome completo / razão social"],
                    ["cpf_cnpj", "CPF / CNPJ"],
                    ["email", "E-mail"],
                    ["phone", "Telefone / celular"],
                  ].map(([key, label]) => (
                    <Field key={key} label={label} required>
                      <Input
                        required
                        type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                        maxLength={key === "customer_name" ? 120 : 200}
                        value={customer[key as keyof typeof customer]}
                        onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                      />
                    </Field>
                  ))}
                </div>
                <details className="mt-5 rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Informações complementares (opcionais)
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      ["inscricao_estadual", "Inscrição estadual"],
                      ["contato", "Pessoa de contato"],
                      ["telefone_alternativo", "Telefone alternativo"],
                      ["propriedade", "Nome da propriedade"],
                    ].map(([key, label]) => (
                      <Field key={key} label={label}>
                        <Input
                          maxLength={160}
                          value={extra[key as keyof typeof extra]}
                          onChange={(e) => setExtra({ ...extra, [key]: e.target.value })}
                        />
                      </Field>
                    ))}
                    <Field label="Observações">
                      <textarea
                        className={`${fieldClass} min-h-20 py-2`}
                        maxLength={2000}
                        value={extra.observacoes}
                        onChange={(e) => setExtra({ ...extra, observacoes: e.target.value })}
                      />
                    </Field>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={differentBilling}
                      onChange={(e) => setDifferentBilling(e.target.checked)}
                    />
                    Endereço de cobrança diferente da entrega
                  </label>
                  {differentBilling && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {[
                        ["cep", "CEP de cobrança"],
                        ["rua", "Rua de cobrança"],
                        ["numero", "Número"],
                        ["bairro", "Bairro"],
                        ["cidade", "Cidade"],
                        ["estado", "UF"],
                      ].map(([key, label]) => (
                        <Field key={key} label={label}>
                          <Input
                            maxLength={key === "estado" ? 2 : 200}
                            value={billing[key as keyof typeof billing]}
                            onChange={(e) => setBilling({ ...billing, [key]: e.target.value })}
                          />
                        </Field>
                      ))}
                    </div>
                  )}
                </details>
              </section>
            )}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Truck className="h-5 w-5 text-primary" />
                {mode === "register" ? "3" : "2"}. Endereço e entrega
              </h2>
              <Field label="Modalidade">
                <select
                  value={fulfillment}
                  onChange={(e) => setFulfillment(e.target.value as "delivery" | "pickup")}
                  className={fieldClass}
                >
                  <option value="delivery">Entregar no endereço do cliente</option>
                  <option value="pickup">Retirada na loja Dukamp (sem frete)</option>
                </select>
              </Field>
              <div className="my-4 flex items-end gap-2">
                <div className="flex-1">{addressField("cep", "CEP")}</div>
                <Button type="button" variant="outline" onClick={lookup} disabled={lookupBusy}>
                  {lookupBusy ? "Buscando..." : "Buscar CEP"}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {addressField("rua", "Rua / estrada")}
                {addressField("numero", "Número / KM")}
                {addressField("bairro", "Bairro")}
                {addressField("cidade", "Cidade")}
                {addressField("estado", "Estado (UF)")}
                {addressField("complemento", "Complemento", false)}
                {mode === "register" && (
                  <>
                    {[
                      ["referencia_entrega", "Referência de entrega"],
                      ["pessoa_autorizada", "Pessoa autorizada a receber"],
                    ].map(([key, label]) => (
                      <Field key={key} label={label}>
                        <Input
                          maxLength={key === "referencia_entrega" ? 300 : 120}
                          value={customer[key as keyof typeof customer]}
                          onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                        />
                      </Field>
                    ))}
                  </>
                )}
              </div>
              {fulfillment === "delivery" && (
                <details className="mt-5 rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Localização exata para Frete Dukamp
                  </summary>
                  <p className="my-3 text-xs text-muted-foreground">
                    Para sacarias Dukamp, informe latitude e longitude do destino, principalmente em
                    propriedades rurais. A cotação usa a mesma tabela de distância do checkout.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Latitude">
                      <Input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        placeholder="Ex.: -20.76411"
                        value={coordinates.latitude}
                        onChange={(e) =>
                          setCoordinates({ ...coordinates, latitude: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Longitude">
                      <Input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        placeholder="Ex.: -49.7095"
                        value={coordinates.longitude}
                        onChange={(e) =>
                          setCoordinates({ ...coordinates, longitude: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                </details>
              )}
              <Button
                type="button"
                variant="outline"
                className="mt-5"
                onClick={() => simulate()}
                disabled={busy || !cart.length}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {busy ? "Calculando..." : "Calcular produtos + frete"}
              </Button>
            </section>
          </div>
          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-5 font-semibold">Resumo da compra</h2>
              <div className="space-y-3 text-sm">
                <Row label="Produtos" value={formatBRL(quote?.subtotal ?? subtotal)} />
                <Row label="Frete" value={quote ? formatBRL(quote.shipping.valor) : "A calcular"} />
                {quote && (
                  <>
                    <p className="rounded-lg bg-muted p-3 text-xs">
                      {quote.shipping.servico} ·{" "}
                      {quote.shipping.prazoDias > 0
                        ? `até ${quote.shipping.prazoDias} dias úteis`
                        : "prazo a confirmar com a Dukamp"}
                    </p>
                    {quote.options.length > 1 && (
                      <Field label="Opção de frete">
                        <select
                          disabled={busy}
                          className={fieldClass}
                          value={quote.shipping.servico}
                          onChange={(e) => simulate(e.target.value)}
                        >
                          {quote.options.map((o) => (
                            <option key={o.servico} value={o.servico}>
                              {o.servico} · {formatBRL(o.valor)} · {o.prazoDias} dias úteis
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Row label="Total comercial" value={formatBRL(quote.gross)} />
                    <Row label="Sua comissão (10%)" value={formatBRL(quote.commission)} />
                    <div className="border-t pt-3 font-semibold">
                      <Row label="Saldo à Dukamp" value={formatBRL(quote.net)} />
                    </div>
                  </>
                )}
              </div>
              <p className="mt-5 rounded-lg bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                A loja recebe o valor comercial do cliente, retém sua comissão e paga o saldo à
                Dukamp. A comissão descontada não gera um segundo repasse.
              </p>
              {quote && (
                <p
                  className={`mt-3 text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {expired
                    ? "Simulação expirada. Calcule novamente."
                    : `Simulação válida até ${new Date(quote.expires_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`}
                </p>
              )}
            </div>
            {mode === "register" ? (
              <div className="space-y-4 rounded-xl border bg-card p-5">
                <h2 className="font-semibold">Pagamento à Dukamp</h2>
                <Field label="Forma de pagamento">
                  <select
                    className={fieldClass}
                    value={method}
                    onChange={(e) => setMethod(e.target.value as typeof method)}
                  >
                    <option value="pix">Pix</option>
                    <option value="boleto">Boleto</option>
                    <option value="card">Cartão de crédito</option>
                  </select>
                </Field>
                {method === "card" && (
                  <Field label="Parcelamento">
                    <select
                      className={fieldClass}
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value) as CardInstallments)}
                    >
                      {([1, 2, 3] as const).map((n) => (
                        <option key={n} value={n}>
                          {n}x · taxa{" "}
                          {(CARD_FEE_TABLE[n] * 100).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          %
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {payment && (
                  <div className="space-y-2 text-sm">
                    {payment.feeAmount > 0 && (
                      <Row label="Taxa de cartão" value={formatBRL(payment.feeAmount)} />
                    )}
                    <div className="font-bold">
                      <Row label="Valor a pagar à Dukamp" value={formatBRL(payment.total)} />
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy || !quote || expired}>
                  {busy ? "Registrando..." : "Registrar e gerar pagamento"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  O pedido entra em produção após a confirmação do pagamento. Acompanhe o andamento
                  em Gerenciar vendas.
                </p>
              </div>
            ) : (
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate({ to: "/parceiro/registrar" })}
              >
                Continuar com esta compra
              </Button>
            )}
          </aside>
        </form>
      )}
    </>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span>{label}</span>
      <span className="whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}
