import { createFileRoute } from "@tanstack/react-router";
import { PartnerSaleDetails } from "@/components/partners/PartnerSaleDetails";
export const Route = createFileRoute("/parceiro/vendas/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <PartnerSaleDetails orderId={id} />;
}
