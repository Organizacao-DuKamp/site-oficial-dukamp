import { createFileRoute } from "@tanstack/react-router";

type SellerOption = {
  id: string;
  name: string;
};

export const Route = createFileRoute("/api/public/registered-sellers")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { listAllAuthUsers, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");

        try {
          const users = await listAllAuthUsers(supabaseAdmin);
          const sellers: SellerOption[] = [];

          for (const user of users) {
            const identity = await resolveSellerIdentity(supabaseAdmin, user);
            if (!identity) continue;

            const { error } = await supabaseAdmin
              .from("sellers")
              .update({ active: true })
              .eq("id", identity.sellerId);
            if (error) {
              console.error("[registered-sellers] Falha ao ativar vendedor:", error.message);
              continue;
            }

            sellers.push({ id: identity.sellerId, name: identity.name });
          }

          const unique = Array.from(
            new Map(sellers.map((seller) => [seller.id, seller] as const)).values(),
          ).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));

          return Response.json(
            { sellers: unique },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("[registered-sellers] Falha ao listar contas:", error);
          return Response.json(
            { error: "Não foi possível carregar os vendedores." },
            { status: 500, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
