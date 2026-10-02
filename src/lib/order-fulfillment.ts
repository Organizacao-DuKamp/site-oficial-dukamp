export const PICKUP_SERVICE = "Retirar na loja";
export const PICKUP_LOCATIONS = {
  rio_preto: "Filial — São José do Rio Preto",
  monte_aprazivel: "Matriz — Monte Aprazível",
} as const;
export type PickupLocation = keyof typeof PICKUP_LOCATIONS;
export type DeliveryStatus = "preparando" | "pronto" | "a_caminho" | "entregue" | "cancelada";
export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  preparando: "Preparando", pronto: "Pronto para retirada", a_caminho: "A caminho",
  entregue: "Entregue", cancelada: "Entrega cancelada",
};
export type FulfillmentOrder = {
  id: string; payment_status: string; delivery_status?: string | null;
  fulfillment_method?: string; pickup_location?: string | null;
  pickup_ready_at?: string | null; pickup_deadline_at?: string | null;
  refund_status?: string; cancellation_reason?: string | null;
};
export const isPickup = (order: { fulfillment_method?: string; shipping_service?: string | null }) =>
  order.fulfillment_method === "pickup" || order.shipping_service === PICKUP_SERVICE;

export function checkoutFieldValid(key: string, value: string): boolean {
  const text = value.trim();
  if (key === "complemento") return text.length <= 120;
  if (key === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  if (key === "cpf_cnpj") return [11, 14].includes(text.replace(/\D/g, "").length);
  if (key === "phone") return [10, 11].includes(text.replace(/\D/g, "").length);
  if (key === "cep") return text.replace(/\D/g, "").length === 8;
  if (key === "estado") return /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(text.toUpperCase());
  if (key === "numero") return text.length > 0 && text.length <= 20;
  return text.length >= 2 && text.length <= (key === "rua" ? 200 : 120);
}
