import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { RichContent } from "@/components/site/RichContent";
import { FOOTER_PAGES, useFooterPage } from "@/lib/footer-pages";

export const Route = createFileRoute("/paginas/$slug")({
  component: DynamicPage,
  head: ({ params }) => {
    const p = FOOTER_PAGES.find((x) => x.slug === params.slug);
    return { meta: [{ title: `${p?.title ?? "Página"} — Dukamp` }] };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <Link to="/" className="text-primary underline text-sm">Voltar ao início</Link>
    </SiteLayout>
  ),
});

function DynamicPage() {
  const { slug } = Route.useParams();
  const meta = FOOTER_PAGES.find((p) => p.slug === slug);
  if (!meta) throw notFound();

  const { data, isLoading } = useFooterPage(slug);
  const title = data?.title || meta.title;
  const html = data?.html?.trim();

  return (
    <SiteLayout>
      <article className="max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : html ? (
          <RichContent html={html} />
        ) : (
          <p className="text-sm text-muted-foreground">Conteúdo em breve.</p>
        )}
      </article>
    </SiteLayout>
  );
}
