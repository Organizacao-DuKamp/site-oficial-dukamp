import { createFileRoute } from "@tanstack/react-router";

type QuoteActionPayload = {
  action?: "create" | "saveItem" | "removeItem" | "send";
  quoteId?: string;
  clientId?: string;
  notes?: string;
  validUntil?: string;
  productId?: string;
  quantity?: number;
};

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export const Route = createFileRoute("/api/seller/quotes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");
        const { listQuotes, publicQuote, readQuote, refreshExpiration } =
          await import("@/lib/seller-quotes.server");

        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;
        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor inválida.", 403);

        try {
          const quoteId = new URL(request.url).searchParams.get("id")?.trim();
          if (quoteId) {
            const stored = await readQuote(supabaseAdmin, quoteId);
            if (!stored || stored.seller_user_id !== seller.userId) {
              return errorResponse("Orçamento não encontrado.", 404);
            }
            return Response.json(
              { quote: publicQuote(await refreshExpiration(supabaseAdmin, stored)) },
              { headers: { "Cache-Control": "no-store" } },
            );
          }

          const rows = await listQuotes(supabaseAdmin);
          const quotes = [];
          for (const row of rows.filter((quote) => quote.seller_user_id === seller.userId)) {
            quotes.push(publicQuote(await refreshExpiration(supabaseAdmin, row)));
          }
          quotes.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );

          return Response.json({ quotes }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          console.error("[seller-quotes] Falha ao carregar orçamentos:", error);
          return errorResponse("Não foi possível carregar os orçamentos.", 500);
        }
      },

      POST: async ({ request }) => {
        const { authenticateRequest, errorResponse, listLinkedClients, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");
        const {
          getClientProfile,
          getProducts,
          productPrice,
          publicQuote,
          readQuote,
          refreshExpiration,
          writeQuote,
        } = await import("@/lib/seller-quotes.server");

        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;
        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor inválida.", 403);

        let payload: QuoteActionPayload;
        try {
          payload = (await request.json()) as QuoteActionPayload;
        } catch {
          return errorResponse("Dados inválidos.", 400);
        }

        try {
          if (payload.action === "create") {
            const clientId = cleanText(payload.clientId, 80);
            const validUntil = cleanText(payload.validUntil, 80);
            const validDate = new Date(validUntil);
            if (!clientId) return errorResponse("Selecione um cliente.", 400);
            if (!Number.isFinite(validDate.getTime()) || validDate.getTime() <= Date.now()) {
              return errorResponse("A validade deve estar no futuro.", 400);
            }

            const clients = await listLinkedClients(supabaseAdmin, seller.sellerId);
            const client = clients.find((item) => item.id === clientId);
            if (!client) return errorResponse("Cliente não está vinculado a este vendedor.", 403);

            const now = new Date().toISOString();
            const quote = {
              version: 1 as const,
              id: crypto.randomUUID(),
              seller_user_id: seller.userId,
              seller_record_id: seller.sellerId,
              seller_name_snapshot: seller.name,
              client_id: client.id,
              client_name_snapshot: client.full_name,
              client_email_snapshot: client.contact_email || client.email,
              status: "draft" as const,
              notes: cleanText(payload.notes, 2000) || null,
              valid_until: validDate.toISOString(),
              created_at: now,
              updated_at: now,
              sent_at: null,
              viewed_at: null,
              accepted_at: null,
              declined_at: null,
              items: [],
            };
            await writeQuote(supabaseAdmin, quote);
            return Response.json({ ok: true, quote: publicQuote(quote) });
          }

          const quoteId = cleanText(payload.quoteId, 80);
          if (!quoteId) return errorResponse("Orçamento inválido.", 400);
          const stored = await readQuote(supabaseAdmin, quoteId);
          if (!stored || stored.seller_user_id !== seller.userId) {
            return errorResponse("Orçamento não encontrado.", 404);
          }
          const quote = await refreshExpiration(supabaseAdmin, stored);
          if (quote.status !== "draft") {
            return errorResponse("Somente rascunhos podem ser alterados.", 400);
          }

          if (payload.action === "saveItem") {
            const productId = cleanText(payload.productId, 80);
            const quantity = Number(payload.quantity);
            if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
              return errorResponse("Produto ou quantidade inválida.", 400);
            }

            const products = await getProducts(supabaseAdmin, [productId]);
            const product = products[0];
            if (!product || !product.active || Number(product.stock) < quantity) {
              return errorResponse("Produto indisponível ou estoque insuficiente.", 400);
            }

            const nextItem = {
              id: quote.items.find((item) => item.product_id === productId)?.id ?? crypto.randomUUID(),
              product_id: product.id,
              quantity,
              product_name_snapshot: product.name,
              unit_price_snapshot: null,
              image: Array.isArray(product.images) ? product.images[0] ?? null : null,
            };
            const items = quote.items.some((item) => item.product_id === productId)
              ? quote.items.map((item) => (item.product_id === productId ? nextItem : item))
              : [...quote.items, nextItem];
            const updated = { ...quote, items, updated_at: new Date().toISOString() };
            await writeQuote(supabaseAdmin, updated);
            return Response.json({ ok: true, quote: publicQuote(updated) });
          }

          if (payload.action === "removeItem") {
            const productId = cleanText(payload.productId, 80);
            const updated = {
              ...quote,
              items: quote.items.filter((item) => item.product_id !== productId),
              updated_at: new Date().toISOString(),
            };
            await writeQuote(supabaseAdmin, updated);
            return Response.json({ ok: true, quote: publicQuote(updated) });
          }

          if (payload.action === "send") {
            if (!quote.items.length) return errorResponse("Adicione pelo menos um produto.", 400);
            const clients = await listLinkedClients(supabaseAdmin, seller.sellerId);
            if (!clients.some((client) => client.id === quote.client_id)) {
              return errorResponse("O cliente não está mais vinculado a este vendedor.", 400);
            }

            const clientProfile = await getClientProfile(supabaseAdmin, quote.client_id);
            if (!clientProfile) return errorResponse("Cliente não encontrado.", 404);
            const products = await getProducts(
              supabaseAdmin,
              quote.items.map((item) => item.product_id),
            );
            const productMap = new Map(products.map((product: any) => [product.id, product]));

            const items = quote.items.map((item) => {
              const product: any = productMap.get(item.product_id);
              if (!product || !product.active || Number(product.stock) < item.quantity) {
                throw new Error(`Produto indisponível: ${item.product_name_snapshot || item.product_id}`);
              }
              const price = productPrice(product, clientProfile.account_type);
              if (price === null) {
                throw new Error(`Preço não configurado: ${product.name}`);
              }
              return {
                ...item,
                product_name_snapshot: product.name,
                unit_price_snapshot: price,
                image: Array.isArray(product.images) ? product.images[0] ?? null : null,
              };
            });

            const now = new Date().toISOString();
            const sent = {
              ...quote,
              items,
              status: "sent" as const,
              sent_at: now,
              updated_at: now,
              seller_name_snapshot: seller.name,
              client_name_snapshot: clientProfile.full_name,
              client_email_snapshot: clientProfile.email,
            };
            await writeQuote(supabaseAdmin, sent);
            return Response.json({ ok: true, quote: publicQuote(sent) });
          }

          return errorResponse("Ação inválida.", 400);
        } catch (error) {
          console.error("[seller-quotes] Falha na ação:", error);
          return errorResponse(
            error instanceof Error ? error.message : "Não foi possível atualizar o orçamento.",
            500,
          );
        }
      },
    },
  },
});
