import { createFileRoute } from "@tanstack/react-router";
import { StorefrontPage } from "@/components/storefronts/Storefront";
export const Route = createFileRoute("/$loja/")({ component: () => <StorefrontPage /> });
