import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadStorefront } from "@/lib/storefronts.functions";
import { StorefrontLayout } from "@/components/storefronts/Storefront";
import { seoHead } from "@/lib/seo";
export const Route = createFileRoute("/$loja")({
  loader: async ({ params, location }) => {
    try {
      return await loadStorefront({
        data: {
          slug: params.loja,
          order_page: location.pathname.startsWith(`/${params.loja}/pedido/`),
        },
      });
    } catch (e) {
      if (e instanceof Error && /Muitas solicitações/.test(e.message)) throw e;
      throw notFound();
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? seoHead({
          title: `${loaderData.store.name} | Loja parceira Dukamp`,
          description: loaderData.store.tagline || loaderData.store.hero_text,
          path: `/${loaderData.store.slug}`,
          image: loaderData.store.logo_url || undefined,
        })
      : {},
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl p-12 text-center">
      <h1 className="text-2xl font-bold">Loja não encontrada</h1>
      <p className="mt-4">Confira o endereço ou fale com a loja parceira.</p>
      <a href="/" className="mt-6 inline-block text-primary underline">
        Voltar à Dukamp
      </a>
    </main>
  ),
  component: StorePage,
});

function StorePage() {
  return <StorefrontLayout data={Route.useLoaderData()} />;
}
