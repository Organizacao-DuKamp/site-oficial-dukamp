import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/institucional/nossos-produtos")({
  component: NossosProdutosPage,
  head: () => ({
    meta: [
      { title: "Nossos Produtos | Dukamp" },
      { name: "description", content: "Conheça a linha de produtos Dukamp." },
    ],
  }),
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
