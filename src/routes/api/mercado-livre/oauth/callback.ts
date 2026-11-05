import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mercado-livre/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getMercadoLivreService } = await import("@/lib/mercado-livre.server");
        return (await getMercadoLivreService()).callback(request);
      },
    },
  },
});
