import { createFileRoute } from "@tanstack/react-router";

async function handle(request: Request) {
  const { getMercadoLivreService } = await import("@/lib/mercado-livre.server");
  return (await getMercadoLivreService()).admin(request);
}

export const Route = createFileRoute("/api/admin/mercado-livre")({
  server: {
    handlers: { GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) },
  },
});
