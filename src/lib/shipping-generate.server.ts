// Geração de etiqueta/pré-postagem a partir de um pedido (server-only, idempotente).
import {
  createPrepostagem,
  fetchLabelUrl,
  fetchTracking,
  validateShippingData,
  type ShippingItem,
  type ShippingOrder,
} from "./correios-shipping.server";

const ORDER_COLS =
  "id,order_number,customer_name,email,phone,cpf_cnpj,cep,rua,numero,complemento,bairro,cidade,estado,shipping_service,payment_status,tracking_code,tracking_status,correios_prepostagem_id,shipping_label_url,shipping_service_code,posted_at,label_created_at,tracking_updated_at,shipping_error";

export type GenerateResult = {
  ok: boolean;
  trackingCode: string | null;
  message: string;
};

export async function generateLabelForOrder(supa: any, orderId: string): Promise<GenerateResult> {
  const { data: order, error } = await supa.from("orders").select(ORDER_COLS).eq("id", orderId).single();
  if (error || !order) throw new Error("Pedido não encontrado.");

  if (order.tracking_code) {
    return { ok: true, trackingCode: order.tracking_code, message: "Este pedido já possui código de rastreamento." };
  }

  if (order.payment_status !== "approved") {
    throw new Error("A etiqueta só pode ser gerada após a confirmação do pagamento.");
  }

  const problems = validateShippingData(order as ShippingOrder);
  if (problems.length) {
    const message = `Dados incompletos para gerar a etiqueta: ${problems.join(", ")}.`;
    await supa.from("orders").update({ shipping_error: message }).eq("id", orderId);
    throw new Error(message);
  }

  const { data: items } = await supa
    .from("order_items")
    .select("name,quantity,unit_price,peso,altura,largura,comprimento")
    .eq("order_id", orderId);

  try {
    const result = await createPrepostagem(order as ShippingOrder, (items ?? []) as ShippingItem[]);

    const labelUrl = result.prepostagemId ? await fetchLabelUrl(result.prepostagemId) : null;
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supa
      .from("orders")
      .update({
        tracking_code: result.trackingCode,
        correios_prepostagem_id: result.prepostagemId,
        shipping_service_code: result.serviceCode,
        shipping_label_url: labelUrl,
        tracking_status: "label_created",
        label_created_at: now,
        tracking_updated_at: now,
        shipping_error: null,
      })
      .eq("id", orderId)
      .is("tracking_code", null)
      .select("tracking_code")
      .maybeSingle();

    if (updateError) throw new Error(updateError.message);

    return {
      ok: true,
      trackingCode: updated?.tracking_code ?? result.trackingCode,
      message: "Etiqueta gerada com sucesso nos Correios.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao gerar a etiqueta nos Correios.";
    await supa.from("orders").update({ shipping_error: message }).eq("id", orderId);
    throw new Error(message);
  }
}

export async function refreshTrackingForOrder(supa: any, orderId: string) {
  const { data: order, error } = await supa
    .from("orders")
    .select("id,tracking_code,delivery_status")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error("Pedido não encontrado.");
  if (!order.tracking_code) throw new Error("Este pedido ainda não possui código de rastreamento.");

  const tracking = await fetchTracking(order.tracking_code);
  if (!tracking) throw new Error("Não foi possível consultar o rastreamento nos Correios agora.");

  const patch: Record<string, unknown> = {
    tracking_status: tracking.status,
    tracking_updated_at: new Date().toISOString(),
  };
  if (tracking.postedAt) patch.posted_at = tracking.postedAt;
  if (tracking.status === "delivered") {
    patch.delivery_status = "entregue";
    patch.delivered_at = new Date().toISOString();
  } else if (["posted", "in_transit", "out_for_delivery"].includes(tracking.status)) {
    if (order.delivery_status !== "entregue") patch.delivery_status = "a_caminho";
  }

  const { error: updateError } = await supa.from("orders").update(patch).eq("id", orderId);
  if (updateError) throw new Error(updateError.message);

  return { ok: true, status: tracking.status, description: tracking.description };
}
