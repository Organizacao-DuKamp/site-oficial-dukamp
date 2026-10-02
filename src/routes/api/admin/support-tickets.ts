import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/support-tickets")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleSupportAction } = await import("@/lib/admin-support.server");
        return handleSupportAction(request);
      },
      GET: async ({ request }) => {
        const { authenticateSupportAdmin } = await import("@/lib/admin-support.server");
        const { errorResponse } = await import("@/lib/seller-system.server");
        const authorization = await authenticateSupportAdmin(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin } = authorization;
        try {
          const ticketId = new URL(request.url).searchParams.get("ticketId");
          if (ticketId) {
            if (!/^[0-9a-f-]{36}$/i.test(ticketId))
              return errorResponse("Atendimento inválido.", 400);
            const { data: ticket, error: ticketError } = await supabaseAdmin
              .from("support_tickets")
              .select("*")
              .eq("id", ticketId)
              .single();
            if (ticketError || !ticket) return errorResponse("Atendimento não encontrado.", 404);
            const { data: messages, error: messagesError } = await supabaseAdmin
              .from("support_messages")
              .select("*")
              .eq("ticket_id", ticketId)
              .order("created_at", { ascending: true });
            if (messagesError) throw messagesError;
            return Response.json(
              { ticket, messages },
              { headers: { "Cache-Control": "no-store" } },
            );
          }
          const { data: ticketRows, error: ticketsError } = await supabaseAdmin
            .from("support_tickets")
            .select("*")
            .order("last_message_at", { ascending: false });
          if (ticketsError) throw ticketsError;

          const tickets = ticketRows ?? [];
          const userIds = Array.from(new Set(tickets.map((ticket: any) => ticket.user_id)));
          const ticketIds = tickets.map((ticket: any) => ticket.id);

          const [{ data: profiles, error: profilesError }, { data: unread, error: unreadError }] =
            await Promise.all([
              userIds.length
                ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
                : Promise.resolve({ data: [], error: null }),
              ticketIds.length
                ? supabaseAdmin
                    .from("support_messages")
                    .select("ticket_id")
                    .in("ticket_id", ticketIds)
                    .in("sender_role", ["user", "customer"])
                    .eq("read_by_admin", false)
                : Promise.resolve({ data: [], error: null }),
            ]);
          if (profilesError) throw profilesError;
          if (unreadError) throw unreadError;

          const profileMap = new Map<string, any>();
          for (const profile of profiles ?? []) profileMap.set(profile.id, profile);
          const unreadCounts = new Map<string, number>();
          for (const message of unread ?? []) {
            unreadCounts.set(message.ticket_id, (unreadCounts.get(message.ticket_id) ?? 0) + 1);
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

          return Response.json({ tickets: rows }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          console.error("[admin-support] Falha ao carregar atendimentos:", error);
          return errorResponse("Não foi possível carregar os atendimentos.", 500);
        }
      },
    },
  },
});
