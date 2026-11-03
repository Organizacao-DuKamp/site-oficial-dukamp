import { seoHead, PUBLIC_PAGES } from "@/lib/seo";
import { activeCatalogs, listedProducts } from "@/lib/catalog-queries";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ["products", "infinite", { q, categoria, catId: initial.category?.id, page }],
    queryFn: ({ pageParam }) => listedProducts({ q, catId: initial.category?.id, page: pageParam }),
    initialPageParam: page,
    initialData: { pages: [initial.products], pageParams: [page] },
    enabled: !categoria || Boolean(initial.category),
    getNextPageParam: (lastPage, _pages, lastPageNumber) =>
      lastPage.rows.length > 0 && lastPageNumber * PAGE_SIZE < lastPage.count
        ? lastPageNumber + 1
        : undefined,
  });
  const seen = new Set<string>();
  const products = data.pages.flatMap(batch => batch.rows).filter(product => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetching || isFetchNextPageError || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void fetchNextPage({ cancelRefetch: false });
    }, { rootMargin: "600px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching, isFetchNextPageError]);

  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold mb-2">{initial.category?.name || "Produtos Veterinários, Rações e Suplementos"}</h1>
      {q && <p className="text-sm text-muted-foreground mb-4">Resultados para "{q}"</p>}
      {categoria && <p className="text-sm text-muted-foreground mb-4">Categoria: {categoria}</p>}
      <div aria-busy={isFetchingNextPage} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {products.map((p) => <ProductCard key={p.id} p={p as any} />)}
      </div>
      {products.length === 0 && (
        <p className="text-muted-foreground">Nenhum produto encontrado.</p>
      )}
      <div ref={loadMoreRef} className="mt-8 flex min-h-16 flex-col items-center justify-center gap-3 text-center">
        {isFetchingNextPage ? (
          <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
            Carregando mais produtos...
          </div>
        ) : isFetchNextPageError ? (
          <>
            <p role="alert" className="text-sm text-muted-foreground">Não foi possível carregar mais produtos.</p>
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void fetchNextPage({ cancelRefetch: false })}>Tentar novamente</Button>
          </>
        ) : hasNextPage ? (
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void fetchNextPage({ cancelRefetch: false })}>Carregar mais produtos</Button>
        ) : products.length > 0 ? (
          <p className="text-sm text-muted-foreground">Todos os produtos foram exibidos.</p>
        ) : null}
      </div>
    </SiteLayout>
  );
}
