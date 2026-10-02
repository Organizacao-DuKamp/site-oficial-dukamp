import { seoHead, PUBLIC_PAGES } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useActiveSellers, loadActiveSellers } from "@/lib/sellers";
import { SellerCard } from "@/components/sellers/SellerCard";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/equipe-de-vendas/")({
  head: () => seoHead({ title: PUBLIC_PAGES["/equipe-de-vendas"][0], description: PUBLIC_PAGES["/equipe-de-vendas"][1], path: "/equipe-de-vendas" }),
  loader: loadActiveSellers,
  component: SellersPage,
});

function SellersPage() {
  const { data: sellers, isLoading } = useActiveSellers(Route.useLoaderData());

  return (
    <SiteLayout>
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        {/* Faixas decorativas — canto superior direito */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#f6c515]/90 md:h-52 md:w-52"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 -top-24 h-32 w-32 rounded-full bg-[#d81f26] md:h-44 md:w-44"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-20 top-10 h-2 w-24 rotate-[-18deg] rounded-full bg-[#f6c515] md:right-28 md:top-14 md:h-2.5 md:w-32"
          aria-hidden
        />

        <div className="relative">
          <h1 className="text-3xl font-black text-foreground">Equipe de Vendas</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Fale diretamente com um dos nossos representantes.
          </p>
        </div>
      </div>


      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !sellers?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhum vendedor cadastrado ainda.
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {sellers.map((s) => (
            <SellerCard key={s.id} seller={s} />
          ))}
        </div>
      )}
    </SiteLayout>
  );
}
