import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mercado-livre/notifications")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { service: "mercado-livre", mode: "read_only", version: process.env.COMMIT_REF || null },
          { headers: { "Cache-Control": "no-store" } },
        ),
      POST: async ({ request }) => {
        const { getMercadoLivreService } = await import("@/lib/mercado-livre.server");
        return (await getMercadoLivreService()).notifications(request);
      },
    },
  },
});
