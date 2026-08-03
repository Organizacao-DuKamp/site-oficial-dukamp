import { createFileRoute } from "@tanstack/react-router";

type SellerChatPayload = {
  action?: "send" | "markRead" | "close";
  ticketId?: string;
  message?: string;
};

function cleanMessage(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 4000) : "";
}

function ticketIdFromClient(client: any, sellerId: string): string | null {
  const metadata = client.user.app_metadata ?? {};
  if (metadata.seller_chat_seller_id !== sellerId) return null;
  return typeof metadata.seller_chat_ticket_id === "string" && metadata.seller_chat_ticket_id.trim()
    ? metadata.seller_chat_ticket_id.trim()
    : null;
}

async function authorizedTicket(
  supabaseAdmin: any,
  sellerId: string,
  clients: any[],
  ticketId: string,
) {
  const client = clients.find((item) => ticketIdFromClient(item, sellerId) === ticketId);
  if (!client) return null;

  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("user_id", client.id)
    .maybeSingle();
  if (error) throw error;
  return data ? { ticket: data, client } : null;
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

export const Route = createFileRoute("/api/seller/chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse, listLinkedClients, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor inválida.", 403);

        try {
          const clients = await listLinkedClients(supabaseAdmin, seller.sellerId);
          const ticketEntries = clients
            .map((client) => ({
              client,
              ticketId: ticketIdFromClient(client, seller.sellerId),
            }))
            .filter((entry): entry is { client: any; ticketId: string } => Boolean(entry.ticketId));

          const ticketIds = ticketEntries.map((entry) => entry.ticketId);
          const [{ data: tickets, error: ticketsError }, { data: unread, error: unreadError }] =
            await Promise.all([
              ticketIds.length
                ? supabaseAdmin.from("support_tickets").select("*").in("id", ticketIds)
                : Promise.resolve({ data: [], error: null }),
              ticketIds.length
                ? supabaseAdmin
                    .from("support_messages")
                    .select("ticket_id")
                    .in("ticket_id", ticketIds)
                    .eq("sender_role", "user")
                    .eq("read_by_admin", false)
                : Promise.resolve({ data: [], error: null }),
            ]);
          if (ticketsError) throw ticketsError;
          if (unreadError) throw unreadError;

          const clientByTicket = new Map<string, any>();
          for (const entry of ticketEntries) {
            clientByTicket.set(entry.ticketId, entry.client);
          }

          const unreadCounts = new Map<string, number>();
          for (const item of unread ?? []) {
            unreadCounts.set(item.ticket_id, (unreadCounts.get(item.ticket_id) ?? 0) + 1);
          }

          const conversations = (tickets ?? [])
            .map((ticket: any) => {
              const client = clientByTicket.get(ticket.id);
              if (!client || ticket.user_id !== client.id) return null;
              return {
                ...ticket,
                customer_id: client.id,
                seller_id: seller.sellerId,
                customer_name: client.full_name || "Cliente",
                customer_email: client.contact_email || client.email || "",
                unread: unreadCounts.get(ticket.id) ?? 0,
              };
            })
            .filter(Boolean)
            .sort(
              (first: any, second: any) =>
                new Date(second.last_message_at || second.created_at).getTime() -
                new Date(first.last_message_at || first.created_at).getTime(),
            );

          const requestedTicketId = new URL(request.url).searchParams.get("ticketId")?.trim();
          let selected = null;
          let messages: any[] = [];
          if (requestedTicketId) {
            const match = await authorizedTicket(
              supabaseAdmin,
              seller.sellerId,
              clients,
              requestedTicketId,
            );
            if (!match) return errorResponse("Conversa não encontrada.", 404);
            selected = conversations.find((item: any) => item.id === requestedTicketId) ?? null;
            messages = await loadMessages(supabaseAdmin, requestedTicketId);
          }

          return Response.json(
            {
              seller: { id: seller.sellerId, name: seller.name },
              conversations,
              selected,
              messages,
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("[seller-chat] Falha ao carregar conversas:", error);
          return errorResponse("Não foi possível carregar as conversas.", 500);
        }
      },

      POST: async ({ request }) => {
        const { authenticateRequest, errorResponse, listLinkedClients, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor inválida.", 403);

        let payload: SellerChatPayload;
        try {
          payload = (await request.json()) as SellerChatPayload;
        } catch {
          return errorResponse("Dados inválidos.", 400);
        }

        const ticketId = payload.ticketId?.trim();
        if (!ticketId) return errorResponse("Conversa inválida.", 400);

        try {
          const clients = await listLinkedClients(supabaseAdmin, seller.sellerId);
          const match = await authorizedTicket(supabaseAdmin, seller.sellerId, clients, ticketId);
          if (!match) return errorResponse("Conversa não encontrada.", 404);

          if (payload.action === "send") {
            if (match.ticket.status === "closed") {
              return errorResponse("Esta conversa foi encerrada.", 400);
            }
            const message = cleanMessage(payload.message);
            if (!message) return errorResponse("Digite uma mensagem.", 400);

            const result = await supabaseAdmin.from("support_messages").insert({
              ticket_id: ticketId,
              sender_id: seller.userId,
              sender_role: "admin",
              message,
              read_by_admin: true,
              read_by_user: false,
            });
            if (result.error) throw result.error;

            await supabaseAdmin
              .from("support_tickets")
              .update({ last_message_at: new Date().toISOString(), status: "in_progress" })
              .eq("id", ticketId);
          } else if (payload.action === "markRead") {
            const result = await supabaseAdmin
              .from("support_messages")
              .update({ read_by_admin: true })
              .eq("ticket_id", ticketId)
              .eq("sender_role", "user")
              .eq("read_by_admin", false);
            if (result.error) throw result.error;
          } else if (payload.action === "close") {
            const result = await supabaseAdmin
              .from("support_tickets")
              .update({
                status: "closed",
                closed_by: seller.userId,
                closed_at: new Date().toISOString(),
              })
              .eq("id", ticketId);
            if (result.error) throw result.error;
          } else {
            return errorResponse("Ação inválida.", 400);
          }

          const refreshed = await authorizedTicket(
            supabaseAdmin,
            seller.sellerId,
            clients,
            ticketId,
          );
          return Response.json({
            ok: true,
            ticket: refreshed?.ticket ?? null,
            messages: await loadMessages(supabaseAdmin, ticketId),
          });
        } catch (error) {
          console.error("[seller-chat] Falha na ação:", error);
          return errorResponse("Não foi possível atualizar a conversa.", 500);
        }
      },
    },
  },
});
