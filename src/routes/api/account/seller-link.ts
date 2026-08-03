import { createFileRoute } from "@tanstack/react-router";

type SellerLinkPayload = {
  sellerId?: string | null;
};

type SellerOption = {
  id: string;
  name: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function authorize(request: Request) {
  const token = readBearerToken(request);
  if (!token) return { response: errorResponse("Não autorizado.", 401) } as const;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { response: errorResponse("Sessão inválida.", 401) } as const;

  return { supabaseAdmin, user: data.user } as const;
}

async function findSelectableSeller(
  supabaseAdmin: any,
  sellerId: string,
): Promise<{ seller: SellerOption | null; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("id, name, slug, active")
    .eq("id", sellerId)
    .maybeSingle();

  if (error) return { seller: null, error: error.message };
  if (!data || !data.active || !data.slug?.startsWith("conta-")) return { seller: null };
  return { seller: { id: data.id, name: data.name } };
}

export const Route = createFileRoute("/api/account/seller-link")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = await authorize(request);
        if ("response" in authorization) return authorization.response;

        const { supabaseAdmin, user } = authorization;
        const rawSellerId = user.user_metadata?.selected_seller_id;
        const sellerId = typeof rawSellerId === "string" ? rawSellerId.trim() : "";

        if (!sellerId || !UUID_RE.test(sellerId)) {
          return Response.json({ seller: null }, { headers: { "Cache-Control": "no-store" } });
        }

        const result = await findSelectableSeller(supabaseAdmin, sellerId);
        if (result.error) return errorResponse("Não foi possível carregar o vendedor vinculado.", 500);

        return Response.json({ seller: result.seller }, { headers: { "Cache-Control": "no-store" } });
      },

      POST: async ({ request }) => {
        const authorization = await authorize(request);
        if ("response" in authorization) return authorization.response;

        const { supabaseAdmin, user } = authorization;
        let payload: SellerLinkPayload;
        try {
          payload = (await request.json()) as SellerLinkPayload;
        } catch {
          return errorResponse("Dados inválidos.", 400);
        }

        const sellerId = payload.sellerId == null ? null : String(payload.sellerId).trim();
        let seller: SellerOption | null = null;

        if (sellerId !== null) {
          if (!UUID_RE.test(sellerId)) return errorResponse("Vendedor inválido.", 400);
          const result = await findSelectableSeller(supabaseAdmin, sellerId);
          if (result.error) return errorResponse("Não foi possível validar o vendedor.", 500);
          if (!result.seller) return errorResponse("Vendedor inválido ou inativo.", 400);
          seller = result.seller;
        }

        const currentMetadata = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;
        const oldSellerId = typeof currentMetadata.selected_seller_id === "string"
          ? currentMetadata.selected_seller_id
          : null;
        const oldTicketId = typeof currentMetadata.seller_chat_ticket_id === "string"
          ? currentMetadata.seller_chat_ticket_id
          : null;
        const oldTicketSellerId = typeof currentMetadata.seller_chat_seller_id === "string"
          ? currentMetadata.seller_chat_seller_id
          : null;
        const changedSeller = oldSellerId !== (seller?.id ?? null);

        if (changedSeller && oldTicketId && oldTicketSellerId === oldSellerId) {
          const { error: closeError } = await supabaseAdmin
            .from("support_tickets")
            .update({
              status: "closed",
              closed_by: user.id,
              closed_at: new Date().toISOString(),
            })
            .eq("id", oldTicketId)
            .eq("user_id", user.id);
          if (closeError) {
            console.error("[seller-link] Falha ao encerrar conversa antiga:", closeError.message);
          }
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...currentMetadata,
            selected_seller_id: seller?.id ?? null,
            ...(changedSeller
              ? { seller_chat_ticket_id: null, seller_chat_seller_id: null }
              : {}),
          },
        });

        if (error) return errorResponse("Não foi possível atualizar o vínculo com o vendedor.", 500);

        const { invalidateAuthUsersCache } = await import("@/lib/seller-system.server");
        invalidateAuthUsersCache();

        return Response.json({ ok: true, seller }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
