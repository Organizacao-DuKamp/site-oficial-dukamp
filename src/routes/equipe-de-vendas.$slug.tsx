import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useSellerBySlug, useActiveSellers } from "@/lib/sellers";
import { SellerProfileBanner } from "@/components/sellers/SellerProfileBanner";
import { SellerCard } from "@/components/sellers/SellerCard";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/equipe-de-vendas/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Equipe de Vendas Dukamp` },
      { property: "og:title", content: `Equipe de Vendas Dukamp` },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: SellerDetailPage,
});

function SellerDetailPage() {
  const { slug } = Route.useParams();
  const { data: seller, isLoading } = useSellerBySlug(slug);
  const { data: allSellers } = useActiveSellers();

  const others = (allSellers ?? []).filter((s) => s.slug !== slug);

  return (
    <SiteLayout>
      <Link
        to="/equipe-de-vendas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à equipe
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !seller ? (
        <div className="text-center py-16 text-muted-foreground">Vendedor não encontrado.</div>
      ) : (
        <>
          <SellerProfileBanner seller={seller} />

          {others.length > 0 && (
            <section className="mt-12">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    Outros vendedores
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Escolha outro representante Dukamp
                  </p>
                </div>
                <Link
                  to="/equipe-de-vendas"
                  className="text-sm font-semibold text-[#d81f26] hover:underline shrink-0"
                >
                  Ver todos →
                </Link>
              </div>
              <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {others.map((s) => (
                  <SellerCard key={s.id} seller={s} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </SiteLayout>
  );
}
