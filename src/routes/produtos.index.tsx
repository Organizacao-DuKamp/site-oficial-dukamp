import { seoHead, PUBLIC_PAGES } from "@/lib/seo";
import { activeCatalogs, listedProducts } from "@/lib/catalog-queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";

type Search = { q?: string; categoria?: string; page?: number };
const PAGE_SIZE = 24;

export const Route = createFileRoute("/produtos/")({
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, context }) => {
    const catalogsPromise = context.queryClient.ensureQueryData({ queryKey: ["catalogs"], queryFn: activeCatalogs });
    const loadProducts = (catId?: string) => context.queryClient.ensureQueryData({
      queryKey: ["products", { q: deps.q, catId, page: deps.page || 1 }],
      queryFn: () => listedProducts({ q: deps.q, catId, page: deps.page }),
    });
    // A normal search does not need to wait for the categories request.
    if (!deps.categoria) {
      const [catalogs, products] = await Promise.all([catalogsPromise, loadProducts()]);
      return { catalogs, products, category: undefined };
    }
    const catalogs = await catalogsPromise;
    const category = catalogs.find(c => c.slug === deps.categoria);
    const products = category ? await loadProducts(category.id) : { rows: [], count: 0 };
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
  pendingMs: 150,
  pendingMinMs: 150,
  pendingComponent: ProductsPending,
});

function ProductsPending() {
  return (
    <SiteLayout>
      <div role="status" aria-live="polite" className="mb-6 flex items-center gap-3 rounded-xl border bg-card p-4">
        <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
        <p className="font-medium">Buscando produtos...</p>
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-xl border bg-muted" />)}
      </div>
    </SiteLayout>
  );
}

function Page() {
  const { q, categoria, page = 1 } = Route.useSearch();
  const initial = Route.useLoaderData();
  const products = initial.products;
  const total = products.count;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold mb-2">{initial.category?.name || "Produtos Veterinários, Rações e Suplementos"}</h1>
      {q && <p className="text-sm text-muted-foreground mb-4">Resultados para "{q}"</p>}
      {categoria && <p className="text-sm text-muted-foreground mb-4">Categoria: {categoria}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {products.rows.map((p) => <ProductCard key={p.id} p={p as any} />)}
      </div>
      {products.rows.length === 0 && (
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
