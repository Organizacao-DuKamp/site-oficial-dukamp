import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/account/effective-role")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;

        const { supabaseAdmin, user } = authorization;
        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        return Response.json(
          { accountTypeOverride: seller ? "vendedor" : null },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
