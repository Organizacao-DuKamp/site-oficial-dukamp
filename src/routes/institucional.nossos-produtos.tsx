import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/institucional/nossos-produtos")({
  component: NossosProdutosPage,
  head: () => seoHead({ title: "Nossos Produtos | DuKamp", description: "DuKamp Saúde Animal.", path: "/institucional/nossos-produtos", noindex: true }),
});

function NossosProdutosPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">Nossos Produtos</h1>
        <p className="text-muted-foreground">Conteúdo em breve.</p>
      </div>
    </SiteLayout>
  );
}
