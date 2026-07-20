import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/catalogos/$slug")({
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const cat = useQuery({
    queryKey: ["catalog", slug],
    queryFn: async () => {
      const { data } = await supabase.from("catalogs").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });
  const prods = useQuery({
    enabled: !!cat.data?.id,
    queryKey: ["catalog", slug, "products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("active", true).gt("stock", 0).eq("catalog_id", cat.data!.id);
      return data ?? [];
    },
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
