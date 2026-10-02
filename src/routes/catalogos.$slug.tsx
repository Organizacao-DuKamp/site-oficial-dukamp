import { seoHead, descriptionText } from "@/lib/seo";
import { categoryProducts } from "@/lib/catalog-queries";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/catalogos/$slug")({
  loader: async ({ params }) => {
    const { data: catalog, error } = await supabase.from("catalogs").select("*").eq("slug", params.slug).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!catalog) throw notFound();
    return { catalog, products: await categoryProducts(catalog.id) };
  },
  head: ({ loaderData, params }) => seoHead({ title: loaderData ? `${loaderData.catalog.name} | DuKamp Saúde Animal` : "Catálogo não encontrado | DuKamp", description: descriptionText(loaderData?.catalog.description, `Confira ${loaderData?.catalog.name || "os produtos"} da DuKamp para saúde e nutrição animal. Veja os produtos e sua disponibilidade.`), path: `/catalogos/${encodeURIComponent(params.slug)}`, noindex: !loaderData }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const initial = Route.useLoaderData();
  const cat = useQuery({
    initialData: initial.catalog,
    queryKey: ["catalog", slug],
    queryFn: async () => {
      const { data } = await supabase.from("catalogs").select("*").eq("slug", slug).eq("active", true).maybeSingle();
      return data;
    },
  });
  const prods = useQuery({
    initialData: initial.products,
    enabled: !!cat.data?.id,
    queryKey: ["catalog", slug, "products"],
    queryFn: () => categoryProducts(cat.data!.id),
  });
  if (!cat.data) return <SiteLayout><p>Catálogo não encontrado.</p></SiteLayout>;
  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold">{cat.data.name}</h1>
      {cat.data.description && <p className="text-muted-foreground mt-1">{cat.data.description}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-6">
        {prods.data?.map((p) => <ProductCard key={p.id} p={p as any} />)}
      </div>
    </SiteLayout>
  );
}
