import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FooterPageSlug =
  | "como-comprar"
  | "politica-de-entrega"
  | "trocas-e-devolucoes"
  | "privacidade-e-protecao-de-dados"
  | "seguranca-e-privacidade"
  | "termos-e-condicoes";

export type FooterPage = { slug: FooterPageSlug; title: string; group: "informacoes" | "seguranca" };

export const FOOTER_PAGES: FooterPage[] = [
  { slug: "como-comprar", title: "Como Comprar", group: "informacoes" },
  { slug: "politica-de-entrega", title: "Política de Entrega", group: "informacoes" },
  { slug: "trocas-e-devolucoes", title: "Trocas e Devoluções", group: "informacoes" },
  { slug: "privacidade-e-protecao-de-dados", title: "Privacidade e Proteção de Dados", group: "informacoes" },
  { slug: "seguranca-e-privacidade", title: "Segurança e Privacidade", group: "seguranca" },
  { slug: "termos-e-condicoes", title: "Termos e Condições", group: "seguranca" },
];

export type FooterPageContent = { title: string; html: string };

export function footerPageKey(slug: string) {
  return `footer_page:${slug}`;
}

export function useFooterPage(slug: string) {
  return useQuery({
    queryKey: ["footer_page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", footerPageKey(slug))
        .maybeSingle();
      return (data?.value as FooterPageContent | null) ?? null;
    },
    staleTime: 60_000,
  });
}
