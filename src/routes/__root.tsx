import { seoHead, PUBLIC_PAGES, SITE_TITLE, SITE_DESCRIPTION, cleanPath, isPublicPage, ORGANIZATION_SCHEMA } from "@/lib/seo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { AuthProvider } from "../lib/auth";
import { SupportProvider } from "../lib/support";
import { SupportWidget } from "../components/support/ChatLauncher";
import { DeliveryNoticeWatcher } from "../components/site/DeliveryNoticeWatcher";
import { SellerQuoteNotifications } from "../components/site/SellerQuoteNotifications";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente ou volte ao início.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >Tentar novamente</button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => {
    const path = cleanPath(matches.at(-1)?.pathname || "/");
    const [title, description] = PUBLIC_PAGES[path] || [SITE_TITLE, SITE_DESCRIPTION];
    const seo = seoHead({ title, description, path, noindex: !isPublicPage(path), schema: ORGANIZATION_SCHEMA });
    // Canonicals belong to the leaf route; links are not deduplicated like meta tags.
    return { ...seo, meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, ...seo.meta], links: [{ rel: "stylesheet", href: appCss }, { rel: "icon", type: "image/png", href: "/favicon.png" }] };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <SupportProvider>
            <Outlet />
            {location.pathname === "/auth" && (
              <a
                href="/recuperar-senha"
                className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-background/95 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur hover:bg-accent"
              >
                Esqueci minha senha
              </a>
            )}
            <SupportWidget />
            <DeliveryNoticeWatcher />
            <SellerQuoteNotifications />
            <Toaster />
          </SupportProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
