import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/partner-store/oauth")({
  server: { handlers: { GET: async () => new Response(null, {
    status: 303, headers: {
      Location: "/parceiro/site/definicoes",
      "Cache-Control": "no-store",
      "Set-Cookie": "dukamp_store_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/partner-store/oauth; Max-Age=0",
    },
  }) } },
});
