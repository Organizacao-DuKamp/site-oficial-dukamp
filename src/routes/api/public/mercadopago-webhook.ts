import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        let payload: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const dataId = payload?.data?.id ? String(payload.data.id) : null;
        const requestId = request.headers.get("x-request-id") || "";
        const signature = request.headers.get("x-signature") || "";
        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

        // Assinatura HMAC (Mercado Pago)
        if (secret && dataId && signature) {
          const parts = Object.fromEntries(
            signature.split(",").map((p) => {
              const [k, v] = p.split("=");
              return [k?.trim(), v?.trim()];
            }),
          ) as Record<string, string>;
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (ts && v1) {
            const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
            const expected = createHmac("sha256", secret).update(manifest).digest("hex");
            try {
              const a = Buffer.from(expected);
              const b = Buffer.from(v1);
              if (a.length !== b.length || !timingSafeEqual(a, b)) {
                return new Response("Invalid signature", { status: 401 });
              }
            } catch {
              return new Response("Invalid signature", { status: 401 });
            }
          }
        }

        const type = payload.type || payload.action || "";
        if (!type.includes("payment") || !dataId) {
          return new Response("ok", { status: 200 });
        }

        // Consulta status no MP
        const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!token) return new Response("Missing MP token", { status: 500 });

        const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return new Response("MP fetch failed", { status: 502 });
        const p = (await res.json()) as {
          id: number | string;
          status: string;
          external_reference?: string;
        };

        if (!p.external_reference) return new Response("ok", { status: 200 });

        const { createClient } = await import("@supabase/supabase-js");
        const supa = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        const status = String(p.status || "pending");
        const allowed = [
          "pending",
          "in_process",
          "approved",
          "rejected",
          "cancelled",
          "refunded",
        ];
        const finalStatus = allowed.includes(status) ? status : "pending";

        await supa
          .from("orders")
          .update({
            payment_status: finalStatus,
            mp_payment_id: String(p.id),
          })
          .eq("id", p.external_reference);

        // Baixa estoque quando aprovado
        if (finalStatus === "approved") {
          const { data: items } = await supa
            .from("order_items")
            .select("product_id,quantity")
            .eq("order_id", p.external_reference);
          for (const it of items || []) {
            if (!it.product_id) continue;
            const { data: prod } = await supa
              .from("products")
              .select("stock")
              .eq("id", it.product_id)
              .single();
            const newStock = Math.max(0, (prod?.stock ?? 0) - it.quantity);
            await supa.from("products").update({ stock: newStock }).eq("id", it.product_id);
          }
        }

        return new Response("ok", { status: 200 });
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
