import { seoHead, PUBLIC_PAGES } from "@/lib/seo";
import { activeCatalogs } from "@/lib/catalog-queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/catalogos/")({
  loader: activeCatalogs,
  head: () => seoHead({ title: PUBLIC_PAGES["/catalogos"][0], description: PUBLIC_PAGES["/catalogos"][1], path: "/catalogos" }),
  component: Page,
});

function Page() {
  const { data } = useQuery({
    initialData: Route.useLoaderData(),
    queryKey: ["catalogs", "page"],
    queryFn: activeCatalogs,
  });
  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold mb-6">Catálogos</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((c) => (
          <Link key={c.id} to="/catalogos/$slug" params={{ slug: c.slug }} className="rounded-lg border bg-card p-6 hover:shadow-md hover:border-primary transition-all">
            <div className="text-lg font-semibold">{c.name}</div>
            {c.description && <p className="text-sm text-muted-foreground mt-2">{c.description}</p>}
          </Link>
        ))}
      </div>
    </SiteLayout>
  );
}