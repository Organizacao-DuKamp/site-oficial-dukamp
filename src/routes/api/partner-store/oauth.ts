import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/partner-store/oauth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { finishOAuth } = await import("@/lib/storefronts.server");
          return new Response(null, {
            status: 303,
            headers: {
              Location: await finishOAuth(request),
              "Set-Cookie":
                "dukamp_store_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/partner-store/oauth; Max-Age=0",
              "Cache-Control": "no-store",
            },
          });
        } catch {
          return new Response(null, {
            status: 303,
            headers: {
              Location: "/parceiro/site/definicoes?conexao=erro",
              "Cache-Control": "no-store",
            },
          });
        }
      },
    },
  },
});
