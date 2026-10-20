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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
      <div className="border-b p-5">
        <Link to="/parceiro" className="flex items-center gap-3" onClick={() => setOpen(false)}>
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
            <p className="text-xs text-muted-foreground">Parceiro Dukamp</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${pathname === l.to || (l.to !== "/parceiro" && pathname.startsWith(l.to + "/")) ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            <l.icon className="h-4 w-4" />
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={siteOpen}
          onClick={() => setSiteOpen((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${pathname.startsWith("/parceiro/site") ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
        >
          <Globe className="h-4 w-4" />
          <span className="flex-1">Gerenciar meu site</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${siteOpen ? "rotate-180" : ""}`} />
        </button>
        {siteOpen && (
          <div className="ml-5 space-y-1 border-l pl-3">
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
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    Vendas
                    <ChevronDown className={`h-3 w-3 ${salesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {salesOpen && (
                    <div className="ml-3 space-y-1 border-l pl-2">
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
                          className={`block rounded-md px-3 py-2 text-xs ${pathname === `/parceiro/site/vendas/${key}` ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
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
                  className={`block rounded-md px-3 py-2 text-sm ${pathname === `/parceiro/site/${section}` ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {label}
                </Link>
              ),
            )}
          </div>
        )}
      </nav>
      <div className="border-t p-4">
        <p className="mb-3 text-xs text-muted-foreground">Dukamp Saúde Animal</p>
        <button
          onClick={async () => {
            await signOut();
            await nav({ to: "/parceiro-login" });
          }}
          className="flex items-center gap-2 text-sm"
        >
          <LogOut className="h-4 w-4" />
          Sair do painel
        </button>
      </div>
    </>
  );
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
        {sidebar}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 sm:px-7">
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
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              {sidebar}
            </SheetContent>
          </Sheet>
          <p className="text-sm font-semibold">{settings.title}</p>
          <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {pathname.startsWith("/parceiro/site")
              ? "Minha loja parceira"
              : "Comissão definida pela Dukamp"}
          </span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-7">
          <PurchaseDraftProvider key={user.id}>
            <Outlet />
          </PurchaseDraftProvider>
        </main>
      </div>
    </div>
  );
}
