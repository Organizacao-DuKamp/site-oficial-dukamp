import { createFileRoute } from "@tanstack/react-router";
import { PartnerSales } from "@/components/partners/PartnerSales";
export const Route = createFileRoute("/admin/parceiros/vendas")({
  component: () => <PartnerSales admin />,
});
