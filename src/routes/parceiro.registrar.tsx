import { createFileRoute } from "@tanstack/react-router";
import { PurchaseWorkspace } from "@/components/partners/PurchaseWorkspace";
export const Route = createFileRoute("/parceiro/registrar")({
  component: () => <PurchaseWorkspace mode="register" />,
});
