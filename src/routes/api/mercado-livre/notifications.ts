import { createFileRoute } from "@tanstack/react-router";

declare const __DUKAMP_BUILD_COMMIT__: string | null;

export const Route = createFileRoute("/api/mercado-livre/notifications")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { service: "mercado-livre", mode: "read_only", version: __DUKAMP_BUILD_COMMIT__ },
          { headers: { "Cache-Control": "no-store" } },
        ),
      POST: async ({ request }) => {
        const { getMercadoLivreService } = await import("@/lib/mercado-livre.server");
        return (await getMercadoLivreService()).notifications(request);
      },
    },
  },
});
