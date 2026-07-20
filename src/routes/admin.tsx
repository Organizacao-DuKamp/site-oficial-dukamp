import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Package, Tag, FolderTree, Image as ImageIcon,
  Megaphone, Users, Settings, LogOut, ExternalLink, MessageSquare, Menu, ClipboardList, FileText, RefreshCw, Navigation,
  ShoppingBag, ChevronDown, BarChart3, History, ListOrdered, Boxes, UserSquare2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

type NavLeaf = { to: string; label: string; icon: any; exact?: boolean };
type NavGroup = { label: string; icon: any; basePath: string; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const NAV: NavEntry[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    label: "Estoque", icon: Boxes, basePath: "/admin/estoque",
    children: [
      { to: "/admin/estoque", label: "Painel", icon: BarChart3 },
      { to: "/admin/produtos", label: "Produtos", icon: Package },
      { to: "/admin/atualizar-valores", label: "Atualizar Valores", icon: RefreshCw },
      { to: "/admin/catalogos", label: "Catálogos", icon: FolderTree },
      { to: "/admin/categorias", label: "Categorias", icon: Tag },
    ],
  },
  {
    label: "Vendas", icon: ShoppingBag, basePath: "/admin/vendas",
    children: [
      { to: "/admin/vendas/pedidos", label: "Lista de Pedidos", icon: ListOrdered },
      { to: "/admin/vendas/historico", label: "Histórico de Vendas", icon: History },
      { to: "/admin/vendas/painel", label: "Painel", icon: BarChart3 },
    ],
  },
  { to: "/admin/equipe-vendas", label: "Equipe de Vendas", icon: UserSquare2 },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/anuncios", label: "Anúncios", icon: Megaphone },
  { to: "/admin/atendimentos", label: "Atendimentos", icon: MessageSquare },
  { to: "/admin/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { to: "/admin/contas", label: "Contas", icon: Users },
  { to: "/admin/navbar", label: "Menu (Navbar)", icon: Navigation },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { to: "/admin/footer", label: "Footer", icon: FileText },
];

function isGroup(n: NavEntry): n is NavGroup {
  return (n as NavGroup).children !== undefined;
}

function SidebarContent({ pathname, onNavigate, signOut, isMaster }: { pathname: string; onNavigate?: () => void; signOut: () => void; isMaster: boolean }) {
  const items = NAV.filter((n) => isGroup(n) || n.to !== "/admin/contas" || isMaster);
  return (
    <>
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2 px-4 h-16 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">D</div>
        <div>
          <div className="font-bold text-sm">Dukamp</div>
          <div className="text-[10px] text-muted-foreground">Painel Admin</div>
        </div>
      </Link>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((n) => {
          if (isGroup(n)) {
            const groupActive =
              pathname.startsWith(n.basePath) ||
              n.children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
            return (
              <details key={n.label} open={groupActive} className="group">
                <summary className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer list-none ${groupActive ? "bg-accent" : "hover:bg-accent"}`}>
                  <n.icon className="h-4 w-4" />
                  <span className="flex-1">{n.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-1 ml-3 pl-3 border-l space-y-1">
                  {n.children.map((c) => {
                    const active = pathname === c.to || pathname.startsWith(c.to + "/");
                    return (
                      <Link
                        key={c.to}
                        to={c.to}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      >
                        <c.icon className="h-3.5 w-3.5" /> {c.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          }
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t space-y-1">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent">
          <ExternalLink className="h-4 w-4" /> Ver site
        </Link>
        <button onClick={() => { onNavigate?.(); signOut(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );
}

function AdminLayout() {
  const { user, isAdmin, isMasterAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center text-center px-4">
        <div>
          <h1 className="text-xl font-bold">Acesso negado</h1>
          <p className="text-sm text-muted-foreground mt-2">Sua conta não tem permissão de administrador.</p>
          <Button className="mt-4" variant="outline" onClick={() => signOut()}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden lg:flex w-60 bg-sidebar border-r flex-col shrink-0">
        <SidebarContent pathname={pathname} signOut={signOut} isMaster={isMasterAdmin} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-2 border-b bg-card px-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 flex flex-col">
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} signOut={signOut} isMaster={isMasterAdmin} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary grid place-items-center text-primary-foreground font-bold text-sm">D</div>
            <span className="font-bold text-sm">Painel Admin</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
