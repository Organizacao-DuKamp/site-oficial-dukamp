import { createClient } from "@supabase/supabase-js";
import { plainText, SITE_URL, PUBLIC_PAGES, isPublicPage, sitemapXml, xmlEscape, absoluteUrl } from "./seo";

const PAGE_SIZE = 1000;
// Anonymous, stateless client: sitemap never bypasses RLS or reads account data.
function publicCatalog() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Catálogo público indisponível");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) } });
}
function xmlResponse(body: string) { return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300", "X-Content-Type-Options": "nosniff" } }); }
export function robotsText(preview = false) {
  return preview ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /_server/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
export async function seoResponse(request: Request): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.pathname === "/robots.txt") return new Response(request.method === "HEAD" ? null : robotsText(url.hostname !== new URL(SITE_URL).hostname && url.hostname !== "localhost" && url.hostname !== "127.0.0.1"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
  if (!/^\/sitemap(?:-pages|-products-\d+)?\.xml$/.test(url.pathname)) return null;
  try {
    const db = publicCatalog();
    let response: Response;
    if (url.pathname === "/sitemap.xml") {
      const { count, error } = await db.from("products").select("id", { count: "exact", head: true }).eq("active", true);
      if (error) throw error;
      const paths = ["/sitemap-pages.xml", ...Array.from({ length: Math.ceil((count || 0) / PAGE_SIZE) }, (_, i) => `/sitemap-products-${i + 1}.xml`)];
      response = xmlResponse('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + paths.map(path => `<sitemap><loc>${xmlEscape(absoluteUrl(path))}</loc></sitemap>`).join("") + '</sitemapindex>');
    } else if (url.pathname === "/sitemap-pages.xml") {
      const entries = Object.keys(PUBLIC_PAGES).map(path => ({ path }));
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await db.from("catalogs").select("slug").eq("active", true).order("id").range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        entries.push(...(data || []).map(c => ({ path: `/catalogos/${encodeURIComponent(c.slug)}` })));
        if ((data || []).length < PAGE_SIZE) break;
      }
      const [sellers, pages] = await Promise.all([
        db.from("sellers").select("slug").eq("active", true).order("id"),
        db.from("site_settings").select("key,value").in("key", ["footer_page:como-comprar", "footer_page:politica-de-entrega", "footer_page:trocas-e-devolucoes", "footer_page:privacidade-e-protecao-de-dados", "footer_page:seguranca-e-privacidade", "footer_page:termos-e-condicoes"]),
      ]);
      if (sellers.error) throw sellers.error;
      if (pages.error) throw pages.error;
      entries.push(...(sellers.data || []).filter(s => !s.slug.startsWith("conta-")).map(s => ({ path: `/equipe-de-vendas/${encodeURIComponent(s.slug)}` })));
      entries.push(...(pages.data || []).filter(p => plainText((p.value as { html?: string } | null)?.html)).map(p => ({ path: `/paginas/${encodeURIComponent(p.key.replace("footer_page:", ""))}` })));
      response = xmlResponse(sitemapXml(entries));
    } else {
      const page = Number(url.pathname.match(/products-(\d+)/)![1]);
      if (!Number.isSafeInteger(page) || page < 1) return new Response(null, { status: 404 });
      const from = (page - 1) * PAGE_SIZE;
      const { data, error } = await db.from("products").select("slug,updated_at").eq("active", true).order("id").range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data?.length) return new Response(null, { status: 404 });
      response = xmlResponse(sitemapXml(data.map(p => ({ path: `/produtos/${encodeURIComponent(p.slug)}`, updated_at: p.updated_at }))));
    }
    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  } catch (error) {
    console.error("[seo] Falha ao gerar sitemap", error);
    return new Response("Sitemap temporariamente indisponível", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
export function protectIndexing(request: Request, response: Response) {
  const url = new URL(request.url);
  const preview = url.hostname.endsWith("--dukamp.netlify.app");
  if (preview || !isPublicPage(url.pathname) || response.status >= 400 || url.searchParams.has("q")) {
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noindex, follow");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
}
