import { createFileRoute } from "@tanstack/react-router";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/api/admin/support-tickets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse, listAllAuthUsers } =
          await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        const { data: role, error: roleError } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleError) return errorResponse("Não foi possível validar o administrador.", 500);

        const isMaster =
          (user.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase();
        if (!role && !isMaster) return errorResponse("Acesso negado.", 403);

        try {
          const users = await listAllAuthUsers(supabaseAdmin);
          const sellerChatTicketIds = new Set<string>();
          for (const account of users) {
            const ticketId = account.app_metadata?.seller_chat_ticket_id;
            if (typeof ticketId === "string" && ticketId.trim()) {
              sellerChatTicketIds.add(ticketId.trim());
            }
          }

          const { data: ticketRows, error: ticketsError } = await supabaseAdmin
            .from("support_tickets")
            .select("*")
            .order("last_message_at", { ascending: false });
          if (ticketsError) throw ticketsError;

          const tickets = (ticketRows ?? []).filter(
            (ticket: any) => !sellerChatTicketIds.has(ticket.id),
          );
          const userIds = Array.from(new Set(tickets.map((ticket: any) => ticket.user_id)));
          const ticketIds = tickets.map((ticket: any) => ticket.id);

          const [{ data: profiles, error: profilesError }, { data: unread, error: unreadError }] =
            await Promise.all([
              userIds.length
                ? supabaseAdmin
                    .from("profiles")
                    .select("id, full_name, email")
                    .in("id", userIds)
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
          if (profilesError) throw profilesError;
          if (unreadError) throw unreadError;

          const profileMap = new Map<string, any>();
          for (const profile of profiles ?? []) profileMap.set(profile.id, profile);
          const unreadCounts = new Map<string, number>();
          for (const message of unread ?? []) {
            unreadCounts.set(
              message.ticket_id,
              (unreadCounts.get(message.ticket_id) ?? 0) + 1,
            );
          }

          const rows = tickets.map((ticket: any) => {
            const profile = profileMap.get(ticket.user_id);
            return {
              ...ticket,
              unread: unreadCounts.get(ticket.id) ?? 0,
              user_name: profile?.full_name ?? null,
              user_email: profile?.email ?? null,
            };
          });

          return Response.json(
            { tickets: rows },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("[admin-support] Falha ao carregar atendimentos:", error);
          return errorResponse("Não foi possível carregar os atendimentos.", 500);
        }
      },
    },
  },
});
