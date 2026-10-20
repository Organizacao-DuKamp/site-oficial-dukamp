import { createFileRoute } from "@tanstack/react-router";
import { StoreManagement } from "@/components/storefronts/StoreManagement";
export const Route = createFileRoute("/parceiro/site/")({ component: () => <StoreManagement /> });
