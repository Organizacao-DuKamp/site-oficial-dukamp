import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock3, FileText, Home, LogOut, Menu, MessageSquare, UserCircle, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/vendedor")({
  ssr: false,
  component: SellerLayout,
});

function SellerSidebar({ pathname, close, signOut }: { pathname: string; close?: () => void; signOut: () => void }) {
  const links = [
    { to: "/vendedor", label: "Início", icon: Home, exact: true },
    { to: "/vendedor/clientes", label: "Clientes", icon: Users },
    { to: "/vendedor/area-azul", label: "Área Azul", icon: Clock3 },
    { to: "/vendedor/chat", label: "Conversas", icon: MessageSquare },
    { to: "/vendedor/orcamentos", label: "Orçamentos", icon: FileText },
    { to: "/vendedor/minha-conta", label: "Minha conta", icon: UserCircle },
  ];
  return (
    <>
      <Link to="/vendedor" onClick={close} className="flex h-16 items-center gap-2 border-b px-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">D</div>
        <div><div className="text-sm font-bold">Dukamp</div><div className="text-[10px] text-muted-foreground">Painel do Vendedor</div></div>
      </Link>
      <nav className="flex-1 space-y-1 p-2">
        {links.map((item) => {
          const active = item.exact ? pathname === item.to || pathname === `${item.to}/` : pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} onClick={close} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <button onClick={() => { close?.(); void signOut(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );
}

function SellerLayout() {
  const { user, accountType, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (isAdmin) navigate({ to: "/admin" });
    else if (accountType !== "vendedor") navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, accountType, navigate]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  if (!user || isAdmin || accountType !== "vendedor") return null;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar lg:flex"><SellerSidebar pathname={pathname} signOut={signOut} /></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-3 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col p-0"><SellerSidebar pathname={pathname} close={() => setMobileOpen(false)} signOut={signOut} /></SheetContent>
          </Sheet>
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">D</div>
          <span className="text-sm font-bold">Painel do Vendedor</span>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
