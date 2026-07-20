import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Search = { q?: string; categoria?: string; page?: number };
const PAGE_SIZE = 24;

export const Route = createFileRoute("/produtos/")({
  head: () => ({ meta: [{ title: "Produtos — Dukamp" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    categoria: typeof s.categoria === "string" ? s.categoria : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) || 1 : 1,
  }),
  component: Page,
});

function Page() {
  const { q, categoria, page = 1 } = Route.useSearch();
  const navigate = useNavigate({ from: "/produtos/" });
  const cats = useQuery({
    queryKey: ["catalogs"],
    queryFn: async () => (await supabase.from("catalogs").select("*").eq("active", true).order("name")).data ?? [],
  });
  const catId = cats.data?.find((c) => c.slug === categoria)?.id;
  const prods = useQuery({
    queryKey: ["products", { q, catId, page }],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let qy = supabase.from("products").select("*", { count: "exact" }).eq("active", true).gt("stock", 0);
      if (catId) qy = qy.eq("catalog_id", catId);
      if (q) qy = qy.ilike("name", `%${q}%`);
      const { data, count } = await qy
        .order("category_position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(from, to);
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const total = prods.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goto = (p: number) =>
    navigate({ search: (prev: Search) => ({ ...prev, page: p }) });

  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold mb-2">Produtos</h1>
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
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goto(page - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {total} produtos
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goto(page + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </SiteLayout>
  );
}
