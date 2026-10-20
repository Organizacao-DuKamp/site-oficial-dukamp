import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  PackageSearch,
  Calculator,
  ShoppingCart,
  ClipboardList,
  Menu,
  LogOut,
  Store,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePartnerData, ErrorNotice } from "@/components/partners/PartnerUi";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import dukampLogo from "@/assets/dukamp-logo.webp";
import { PurchaseDraftProvider } from "@/components/partners/PurchaseDraft";
export const Route = createFileRoute("/parceiro")({ ssr: false, component: PartnerLayout });
const links = [
  { to: "/parceiro", label: "Visão geral", icon: LayoutDashboard },
  { to: "/parceiro/produtos", label: "Consultar produto", icon: PackageSearch },
  { to: "/parceiro/simular", label: "Simular compra", icon: Calculator },
  { to: "/parceiro/registrar", label: "Registrar venda", icon: ShoppingCart },
  { to: "/parceiro/vendas", label: "Gerenciar vendas", icon: ClipboardList },
];
function PartnerLayout() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const query = usePartnerData();
  const [open, setOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(pathname.startsWith("/parceiro/site"));
  const [salesOpen, setSalesOpen] = useState(pathname.startsWith("/parceiro/site/vendas"));
  useEffect(() => {
    if (!loading && !user) nav({ to: "/parceiro-login" });
  }, [loading, user, nav]);
  if (loading || (user && query.isPending))
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Carregando painel do parceiro...
      </div>
    );
  if (!user) return null;
  if (query.error || !query.data)
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <ErrorNotice error={query.error} retry={() => query.refetch()} />
        {isAdmin && (
          <Button asChild variant="outline">
            <Link to="/admin/parceiros">Voltar à administração</Link>
          </Button>
        )}
        <Button
          className="ml-2"
          onClick={async () => {
            await signOut();
            await nav({ to: "/parceiro-login" });
          }}
        >
          Trocar conta
        </Button>
      </main>
    );
  const { partner, settings } = query.data;
  const sidebar = (
    <>
      <div className="partner-sidebar-brand">
        <Link to="/parceiro" onClick={() => setOpen(false)} aria-label="DuKamp — painel do parceiro" className="partner-brand-logo"><img src={dukampLogo} alt="DuKamp Saúde Animal" width={150} height={50} /></Link>
        <p className="partner-sidebar-eyebrow">Área de parceiros</p>
        <Link to="/parceiro" className="partner-store-identity flex items-center gap-3" onClick={() => setOpen(false)}>
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              className="h-11 w-11 rounded-lg border bg-white object-contain"
              alt={`Logo ${partner.razao_social}`}
            />
          ) : (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{partner.razao_social}</p>
            <p className="partner-sidebar-caption">Sua loja parceira</p>
          </div>
        </Link>
      </div>
      <nav aria-label="Menu do parceiro" className="partner-sidebar-nav flex-1 space-y-1 overflow-y-auto p-3">
        <p className="partner-nav-label">Sua operação</p>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            aria-current={pathname === l.to || (l.to !== "/parceiro" && pathname.startsWith(l.to + "/")) ? "page" : undefined}
            className={`partner-nav-item flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${pathname === l.to || (l.to !== "/parceiro" && pathname.startsWith(l.to + "/")) ? "is-active" : ""}`}
          >
            <l.icon className="h-4 w-4" />
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={siteOpen}
          onClick={() => setSiteOpen((v) => !v)}
          className={`partner-nav-item partner-site-menu flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${pathname.startsWith("/parceiro/site") ? "is-active" : ""}`}
        >
          <Globe className="h-4 w-4" />
          <span className="flex-1">Gerenciar meu site</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${siteOpen ? "rotate-180" : ""}`} />
        </button>
        {siteOpen && (
          <div className="partner-subnav ml-5 space-y-1 border-l pl-3">
            {[
              ["definicoes", "Definições"],
              ["estoque", "Estoque"],
              ["vendas", "Vendas"],
              ["visao-geral", "Visão geral"],
              ["footer", "Footer"],
              ["navbar", "Navbar"],
              ["configuracoes", "Configurações"],
            ].map(([section, label]) =>
              section === "vendas" ? (
                <div key={section}>
                  <button
                    type="button"
                    aria-expanded={salesOpen}
                    onClick={() => setSalesOpen((v) => !v)}
                    className="partner-nav-item flex w-full items-center justify-between rounded-md px-3 py-2 text-sm"
                  >
                    Vendas
                    <ChevronDown className={`h-3 w-3 ${salesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {salesOpen && (
                    <div className="partner-subnav ml-3 space-y-1 border-l pl-2">
                      {[
                        ["painel", "Visão geral das vendas"],
                        ["nova", "Registrar venda"],
                        ["historico", "Histórico de vendas"],
                      ].map(([key, text]) => (
                        <Link
                          key={key}
                          to="/parceiro/site/$"
                          params={{ _splat: `vendas/${key}` }}
                          onClick={() => setOpen(false)}
                          aria-current={pathname === `/parceiro/site/vendas/${key}` ? "page" : undefined}
                          className={`partner-nav-item block rounded-md px-3 py-2 text-xs ${pathname === `/parceiro/site/vendas/${key}` ? "is-active" : ""}`}
                        >
                          {text}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={section}
                  to="/parceiro/site/$"
                  params={{ _splat: section }}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === `/parceiro/site/${section}` ? "page" : undefined}
                  className={`partner-nav-item block rounded-md px-3 py-2 text-sm ${pathname === `/parceiro/site/${section}` ? "is-active" : ""}`}
                >
                  {label}
                </Link>
              ),
            )}
          </div>
        )}
      </nav>
      <div className="partner-sidebar-footer border-t p-4">
        <p className="partner-sidebar-caption mb-3">Olá, {partner.nome_completo.split(" ")[0]}</p>
        <button
          onClick={async () => {
            await signOut();
            await nav({ to: "/parceiro-login" });
          }}
          className="partner-signout flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
        >
          <LogOut className="h-4 w-4" />
          Sair do painel
        </button>
      </div>
    </>
  );
  return (
    <div className="partner-dashboard flex min-h-screen">
      <aside className="partner-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col lg:flex">
        {sidebar}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="partner-topbar flex min-h-18 items-center gap-3 border-b px-4 py-3 sm:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Abrir menu do parceiro"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="partner-dashboard partner-sidebar flex w-72 flex-col p-0 [&>button]:text-white">
              <SheetTitle className="sr-only">Menu do parceiro</SheetTitle>
              <SheetDescription className="sr-only">Navegue pelo painel e gerencie suas vendas e comissões.</SheetDescription>
              {sidebar}
            </SheetContent>
          </Sheet>
          <div className="min-w-0"><p className="partner-topbar-caption">Seu espaço de negócios</p><p className="truncate text-sm font-semibold">{settings.title}</p></div>
          <span className="partner-account-label ml-auto hidden shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex">
            {pathname.startsWith("/parceiro/site")
              ? "Minha loja parceira"
              : "Parceiro DuKamp"}
          </span>
        </header>
        <main className="partner-workspace mx-auto max-w-7xl p-4 sm:p-6 xl:p-8">
          <PurchaseDraftProvider key={user.id}>
            <Outlet />
          </PurchaseDraftProvider>
        </main>
      </div>
    </div>
  );
}
