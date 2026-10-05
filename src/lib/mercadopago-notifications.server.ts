import { createHmac, timingSafeEqual } from "node:crypto";

export function paymentNotificationUrl(request: Request, configuredUrl?: string) {
  const origin = new URL(configuredUrl || request.url).origin;
  if (!origin.startsWith("https://"))
    throw new Error("A URL pública de pagamento precisa usar HTTPS");
  return `${origin}/api/public/mercadopago-webhook`;
}

export function paymentNotification(request: Request, payload: any) {
  const query = new URL(request.url).searchParams;
  const type = query.get("type") || query.get("topic") || payload?.type || payload?.topic || payload?.action || "";
  const resource = typeof payload?.resource === "string" ? payload.resource : "";
  const resourceId = resource.match(/^(?:https:\/\/api\.mercadopago\.com)?\/v1\/payments\/(\d+)\/?$/)?.[1];
  const id = query.get("data.id") || query.get("id") ||
    (payload?.data?.id != null ? String(payload.data.id) : null) ||
    resourceId || (typeof payload?.resource === "number" || /^\d+$/.test(resource) ? String(payload.resource) : null);
  return { id, isPayment: type === "payment" || type.startsWith("payment.") };
}

export function validPaymentSignature(request: Request, id: string, secret: string) {
  const parts = Object.fromEntries(
    (request.headers.get("x-signature") || "").split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    }),
  );
  const requestId = request.headers.get("x-request-id");
  if (!parts.ts || !parts.v1 || !requestId || !/^[a-fA-F0-9]{64}$/.test(parts.v1)) return false;
  const manifest = `id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, "hex"));
}
