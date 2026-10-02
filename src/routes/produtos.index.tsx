import { seoHead, PUBLIC_PAGES } from "@/lib/seo";
import { activeCatalogs, listedProducts } from "@/lib/catalog-queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";

type Search = { q?: string; categoria?: string; page?: number };
const PAGE_SIZE = 24;

export const Route = createFileRoute("/produtos/")({
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const catalogs = await activeCatalogs();
    const category = catalogs.find(c => c.slug === deps.categoria);
    const products = deps.categoria && !category ? { rows: [], count: 0 } : await listedProducts({ q: deps.q, catId: category?.id, page: deps.page });
    return { catalogs, products, category };
  },
  head: ({ loaderData, match }) => {
    const search = match.loaderDeps;
    const [baseTitle, description] = PUBLIC_PAGES["/produtos"];
    const page = search.page || 1;
    return seoHead({ title: page > 1 ? `Produtos — Página ${page} | DuKamp` : baseTitle, description, path: page > 1 ? `/produtos?page=${page}` : "/produtos", noindex: Boolean(search.q || search.categoria || (page > 1 && !loaderData?.products.rows.length)) });
  },
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    categoria: typeof s.categoria === "string" ? s.categoria : undefined,
    page: Number.isSafeInteger(Number(s.page)) && Number(s.page) > 0 ? Math.min(Number(s.page), 100000) : 1,
  }),
  component: Page,
});

function Page() {
  const { q, categoria, page = 1 } = Route.useSearch();
  const initial = Route.useLoaderData();
  const cats = useQuery({ queryKey: ["catalogs"], queryFn: activeCatalogs, initialData: initial.catalogs });
  const catId = cats.data?.find(c => c.slug === categoria)?.id;
  const prods = useQuery({
    queryKey: ["products", { q, catId, page }],
    initialData: initial.products,
    queryFn: () => categoria && !catId ? Promise.resolve({ rows: [], count: 0 }) : listedProducts({ q, catId, page }),
  });
  const total = prods.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold mb-2">{initial.category?.name || "Produtos Veterinários, Rações e Suplementos"}</h1>
      {q && <p className="text-sm text-muted-foreground mb-4">Resultados para "{q}"</p>}
      {categoria && <p className="text-sm text-muted-foreground mb-4">Categoria: {categoria}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {prods.data?.rows.map((p) => <ProductCard key={p.id} p={p as any} />)}
      </div>
      {prods.data && prods.data.rows.length === 0 && (
        <p className="text-muted-foreground">Nenhum produto encontrado.</p>
      )}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 ? <Button asChild variant="outline" size="sm"><Link to="/produtos" search={{ q, categoria, page: page - 1 }} rel="prev">Anterior</Link></Button> : <Button variant="outline" size="sm" disabled>Anterior</Button>}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {total} produtos
          </span>
          {page < totalPages ? <Button asChild variant="outline" size="sm"><Link to="/produtos" search={{ q, categoria, page: page + 1 }} rel="next">Próxima</Link></Button> : <Button variant="outline" size="sm" disabled>Próxima</Button>}
        </div>
      )}
    </SiteLayout>
  );
}
