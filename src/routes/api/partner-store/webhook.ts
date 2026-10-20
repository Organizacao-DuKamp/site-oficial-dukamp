import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/partner-store/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const store = new URL(request.url).searchParams.get("store") || "";
        if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(store))
          return new Response("Invalid store", { status: 400 });
        let body: unknown;
        try {
          const text = await request.text();
          if (text.length > 30000) return new Response("Too large", { status: 413 });
          body = text ? JSON.parse(text) : {};
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const { paymentNotification } = await import("@/lib/mercadopago-notifications.server");
        const { id, isPayment } = paymentNotification(request, body);
        if (!isPayment || !id) return new Response("ok");
        try {
          const { handleStoreWebhook, limit } = await import("@/lib/storefronts.server");
          await limit("store-webhook", 240);
          await handleStoreWebhook(store, id);
          return new Response("ok");
        } catch {
          return new Response("Reconciliation pending", { status: 503 });
        }
      },
      GET: async () => new Response("ok"),
    },
  },
});
