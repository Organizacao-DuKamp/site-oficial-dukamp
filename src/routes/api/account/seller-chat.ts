import { createFileRoute } from "@tanstack/react-router";

type ChatAction = "start" | "send" | "close" | "markRead";

type ChatPayload = {
  action?: ChatAction;
  message?: string;
};

function cleanMessage(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 4000) : "";
}

async function resolveSelectedSeller(supabaseAdmin: any, user: any) {
  const sellerId =
    typeof user.user_metadata?.selected_seller_id === "string"
      ? user.user_metadata.selected_seller_id.trim()
      : "";
  if (!sellerId) return null;

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("id, name, slug, active")
    .eq("id", sellerId)
    .maybeSingle();
  if (error || !data || !data.active || !data.slug?.startsWith("conta-")) return null;
  return { id: data.id, name: data.name };
}

async function findOwnedTicket(supabaseAdmin: any, userId: string, ticketId: string) {
  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadTicket(supabaseAdmin: any, user: any, sellerId: string) {
  const appMetadata = { ...(user.app_metadata ?? {}) } as Record<string, unknown>;
  const userMetadata = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;

  const protectedTicketId =
    typeof appMetadata.seller_chat_ticket_id === "string"
      ? appMetadata.seller_chat_ticket_id.trim()
      : "";
  const protectedSellerId =
    typeof appMetadata.seller_chat_seller_id === "string"
      ? appMetadata.seller_chat_seller_id.trim()
      : "";

  if (protectedTicketId && protectedSellerId === sellerId) {
    return findOwnedTicket(supabaseAdmin, user.id, protectedTicketId);
  }

  const legacyTicketId =
    typeof userMetadata.seller_chat_ticket_id === "string"
      ? userMetadata.seller_chat_ticket_id.trim()
      : "";
  const legacySellerId =
    typeof userMetadata.seller_chat_seller_id === "string"
      ? userMetadata.seller_chat_seller_id.trim()
      : "";
  if (!legacyTicketId || legacySellerId !== sellerId) return null;

  const ticket = await findOwnedTicket(supabaseAdmin, user.id, legacyTicketId);
  if (!ticket) return null;

  const { error: migrationError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...appMetadata,
      seller_chat_ticket_id: ticket.id,
      seller_chat_seller_id: sellerId,
    },
    user_metadata: {
      ...userMetadata,
      seller_chat_ticket_id: null,
      seller_chat_seller_id: null,
    },
  });
  if (migrationError) throw migrationError;

  const { invalidateAuthUsersCache } = await import("@/lib/seller-system.server");
  invalidateAuthUsersCache();
  return ticket;
}

async function loadMessages(supabaseAdmin: any, ticketId: string) {
  const { data, error } = await supabaseAdmin
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export const Route = createFileRoute("/api/account/seller-chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse } = await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        const seller = await resolveSelectedSeller(supabaseAdmin, user);
        if (!seller) {
          return Response.json(
            { seller: null, ticket: null, messages: [] },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        try {
          const ticket = await loadTicket(supabaseAdmin, user, seller.id);
          const messages = ticket ? await loadMessages(supabaseAdmin, ticket.id) : [];
          return Response.json(
            { seller, ticket, messages },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("[account-seller-chat] Falha ao carregar conversa:", error);
          return errorResponse("Não foi possível carregar a conversa.", 500);
        }
      },

      POST: async ({ request }) => {
        const { authenticateRequest, errorResponse, invalidateAuthUsersCache } =
          await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        let payload: ChatPayload;
        try {
          payload = (await request.json()) as ChatPayload;
        } catch {
          return errorResponse("Dados inválidos.", 400);
        }

        const seller = await resolveSelectedSeller(supabaseAdmin, user);
        if (!seller) return errorResponse("Selecione um vendedor antes de iniciar a conversa.", 400);

        const currentUserMetadata = {
          ...(user.user_metadata ?? {}),
        } as Record<string, unknown>;
        const currentAppMetadata = {
          ...(user.app_metadata ?? {}),
        } as Record<string, unknown>;

        try {
          if (payload.action === "start") {
            let ticket = await loadTicket(supabaseAdmin, user, seller.id);
            if (!ticket || ticket.status === "closed") {
              const result = await supabaseAdmin
                .from("support_tickets")
                .insert({ user_id: user.id, status: "open" })
                .select("*")
                .single();
              if (result.error) throw result.error;
              ticket = result.data;

              const metadataResult = await supabaseAdmin.auth.admin.updateUserById(user.id, {
                app_metadata: {
                  ...currentAppMetadata,
                  seller_chat_ticket_id: ticket.id,
                  seller_chat_seller_id: seller.id,
                },
                user_metadata: {
                  ...currentUserMetadata,
                  seller_chat_ticket_id: null,
                  seller_chat_seller_id: null,
                },
              });
              if (metadataResult.error) throw metadataResult.error;
              invalidateAuthUsersCache();
            }

            return Response.json({
              ok: true,
              seller,
              ticket,
              messages: await loadMessages(supabaseAdmin, ticket.id),
            });
          }

          const ticket = await loadTicket(supabaseAdmin, user, seller.id);
          if (!ticket) return errorResponse("Conversa não iniciada.", 400);

          if (payload.action === "send") {
            if (ticket.status === "closed") return errorResponse("Esta conversa foi encerrada.", 400);
            const message = cleanMessage(payload.message);
            if (!message) return errorResponse("Digite uma mensagem.", 400);

            const result = await supabaseAdmin.from("support_messages").insert({
              ticket_id: ticket.id,
              sender_id: user.id,
              sender_role: "user",
              message,
              read_by_user: true,
              read_by_admin: false,
            });
            if (result.error) throw result.error;

            await supabaseAdmin
              .from("support_tickets")
              .update({ last_message_at: new Date().toISOString(), status: "open" })
              .eq("id", ticket.id);
          } else if (payload.action === "markRead") {
            const result = await supabaseAdmin
              .from("support_messages")
              .update({ read_by_user: true })
              .eq("ticket_id", ticket.id)
              .eq("sender_role", "admin")
              .eq("read_by_user", false);
            if (result.error) throw result.error;
          } else if (payload.action === "close") {
            const result = await supabaseAdmin
              .from("support_tickets")
              .update({
                status: "closed",
                closed_by: user.id,
                closed_at: new Date().toISOString(),
              })
              .eq("id", ticket.id);
            if (result.error) throw result.error;
          } else {
            return errorResponse("Ação inválida.", 400);
          }

          const refreshedTicket = await loadTicket(supabaseAdmin, user, seller.id);
          const messages = refreshedTicket ? await loadMessages(supabaseAdmin, refreshedTicket.id) : [];
          return Response.json({ ok: true, seller, ticket: refreshedTicket, messages });
        } catch (error) {
          console.error("[account-seller-chat] Falha na ação:", error);
          return errorResponse("Não foi possível atualizar a conversa.", 500);
        }
      },
    },
  },
});
