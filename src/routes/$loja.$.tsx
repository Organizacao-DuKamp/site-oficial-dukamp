import { createFileRoute } from "@tanstack/react-router";
import { StorefrontPage } from "@/components/storefronts/Storefront";
export const Route = createFileRoute("/$loja/$")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      {
        name: "robots",
        content:
          params._splat?.startsWith("pedido/") || params._splat === "carrinho"
            ? "noindex, nofollow"
            : "index, follow",
      },
    ],
  }),
  component: Page,
});
function Page() {
  const { _splat } = Route.useParams();
  return <StorefrontPage key={_splat} path={_splat} />;
}
