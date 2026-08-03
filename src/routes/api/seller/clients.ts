import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/seller/clients")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          authenticateRequest,
          errorResponse,
          listLinkedClients,
          normalizeSearch,
          resolveSellerIdentity,
        } = await import("@/lib/seller-system.server");

        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor sem cadastro interno associado.", 403);

        const url = new URL(request.url);
        const search = normalizeSearch(url.searchParams.get("search") ?? "");
        const requestedPage = Number(url.searchParams.get("page") ?? "1");
        const requestedPageSize = Number(url.searchParams.get("pageSize") ?? "10");
        const page = Number.isFinite(requestedPage) ? Math.max(1, Math.trunc(requestedPage)) : 1;
        const pageSize = Number.isFinite(requestedPageSize)
          ? Math.min(50, Math.max(1, Math.trunc(requestedPageSize)))
          : 10;

        let clients: Awaited<ReturnType<typeof listLinkedClients>>;
        try {
          clients = await listLinkedClients(supabaseAdmin, seller.sellerId);
        } catch (error) {
          console.error("[seller-clients] Falha ao listar clientes:", error);
          return errorResponse("Não foi possível consultar os clientes.", 500);
        }

        const filtered = search
          ? clients.filter((client) =>
              [client.full_name, client.contact_email, client.email, client.phone]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase("pt-BR")
                .includes(search),
            )
          : clients;

        filtered.sort((first, second) =>
          (first.full_name || first.email || "").localeCompare(
            second.full_name || second.email || "",
            "pt-BR",
          ),
        );

        const count = filtered.length;
        const from = (page - 1) * pageSize;
        const rows = filtered.slice(from, from + pageSize).map(({ user: clientUser, ...client }) => {
          const protectedMetadata = clientUser.app_metadata ?? {};
          const ticketId =
            protectedMetadata.seller_chat_seller_id === seller.sellerId &&
            typeof protectedMetadata.seller_chat_ticket_id === "string"
              ? protectedMetadata.seller_chat_ticket_id.trim()
              : "";
          return {
            ...client,
            chat_ticket_id: ticketId || null,
          };
        });

        return Response.json(
          {
            associationMissing: false,
            seller: { id: seller.sellerId, name: seller.name },
            clients: rows,
            count,
            page,
            pageSize,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
