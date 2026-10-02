import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/institucional/nossa-historia")({
  component: NossaHistoriaPage,
  head: () => seoHead({ title: "Nossa História | DuKamp", description: "DuKamp Saúde Animal.", path: "/institucional/nossa-historia", noindex: true }),
});

function NossaHistoriaPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">Nossa História</h1>
        <p className="text-muted-foreground">Conteúdo em breve.</p>
      </div>
    </SiteLayout>
  );
}
