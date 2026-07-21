import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { InstitutionalSidebar } from "./InstitutionalSidebar";
import { NavbarQuoteTicker } from "./NavbarQuoteTicker";
import { supabase } from "@/integrations/supabase/client";
import { useNavItems, type NavItem } from "@/lib/navbar-settings";
import { useAuth, priceForAccount } from "@/lib/auth";
import { optimizedImage } from "@/lib/image-url";

// Categorias fixas que aparecem no mega-menu de Produtos, na ordem desejada.
// "Suplementos Minerais" reaproveita o catálogo existente "suplementos-naturais".
const FEATURED_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "suplementos-minerais",     label: "Suplementos Minerais" },
  { slug: "racoes-gado-corte",        label: "Rações Gado de Corte" },
  { slug: "racoes-gado-leiteiro",     label: "Rações Gado Leiteiro" },
  { slug: "nucleos",                  label: "Núcleos" },
  { slug: "concentrados",             label: "Concentrados" },
  { slug: "proteinados-energeticos",  label: "Proteinados Energéticos" },
  { slug: "equinos",                  label: "Equinos" },
  { slug: "ovinos",                   label: "Ovinos" },
  { slug: "confinamento-grao-inteiro",label: "Confinamento Grão Inteiro" },
  { slug: "aditivados-premium",       label: "Aditivados Premium" },
  { slug: "vermifugos",               label: "Vermífugos" },
  { slug: "antibioticos",             label: "Antibióticos" },
  { slug: "antiinflamatorio",         label: "Antiinflamatório" },
  { slug: "vacinas-cat",              label: "Vacinas" },
  { slug: "reproducao",               label: "Reprodução" },
  { slug: "demais-medicamentos",      label: "Demais Medicamentos" },
  { slug: "ferragens",                label: "Ferragens" },
  { slug: "arames",                   label: "Arames" },
  { slug: "lonas-e-coberturas",       label: "Lonas e Coberturas" },
  { slug: "utensilios-gerais",        label: "Utensílios Gerais" },
  { slug: "sementes",                 label: "Sementes" },
  { slug: "defensivos",               label: "Defensivos" },
  { slug: "pets",                     label: "Pets" },
];

function useCategories() {
  return useQuery({
    queryKey: ["catalogs", "nav"],
    queryFn: async () => {
      const { data } = await supabase
        .from("catalogs")
        .select("id,name,slug")
        .eq("active", true);
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

function useCategoryPreview(catalogId: string | undefined) {
  return useQuery({
    queryKey: ["nav-preview", catalogId],
    enabled: !!catalogId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,images,price,consumer_price,producer_price")
        .eq("active", true)
        .eq("catalog_id", catalogId!)
        .order("name")
        .limit(4);
      return data ?? [];
    },
  });
}

function DesktopItem({ item }: { item: NavItem }) {
  const cats = useCategories();
  const { accountType } = useAuth();

  const featured = useMemo(() => {
    if (item.key !== "produtos") return [] as { slug: string; label: string; id?: string }[];
    const bySlug = new Map((cats.data ?? []).map((c: any) => [c.slug as string, c]));
    return FEATURED_CATEGORIES
      .map((f) => {
        const c: any = bySlug.get(f.slug);
        if (!c) return null;
        return { slug: f.slug, label: f.label, id: c.id as string };
      })
      .filter(Boolean) as { slug: string; label: string; id: string }[];
  }, [cats.data, item.key]);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const currentSlug = activeSlug ?? featured[0]?.slug ?? null;
  const currentCat = featured.find((f) => f.slug === currentSlug);
  const preview = useCategoryPreview(currentCat?.id);

  if (item.key === "produtos") {
    return (
      <li className="relative group" onMouseLeave={() => setActiveSlug(null)}>
        <Link
          to={item.to}
          className="flex items-center gap-1 px-4 py-3 hover:bg-white/10 transition-colors"
          activeProps={{ className: "flex items-center gap-1 px-4 py-3 bg-white/15" }}
        >
          {item.label} <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Link>
        {/* Mega panel */}
        <div
          className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute left-0 top-full z-50 pt-1
                     translate-y-1 group-hover:translate-y-0 transition-all duration-200 ease-out"
        >
          <div className="rounded-b-md bg-white text-foreground shadow-xl border border-black/10 w-[min(95vw,880px)] overflow-hidden">
            <div className="grid grid-cols-[minmax(220px,260px)_1fr]">
              {/* Left: categories */}
              <div className="border-r bg-muted/30 p-2 max-h-[70vh] overflow-y-auto">
                <ul className="flex flex-col">

                  {featured.length === 0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Nenhuma categoria</li>
                  )}
                  {featured.map((c) => {
                    const active = c.slug === currentSlug;
                    return (
                      <li key={c.slug}>
                        <Link
                          to="/produtos"
                          search={{ categoria: c.slug } as any}
                          onMouseEnter={() => setActiveSlug(c.slug)}
                          onFocus={() => setActiveSlug(c.slug)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          <span className="truncate">{c.label}</span>
                          <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-40"}`} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t mt-2 pt-2">
                  <Link
                    to="/produtos"
                    className="block px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md"
                  >
                    Ver todos os produtos →
                  </Link>
                </div>
              </div>

              {/* Right: preview */}
              <div className="p-3">
                {!currentCat ? (
                  <div className="h-full grid place-items-center text-sm text-muted-foreground py-8">
                    Passe o mouse em uma categoria para ver os produtos.
                  </div>
                ) : (
                  <div key={currentSlug} className="animate-fade-in">
                    <div className="flex items-baseline justify-between mb-2 px-1">
                      <Link
                        to="/produtos"
                        search={{ categoria: currentCat.slug } as any}
                        className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {currentCat.label}
                      </Link>
                    </div>

                    {preview.isLoading ? (
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="rounded-md border bg-muted/30 h-[140px] animate-pulse" />
                        ))}
                      </div>
                    ) : preview.data && preview.data.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {preview.data.map((p: any) => {
                          const price = priceForAccount(p, accountType);
                          const img = p.images?.[0] ?? null;
                          return (
                            <Link
                              key={p.id}
                              to="/produtos/$slug"
                              params={{ slug: p.slug }}
                              className="group/card rounded-md border bg-card hover:border-primary hover:shadow-sm transition-all overflow-hidden flex flex-col"
                            >
                              <div className="aspect-square bg-muted grid place-items-center overflow-hidden">
                                <img
                                  src={optimizedImage(img, { width: 200 })}
                                  alt={p.name}
                                  loading="lazy"
                                  className="w-full h-full object-contain group-hover/card:scale-105 transition-transform"
                                />
                              </div>
                              <div className="p-1.5 flex-1 flex flex-col gap-0.5">
                                <div className="text-[11px] leading-tight line-clamp-2 min-h-[2rem]">{p.name}</div>
                                {price > 0 && (
                                  <div className="text-xs font-semibold text-primary">
                                    {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground px-1 py-8 text-center">
                        Nenhum produto nesta categoria ainda.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }

  if (item.key === "institucional") {
    return (
      <li className="relative group">
        <Link
          to={item.to}
          className="flex items-center gap-1 px-4 py-3 hover:bg-white/10 transition-colors"
          activeProps={{ className: "flex items-center gap-1 px-4 py-3 bg-white/15" }}
        >
          {item.label} <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Link>
        <div
          className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute left-0 top-full z-50 pt-1
                     translate-y-1 group-hover:translate-y-0 transition-all duration-200 ease-out"
        >
          <div className="rounded-b-md bg-white text-foreground shadow-xl border border-black/10 p-3 w-64">
            <Link
              to="/institucional/nossa-historia"
              className="block px-3 py-2 text-sm rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
            >
              Nossa História
            </Link>
            <Link
              to="/institucional/nossos-produtos"
              className="block px-3 py-2 text-sm rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
            >
              Nossos Produtos
            </Link>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={item.to}
        className="block px-4 py-3 hover:bg-white/10 transition-colors"
        activeProps={{ className: "block px-4 py-3 bg-white/15" }}
      >
        {item.label}
      </Link>
    </li>
  );
}


export function MainNav() {
  const [open, setOpen] = useState(false);
  const [mobileProdOpen, setMobileProdOpen] = useState(false);
  const { data: navItems } = useNavItems();
  const { user } = useAuth();
  const cats = useCategories();
  const baseItems = (navItems ?? []).filter((n) => n.visible);
  const items: NavItem[] = user
    ? [...baseItems, { key: "minhas-compras" as any, label: "Minhas Compras", to: "/minhas-compras", visible: true }]
    : baseItems;

  const mobileFeatured = useMemo(() => {
    const bySlug = new Map((cats.data ?? []).map((c: any) => [c.slug as string, c]));
    return FEATURED_CATEGORIES.filter((f) => bySlug.has(f.slug));
  }, [cats.data]);

  const mobCls = "block py-2.5 px-2 text-sm border-b hover:text-primary";

  return (
    <nav className="bg-[#0f4d2a] text-white border-b border-black/10">
      <div className="container mx-auto px-2">
        {/* Desktop */}
        <div className="hidden lg:flex items-center justify-between gap-4">
          <ul className="flex items-center gap-1 whitespace-nowrap text-sm font-medium">
            {items.map((it) => <DesktopItem key={it.key} item={it} />)}
          </ul>
          <div className="shrink-0">
            <NavbarQuoteTicker />
          </div>
        </div>

        {/* Mobile */}
        <div className="lg:hidden flex items-center justify-between py-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-sm font-medium">
              <Menu className="h-5 w-5" /> Menu
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:w-96 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Navegação</SheetTitle>
              </SheetHeader>
              <ul className="mt-4 flex flex-col">
                {items.map((it) => {
                  if (it.key === "produtos") {
                    return (
                      <li key={it.key} className="border-b">
                        <button
                          onClick={() => setMobileProdOpen((v) => !v)}
                          className="w-full flex items-center justify-between py-2.5 px-2 text-sm hover:text-primary"
                        >
                          <span>{it.label}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${mobileProdOpen ? "rotate-180" : ""}`} />
                        </button>
                        {mobileProdOpen && (
                          <div className="pb-2 pl-3">
                            <Link
                              to="/produtos"
                              onClick={() => setOpen(false)}
                              className="block py-1.5 text-sm font-medium text-primary"
                            >
                              Todos os produtos
                            </Link>
                            {mobileFeatured.map((c) => (
                              <Link
                                key={c.slug}
                                to="/produtos"
                                search={{ categoria: c.slug } as any}
                                onClick={() => setOpen(false)}
                                className="block py-1.5 text-sm text-muted-foreground hover:text-primary"
                              >
                                {c.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  }
                  if (it.key === "institucional") {
                    return (
                      <li key={it.key} className="border-b">
                        <div className="py-2.5 px-2 text-sm font-medium">{it.label}</div>
                        <div className="pb-2 pl-3">
                          <Link
                            to="/institucional/nossa-historia"
                            onClick={() => setOpen(false)}
                            className="block py-1.5 text-sm text-muted-foreground hover:text-primary"
                          >
                            Nossa História
                          </Link>
                          <Link
                            to="/institucional/nossos-produtos"
                            onClick={() => setOpen(false)}
                            className="block py-1.5 text-sm text-muted-foreground hover:text-primary"
                          >
                            Nossos Produtos
                          </Link>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={it.key}>
                      <Link to={it.to} onClick={() => setOpen(false)} className={mobCls}>
                        {it.label}
                      </Link>
                    </li>
                  );

                })}
              </ul>
              <div className="mt-6">
                <InstitutionalSidebar />
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-xs uppercase tracking-wider opacity-80 pr-2">Menu</span>
        </div>
      </div>
    </nav>
  );
}
