import { createFileRoute } from "@tanstack/react-router";

type SellerOption = {
  id: string;
  name: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const Route = createFileRoute("/api/public/registered-sellers")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const users = [];
        const perPage = 1000;
        let page = 1;

        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
          if (error) {
            console.error("[registered-sellers] Falha ao listar contas:", error.message);
            return Response.json({ error: "Não foi possível carregar os vendedores." }, { status: 500 });
          }

          users.push(...data.users);
          if (data.users.length < perPage) break;
          page += 1;
        }

        const sellers: SellerOption[] = [];

        for (const user of users) {
          const metadata = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;
          if (metadata.account_type_override !== "vendedor") continue;

          const sellerSlug = `conta-${user.id}`;
          const metadataSellerId = text(metadata.seller_record_id) || null;
          let seller: SellerOption | null = null;

          if (metadataSellerId) {
            const { data } = await supabaseAdmin
              .from("sellers")
              .select("id, name")
              .eq("id", metadataSellerId)
              .eq("active", true)
              .maybeSingle();
            seller = data;
          }

          if (!seller) {
            const { data, error } = await supabaseAdmin
              .from("sellers")
              .select("id, name")
              .eq("slug", sellerSlug)
              .maybeSingle();

            if (error) {
              console.error("[registered-sellers] Falha ao procurar vendedor:", error.message);
            } else if (data) {
              seller = data;
              await supabaseAdmin.from("sellers").update({ active: true }).eq("id", data.id);
            }
          }

          if (!seller) {
            const name =
              text(metadata.full_name) ||
              text(metadata.name) ||
              user.email ||
              `Vendedor ${user.id.slice(0, 8)}`;

            const { data, error } = await supabaseAdmin
              .from("sellers")
              .insert({ name, slug: sellerSlug, active: true })
              .select("id, name")
              .single();

            if (error?.code === "23505") {
              const retry = await supabaseAdmin
                .from("sellers")
                .select("id, name")
                .eq("slug", sellerSlug)
                .maybeSingle();
              seller = retry.data;
            } else if (error) {
              console.error("[registered-sellers] Falha ao criar vendedor:", error.message);
            } else {
              seller = data;
            }
          }

          if (!seller) continue;

          if (metadataSellerId !== seller.id) {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
              user_metadata: { ...metadata, seller_record_id: seller.id },
            });
            if (error) console.error("[registered-sellers] Falha ao salvar vínculo:", error.message);
          }

          const { error: teamError } = await supabaseAdmin
            .from("sellers")
            .update({ show_on_team: false })
            .eq("id", seller.id);
          if (teamError && !teamError.message.toLowerCase().includes("show_on_team")) {
            console.error("[registered-sellers] Falha ao ocultar vendedor interno:", teamError.message);
          }

          const { error: userLinkError } = await supabaseAdmin
            .from("sellers")
            .update({ user_id: user.id })
            .eq("id", seller.id);
          if (userLinkError && !userLinkError.message.toLowerCase().includes("user_id")) {
            console.error("[registered-sellers] Falha ao vincular conta:", userLinkError.message);
          }

          sellers.push(seller);
        }

        const unique = Array.from(new Map(sellers.map((seller) => [seller.id, seller])).values())
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

        return Response.json({ sellers: unique });
      },
    },
  },
});
