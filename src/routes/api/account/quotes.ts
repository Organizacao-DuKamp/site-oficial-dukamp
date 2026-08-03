import { createFileRoute } from "@tanstack/react-router";

type ClientQuotePayload = {
  action?: "view" | "respond";
  quoteId?: string;
  accept?: boolean;
};

function cleanId(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

export const Route = createFileRoute("/api/account/quotes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse } = await import("@/lib/seller-system.server");
        const { listQuotes, publicQuote, refreshExpiration } = await import("@/lib/seller-quotes.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        try {
          const pendingOnly = new URL(request.url).searchParams.get("pending") === "1";
          const rows = await listQuotes(supabaseAdmin);
          const quotes = [];
          for (const row of rows.filter((quote) => quote.client_id === user.id)) {
            const quote = await refreshExpiration(supabaseAdmin, row);
            if (pendingOnly && quote.status !== "sent") continue;
            quotes.push(publicQuote(quote));
          }
          quotes.sort(
            (first, second) =>
              new Date(second.sent_at || second.created_at).getTime() -
              new Date(first.sent_at || first.created_at).getTime(),
          );
          return Response.json({ quotes }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          console.error("[account-quotes] Falha ao carregar orçamentos:", error);
          return errorResponse("Não foi possível carregar os orçamentos.", 500);
        }
      },

      POST: async ({ request }) => {
        const { authenticateRequest, errorResponse } = await import("@/lib/seller-system.server");
        const { publicQuote, readQuote, refreshExpiration, writeQuote } =
          await import("@/lib/seller-quotes.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        let payload: ClientQuotePayload;
        try {
          payload = (await request.json()) as ClientQuotePayload;
        } catch {
          return errorResponse("Dados inválidos.", 400);
        }

        const quoteId = cleanId(payload.quoteId);
        if (!quoteId) return errorResponse("Orçamento inválido.", 400);

        try {
          const stored = await readQuote(supabaseAdmin, quoteId);
          if (!stored || stored.client_id !== user.id) {
            return errorResponse("Orçamento não encontrado.", 404);
          }
          const quote = await refreshExpiration(supabaseAdmin, stored);

          if (payload.action === "view") {
            if (quote.status !== "sent") {
              return Response.json({ ok: true, quote: publicQuote(quote) });
            }
            const updated = {
              ...quote,
              viewed_at: quote.viewed_at ?? new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await writeQuote(supabaseAdmin, updated);
            return Response.json({ ok: true, quote: publicQuote(updated) });
          }

          if (payload.action === "respond") {
            if (quote.status !== "sent") {
              return errorResponse("Este orçamento já foi respondido ou venceu.", 400);
            }
            const accept = payload.accept === true;
            const now = new Date().toISOString();
            const updated = {
              ...quote,
              status: accept ? ("accepted" as const) : ("declined" as const),
              viewed_at: quote.viewed_at ?? now,
              accepted_at: accept ? now : null,
              declined_at: accept ? null : now,
              updated_at: now,
            };
            await writeQuote(supabaseAdmin, updated);

            const cartItems = accept
              ? updated.items.map((item) => ({
                  id: item.product_id,
                  name: item.product_name_snapshot || "Produto",
                  price: Number(item.unit_price_snapshot ?? 0),
                  image: item.image ?? undefined,
                  quantity: item.quantity,
                }))
              : [];

            return Response.json({ ok: true, quote: publicQuote(updated), cartItems });
          }

          return errorResponse("Ação inválida.", 400);
        } catch (error) {
          console.error("[account-quotes] Falha na ação:", error);
          return errorResponse("Não foi possível atualizar o orçamento.", 500);
        }
      },
    },
  },
});
