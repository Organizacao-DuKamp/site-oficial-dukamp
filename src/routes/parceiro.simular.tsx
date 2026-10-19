import { createFileRoute } from "@tanstack/react-router";
import { PurchaseWorkspace } from "@/components/partners/PurchaseWorkspace";
export const Route = createFileRoute("/parceiro/simular")({
  validateSearch: (search: Record<string, unknown>) => ({
    produto: typeof search.produto === "string" ? search.produto : undefined,
  }),
  component: Page,
});
function Page() {
  const { produto } = Route.useSearch();
  return <PurchaseWorkspace mode="simulate" initialProduct={produto} />;
}
