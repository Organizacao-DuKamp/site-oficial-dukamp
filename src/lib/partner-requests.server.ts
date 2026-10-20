import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import { createAuditedAdminClient } from "./audit.server";
import { requirePartner, requirePartnerAdmin } from "./partners.server";
import { partnerQuoteFingerprint, type PartnerQuoteInput, type PartnerCustomerDetails } from "./partners";
import { assertDukampPartnerProduct } from "./dukamp-products";
import { productQuantities, resolveOptionSelections } from "./product-options";
import type { StoreCheckout } from "./storefronts";

const database = (userId: string) => createAuditedAdminClient(userId, getRequest()) as SupabaseClient;
function checked<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T>;
}
async function fingerprint(value: unknown) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export type PartnerRequestInput = PartnerQuoteInput & {
  partner_quote_id: string; customer_name: string; email: string; phone: string; cpf_cnpj: string;
  referencia_entrega?: string; pessoa_autorizada?: string;
  partner_customer_details: PartnerCustomerDetails;
};
export async function submitPartnerRequest(userId: string, input: PartnerRequestInput) {
  const db = database(userId);
  const partner = await requirePartner(db, userId);
  const requestHash = await fingerprint(input);
  const previous = checked(await db.from("partner_sale_requests").select("id,request_hash")
    .eq("partner_id", partner.id).eq("request_key", input.partner_quote_id).maybeSingle());
  if (previous) {
    if (previous.request_hash !== requestHash) throw new Error("Esta simulação já foi utilizada. Abra a venda registrada ou faça outra simulação.");
    return { orderId: previous.id as string };
  }
  const quote = checked(await db.from("dukamp_partner_quotes").select("*")
    .eq("id", input.partner_quote_id).eq("partner_id", partner.id).single());
  if (quote.order_id || Date.parse(quote.expires_at) <= Date.now()) throw new Error("Simulação expirada ou já utilizada. Calcule novamente.");
  if (quote.payload.fingerprint !== partnerQuoteFingerprint(input)) throw new Error("Os produtos ou endereço mudaram. Calcule novamente.");
  const products = checked(await db.from("products").select("id,name,code,brand,active,stock,options")
    .in("id", [...new Set(input.items.map(i => i.product_id))]));
  const quantities = productQuantities(input.items);
  const items = input.items.map((item, index) => {
    const product = products.find(p => p.id === item.product_id);
    if (!product?.active || product.stock < quantities.get(item.product_id)!) throw new Error("Produto indisponível ou estoque insuficiente. Calcule novamente.");
    assertDukampPartnerProduct(product);
    const line = quote.payload.lines[index];
    if (!line || line.product_id !== item.product_id || line.quantity !== item.quantity) throw new Error("Simulação inválida.");
    return {
      id: `${quote.id}-${index}`, product_id: product.id, product_code: product.code, name: product.name,
      quantity: item.quantity, unit_price: Number(line.unit_price), subtotal: Number(line.subtotal),
      selected_options: resolveOptionSelections(product.options, item.selected_options),
    };
  });
  const { items: ignoredItems, latitude, longitude, shipping_service, partner_quote_id, ...customer } = input;
  const row = checked(await db.rpc("submit_partner_sale_request", {
    p_actor: userId, p_partner: partner.id, p_quote: quote.id, p_store: null,
    p_key: quote.id, p_hash: requestHash, p_details: {
      ...customer, shipping_service: quote.payload.shipping.servico,
      shipping_deadline_days: quote.payload.shipping.prazoDias,
    }, p_items: items, p_subtotal: Number(quote.subtotal), p_shipping: Number(quote.shipping_cost),
  })) as { id: string };
  return { orderId: row.id };
}
export async function submitStoreRequest(userId: string, input: StoreCheckout) {
  const db = database(userId);
  const partner = await requirePartner(db, userId);
  const { ownStore } = await import("./storefronts.server");
  const { storeTotals, storeDelivery } = await import("./storefronts");
  const { store } = await ownStore(userId);
  if (store.slug !== input.slug || input.payment_method !== "manual") throw new Error("Loja ou venda não autorizada.");
  const hash = await fingerprint({ ...input, access_token: undefined });
  const previous = checked(await db.from("partner_sale_requests").select("id,order_number,request_hash")
    .eq("partner_id", partner.id).eq("request_key", input.request_id).maybeSingle());
  if (previous) {
    if (previous.request_hash !== hash) throw new Error("Esta solicitação já foi utilizada.");
    return { id: previous.id as string, order_number: previous.order_number as string, payment_pending: false };
  }
  const products = checked(await db.from("partner_store_products").select("*").eq("store_id", store.id)
    .is("deleted_at", null).in("id", [...new Set(input.items.map(i => i.product_id))]));
  const totals = storeTotals(products, input.items);
  const shipping = storeDelivery(store, input.fulfillment, input.customer.cep, totals.subtotal);
  const c = input.customer;
  const row = checked(await db.rpc("submit_partner_sale_request", {
    p_actor: userId, p_partner: partner.id, p_quote: null, p_store: store.id, p_key: input.request_id, p_hash: hash,
    p_details: {
      customer_name: c.name, email: c.email, phone: c.phone, cpf_cnpj: c.document,
      cep: c.cep, rua: c.street, numero: c.number, bairro: c.neighborhood, cidade: c.city,
      estado: c.state, complemento: c.complement, fulfillment_method: input.fulfillment,
      partner_customer_details: { observacoes: c.notes },
      shipping_service: input.fulfillment === "pickup" ? "Retirada na loja parceira" : "Entrega pela loja parceira",
      shipping_deadline_days: input.fulfillment === "pickup" ? 0 : store.delivery_days,
    },
    p_items: totals.items.map(({ cost, ...line }, index) => ({ ...line, id: `${input.request_id}-${index}`, selected_options: [] })),
    p_subtotal: totals.subtotal, p_shipping: shipping,
  })) as { id: string; order_number: string };
  return { id: row.id, order_number: row.order_number, payment_pending: false };
}
export async function reviewPartnerRequest(userId: string, input: {
  id: string; action: "approve" | "reject" | "delivery"; commission?: number; reason?: string;
  status?: "preparando" | "pronto" | "a_caminho" | "entregue";
}) {
  const db = database(userId);
  await requirePartnerAdmin(db, userId);
  checked(await db.rpc("review_partner_sale_request", {
    p_actor: userId, p_id: input.id, p_action: input.action,
    p_commission: input.commission ?? null, p_reason: input.reason ?? null, p_status: input.status ?? null,
  }));
  return { success: true };
}
export async function updatePartnerPix(userId: string, pixKey: string) {
  const db = database(userId);
  const partner = await requirePartner(db, userId);
  checked(await db.from("dukamp_partners").update({ pix_key: pixKey }).eq("id", partner.id).select("id").single());
  return { success: true };
}
