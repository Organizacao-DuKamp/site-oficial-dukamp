import { PartnerRequestDetails } from "./PartnerRequestDetails";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, CreditCard, Clock, Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { partnerSale } from "@/lib/partners.functions";
import { createPixOrder, getMpPublicKey, processCardPayment } from "@/lib/checkout.functions";
import {
  partnerDeliveryLabels,
  partnerPaymentLabels,
  type PartnerOrder,
  type PartnerOrderItem,
} from "@/lib/partners";
import { choicesForSelections, selectionSummary } from "@/lib/product-options";
import { formatBRL } from "@/lib/cart";
import { ErrorNotice } from "./PartnerUi";
import { Button } from "@/components/ui/button";

export function PartnerSaleDetails({
  orderId,
  admin = false,
}: {
  orderId: string;
  admin?: boolean;
}) {
  const { user } = useAuth();
  const fetch = useServerFn(partnerSale);
  const client = useQueryClient();
  const retryPayment = useServerFn(createPixOrder);
  const [retrying, setRetrying] = useState(false);
  const query = useQuery({
    queryKey: ["partner-sale", user?.id, admin, orderId],
    queryFn: () => fetch({ data: { id: orderId, admin } }),
    enabled: !!user,
    refetchInterval: (q) =>
      ["pending", "in_process"].includes(q.state.data?.payment_status ?? "") ? 8000 : false,
  });
  const status = query.data?.payment_status;
  useEffect(() => {
    if (!status) return;
    void Promise.all([
      client.invalidateQueries({ queryKey: ["partner-sales"] }),
      client.invalidateQueries({ queryKey: ["partner-area"] }),
      client.invalidateQueries({ queryKey: ["admin-partners"] }),
    ]);
  }, [status, client]);
  if (query.isPending) return <p>Carregando pedido...</p>;
  if (query.error) return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const o = query.data;
  if (o.request_kind === "approval") return <PartnerRequestDetails key={o.id} order={o} admin={admin} refresh={() => query.refetch()} />;
  const paid = o.payment_status === "approved";
  const stopped =
    ["rejected", "cancelled", "refunded"].includes(o.payment_status) ||
    o.delivery_status === "cancelada";
  const extra = o.partner_customer_details || {};
  async function retry() {
    setRetrying(true);
    try {
      await retryPayment({
        data: {
          ...o,
          items: o.order_items.map((item: PartnerOrderItem) => ({
            ...item,
            selected_options: choicesForSelections(item.selected_options),
          })),
          card_installments: o.card_installments ?? undefined,
        },
      });
      await query.refetch();
      toast.success("Pagamento gerado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRetrying(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Pedido {o.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(o.created_at).toLocaleString("pt-BR")} · {o.partner_name}
          </p>
        </div>
        <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
          Atualizar
        </Button>
      </div>
      {paid && !stopped ? (
        <div role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <CheckCircle2 className="mb-3 h-8 w-8 text-primary" />
          <h2 className="text-lg font-semibold">
            Pedido realizado com sucesso. Agora é por nossa conta!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O pagamento foi confirmado e a Dukamp cuidará da preparação e da entrega. Você pode
            acompanhar o processo em Gerenciar vendas.
          </p>
        </div>
      ) : (
        <div role="status" className="rounded-xl border bg-card p-5">
          <Clock className="mb-3 h-6 w-6 text-muted-foreground" />
          <h2 className="font-semibold">
            {partnerPaymentLabels[o.payment_status] || o.payment_status}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {stopped
              ? "Esta venda não gera comissão. Consulte a Dukamp para orientações."
              : "O pedido será confirmado após a aprovação do pagamento na conta da Dukamp."}
          </p>
        </div>
      )}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Andamento da venda</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { key: "preparando", label: "Preparando", icon: Package },
            {
              key: o.fulfillment_method === "pickup" ? "pronto" : "a_caminho",
              label: o.fulfillment_method === "pickup" ? "Pronto para retirada" : "Enviado",
              icon: Truck,
            },
            { key: "entregue", label: "Entregue", icon: CheckCircle2 },
          ].map((step, index) => {
            const progress =
              o.delivery_status === "entregue"
                ? 2
                : ["a_caminho", "pronto"].includes(o.delivery_status)
                  ? 1
                  : 0;
            return (
              <div
                key={step.key}
                className={`rounded-lg p-3 text-center text-xs ${paid && !stopped && progress >= index ? "bg-primary/10 font-medium text-primary" : "bg-muted text-muted-foreground"}`}
              >
                <step.icon className="mx-auto mb-2 h-5 w-5" />
                {step.label}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {stopped
            ? "Pedido cancelado ou pagamento encerrado."
            : paid
              ? `Situação atual: ${partnerDeliveryLabels[o.delivery_status] || o.delivery_status}. Atualizada pela Dukamp.`
              : "Aguardando pagamento antes da preparação."}
          {o.tracking_code && ` Rastreio: ${o.tracking_code}.`}
        </p>
        {o.cancellation_reason && <p className="mt-2 text-sm">Motivo: {o.cancellation_reason}</p>}
      </div>
      {!admin && !o.origin_store_id && !paid && !stopped && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">
            Pagamento à Dukamp · {formatBRL(Number(o.total))}
          </h2>
          {o.payment_method === "card" ? (
            <PartnerCardPayment order={o} onUpdate={() => query.refetch()} />
          ) : o.payment_method === "pix" && o.mp_qr_code ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Escaneie o QR Code ou copie o código Pix. A confirmação será atualizada
                automaticamente.
              </p>
              {o.mp_qr_code_base64 && (
                <img
                  className="mx-auto mb-4 h-56 w-56 max-w-full"
                  src={`data:image/png;base64,${o.mp_qr_code_base64}`}
                  alt="QR Code Pix para pagamento do pedido"
                />
              )}
              <CopyCode value={o.mp_qr_code} label="Pix copia e cola" />
              {o.mp_expires_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Validade: {new Date(o.mp_expires_at).toLocaleString("pt-BR")}. Se expirar,
                  consulte a Dukamp antes de efetuar o pagamento.
                </p>
              )}
            </>
          ) : o.payment_method === "boleto" && o.mp_ticket_url ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                O boleto pode levar até 2 dias úteis para compensar após o pagamento.
              </p>
              {/^https:\/\//i.test(o.mp_ticket_url) && (
                <Button asChild>
                  <a href={o.mp_ticket_url} target="_blank" rel="noopener noreferrer">
                    Abrir boleto
                  </a>
                </Button>
              )}
              {o.mp_qr_code && (
                <div className="mt-4">
                  <CopyCode value={o.mp_qr_code} label="Linha digitável" />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                A geração do pagamento ainda não foi concluída. Tente novamente para este mesmo
                pedido.
              </p>
              <Button onClick={retry} disabled={retrying}>
                {retrying ? "Gerando..." : "Tentar gerar pagamento"}
              </Button>
            </div>
          )}
        </div>
      )}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Produtos e valores</h2>
        <div className="divide-y">
          {o.order_items?.map((item: PartnerOrderItem) => (
            <div key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div>
                <p>
                  {item.quantity}× {item.name}
                </p>
                {selectionSummary(item.selected_options) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectionSummary(item.selected_options)}
                  </p>
                )}
              </div>
              <span className="whitespace-nowrap">{formatBRL(Number(item.subtotal))}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2 border-t pt-4 text-sm">
          <Amount label="Produtos" amount={o.subtotal} />
          <Amount label={`Frete (${o.shipping_service})`} amount={o.shipping_cost} />
          <Amount label="Total comercial" amount={o.partner_gross_total} />
          <Amount
            label={
              o.origin_store_id
                ? "Comissão da loja a repassar (10%)"
                : "Comissão retida pela loja (10%)"
            }
            amount={o.partner_commission_amount}
          />
          <Amount label="Taxa de cartão" amount={o.payment_fee} />
          <div className="border-t pt-3 font-bold">
            <Amount label="Pagamento à Dukamp" amount={o.total} />
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            {o.origin_store_id
              ? "Compra feita pelo consumidor no site da loja: a Dukamp recebe o total e a comissão fica registrada para repasse à parceira após aprovação, sem cancelamento ou reembolso."
              : "A comissão já foi descontada do pagamento à Dukamp e não gera outro repasse. É reconhecida apenas em vendas pagas, sem cancelamento ou reembolso."}
          </p>
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Ficha do cliente</h2>
          <div className="space-y-2 text-sm">
            <p>{o.customer_name}</p>
            <p>CPF/CNPJ: {o.cpf_cnpj}</p>
            <p>{o.email}</p>
            <p>{o.phone}</p>
            {Object.entries(extra)
              .filter(([key, value]) => key !== "cobranca" && !!value)
              .map(([key, value]) => (
                <p key={key}>
                  <span className="text-muted-foreground">
                    {(
                      {
                        inscricao_estadual: "Inscrição estadual",
                        contato: "Contato",
                        telefone_alternativo: "Outro telefone",
                        propriedade: "Propriedade",
                        observacoes: "Observações",
                      } as Record<string, string>
                    )[key] || key}
                    :{" "}
                  </span>
                  {String(value)}
                </p>
              ))}
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">
            {o.fulfillment_method === "pickup"
              ? "Endereço cadastrado / retirada"
              : "Endereço de entrega"}
          </h2>
          <div className="space-y-2 text-sm">
            <p>
              {o.rua}, {o.numero}
              {o.complemento ? ` · ${o.complemento}` : ""}
            </p>
            <p>
              {o.bairro} · {o.cidade}/{o.estado}
            </p>
            <p>CEP {o.cep}</p>
            {o.referencia_entrega && <p>Referência: {o.referencia_entrega}</p>}
            {o.pessoa_autorizada && <p>Recebedor autorizado: {o.pessoa_autorizada}</p>}
            {extra.cobranca && (
              <div className="border-t pt-3">
                <p className="font-medium">Cobrança</p>
                <p>
                  {extra.cobranca.rua}, {extra.cobranca.numero} · {extra.cobranca.bairro}
                </p>
                <p>
                  {extra.cobranca.cidade}/{extra.cobranca.estado} · CEP {extra.cobranca.cep}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      {!admin && (
        <Button asChild variant="outline">
          <Link to="/parceiro/vendas">Voltar a Gerenciar vendas</Link>
        </Button>
      )}
    </div>
  );
}
function Amount({ label, amount }: { label: string; amount: unknown }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="whitespace-nowrap tabular-nums">{formatBRL(Number(amount || 0))}</span>
    </div>
  );
}
function CopyCode({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">
        {label}
        <textarea
          readOnly
          value={value}
          className="mt-2 h-20 w-full resize-none rounded-md border bg-muted/20 p-3 font-mono text-xs"
        />
      </label>
      <Button
        className="mt-2"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success("Código copiado.");
          } catch {
            toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
          }
        }}
      >
        <Copy className="mr-2 h-4 w-4" />
        Copiar código
      </Button>
    </div>
  );
}
type CardFormData = {
  token: string;
  payment_method_id: string;
  issuer_id?: string;
  installments: number;
  payer: { email: string; identification: { type: string; number: string } };
};
type CardBrick = { unmount: () => Promise<void> };
type CardSdkWindow = Window & {
  MercadoPago?: new (
    key: string,
    config: { locale: string },
  ) => {
    bricks: () => {
      create: (
        type: string,
        container: string,
        config: {
          initialization: { amount: number; payer: { email: string } };
          customization: { paymentMethods: { minInstallments: number; maxInstallments: number } };
          callbacks: {
            onReady: () => void;
            onError: (error: { message?: string }) => void;
            onSubmit: (data: { formData: CardFormData }) => Promise<void>;
          };
        },
      ) => Promise<CardBrick>;
    };
  };
};
let sdkPromise: Promise<void> | null = null;
function loadCardSdk() {
  if ((window as CardSdkWindow).MercadoPago) return Promise.resolve();
  if (!sdkPromise)
    sdkPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-mp-sdk]");
      const script = existing || document.createElement("script");
      const fail = () => {
        sdkPromise = null;
        script.remove();
        reject(
          new Error("Não foi possível carregar o formulário seguro de cartão. Atualize a página."),
        );
      };
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.async = true;
        script.dataset.mpSdk = "1";
        document.head.appendChild(script);
      }
    });
  return sdkPromise;
}
function PartnerCardPayment({ order, onUpdate }: { order: PartnerOrder; onUpdate: () => unknown }) {
  const fetchKey = useServerFn(getMpPublicKey);
  const pay = useServerFn(processCardPayment);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const containerId = `partner-card-${order.id}`;
  useEffect(() => {
    let cancelled = false;
    let controller: CardBrick | undefined;
    (async () => {
      try {
        const [{ publicKey }] = await Promise.all([fetchKey(), loadCardSdk()]);
        if (cancelled) return;
        const mp = new (window as CardSdkWindow).MercadoPago!(publicKey, { locale: "pt-BR" });
        controller = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount: Number(order.total), payer: { email: order.email } },
          customization: {
            paymentMethods: {
              minInstallments: order.card_installments || 1,
              maxInstallments: order.card_installments || 1,
            },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onError: (e: { message?: string }) => {
              if (!cancelled) setError(e?.message || "Não foi possível preparar o cartão.");
            },
            onSubmit: async ({ formData }: { formData: CardFormData }) => {
              try {
                setError("");
                const result = await pay({
                  data: {
                    order_id: order.id,
                    token: formData.token,
                    payment_method_id: formData.payment_method_id,
                    issuer_id: formData.issuer_id,
                    installments: formData.installments,
                    payer: formData.payer,
                  },
                });
                await onUpdateRef.current();
                if (result.status === "approved") toast.success("Pagamento confirmado.");
                else if (result.status === "rejected")
                  throw new Error(
                    "Pagamento recusado. Fale com a Dukamp antes de tentar novamente.",
                  );
                else toast.info("Pagamento enviado para análise.");
              } catch (e) {
                setError((e as Error).message);
                throw e;
              }
            },
          },
        });
        if (cancelled) await controller.unmount();
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      if (controller) void controller.unmount();
    };
  }, [order.id, order.total, order.email, order.card_installments, fetchKey, pay, containerId]);
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        Formulário seguro do Mercado Pago · {order.card_installments || 1}x
      </p>
      {!ready && !error && <p className="text-sm">Carregando formulário do cartão...</p>}
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div id={containerId} />
    </div>
  );
}
