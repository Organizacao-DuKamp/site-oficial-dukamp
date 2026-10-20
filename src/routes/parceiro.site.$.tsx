import { createFileRoute } from "@tanstack/react-router";
import { StoreManagement } from "@/components/storefronts/StoreManagement";
export const Route = createFileRoute("/parceiro/site/$")({ component: Page });
function Page() {
  const { _splat } = Route.useParams();
  return <StoreManagement key={_splat} section={_splat} />;
}
