import { createFileRoute } from "@tanstack/react-router";
import { PartnerSales } from "@/components/partners/PartnerSales";
export const Route = createFileRoute("/parceiro/vendas/")({ component: () => <PartnerSales /> });
