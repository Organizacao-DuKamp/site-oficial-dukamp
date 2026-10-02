import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const { paymentNotification, validPaymentSignature } =
          await import("@/lib/mercadopago-notifications.server");
        const { id, isPayment } = paymentNotification(request, payload);
        if (!isPayment || !id) return new Response("ok");
        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        if (secret && !validPaymentSignature(request, id, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }
        try {
          const { fetchProviderPayment, applyProviderPayment } =
            await import("@/lib/mercadopago-payment.server");
          await applyProviderPayment(await fetchProviderPayment(id));
          return new Response("ok");
        } catch (error) {
          console.error("[MercadoPago] Falha ao confirmar pagamento", {
            paymentId: id,
            message: (error as Error).message,
          });
          // A non-2xx response makes Mercado Pago retry delivery.
          return new Response("Payment reconciliation failed", { status: 503 });
        }
      },
      GET: async () => new Response("ok"),
    },
  },
});
