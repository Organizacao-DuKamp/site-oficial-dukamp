import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NavItemKey = "inicio" | "produtos" | "vendas" | "institucional" | "unidades" | "carrinho";

export type NavItem = {
  key: NavItemKey;
  label: string;
  to: string;
  visible: boolean;
};

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: "inicio",        label: "Início",           to: "/",                  visible: true },
  { key: "produtos",      label: "Produtos",         to: "/produtos",          visible: true },
  { key: "vendas",        label: "Equipe de Vendas", to: "/equipe-de-vendas",  visible: true },
  { key: "institucional", label: "Institucional",    to: "/institucional/nossa-historia", visible: true },
  { key: "unidades",      label: "Nossas Unidades",  to: "/unidades",          visible: true },
  { key: "carrinho",      label: "Meu Carrinho",     to: "/carrinho",          visible: true },
];


function mergeWithDefaults(items: unknown): NavItem[] {
  if (!Array.isArray(items)) return DEFAULT_NAV_ITEMS;
  const byKey = new Map<string, Partial<NavItem>>();
  for (const it of items) {
    if (it && typeof it === "object" && "key" in it) byKey.set(String((it as any).key), it as any);
  }
  return DEFAULT_NAV_ITEMS.map((d) => {
    const o = byKey.get(d.key) ?? {};
    return {
      key: d.key,
      label: typeof o.label === "string" && o.label.trim() ? o.label : d.label,
      to: typeof o.to === "string" && o.to.trim() ? o.to : d.to,
      visible: typeof o.visible === "boolean" ? o.visible : d.visible,
    };
  });
}

export function useNavItems() {
  return useQuery({
    queryKey: ["settings", "navbar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "navbar")
        .maybeSingle();
      const raw = (data?.value as any)?.items;
      return mergeWithDefaults(raw);
    },
    staleTime: 1000 * 60 * 5,
  });
}
