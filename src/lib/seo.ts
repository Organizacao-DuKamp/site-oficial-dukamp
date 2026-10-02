import { priceForAccount, type PricingProduct } from "./pricing";

// Confirmed production URL. Change this once a custom domain is connected.
export const SITE_URL = "https://dukamp.netlify.app";
export const SITE_TITLE = "DuKamp Saúde Animal | Rações e Produtos Veterinários";
export const SITE_DESCRIPTION = "Rações, suplementos e produtos veterinários para bovinos, equinos e pets. Conheça a DuKamp em Monte Aprazível e São José do Rio Preto, SP.";
export const SITE_IMAGE = `${SITE_URL}/dukamp-social.png`;
export const PUBLIC_PAGES: Record<string, [string, string]> = {
  "/": [SITE_TITLE, SITE_DESCRIPTION],
  "/produtos": ["Produtos Veterinários, Rações e Suplementos | DuKamp", "Conheça os produtos da DuKamp para saúde e nutrição animal: medicamentos veterinários, rações, suplementos e itens para a pecuária."],
  "/catalogos": ["Catálogos de Saúde e Nutrição Animal | DuKamp", "Explore as categorias de produtos veterinários, rações e suplementos da DuKamp para bovinos, equinos e outros animais."],
  "/sobre": ["Sobre a DuKamp | Saúde e Nutrição Animal", "Conheça a DuKamp Saúde Animal e sua atuação no fornecimento de rações, suplementos e produtos veterinários para a pecuária."],
  "/unidades": ["DuKamp em Monte Aprazível e São José do Rio Preto", "Veja os endereços e contatos da matriz da DuKamp em Monte Aprazível e da filial em São José do Rio Preto, SP."],
  "/contato": ["Contato da DuKamp | Monte Aprazível e Rio Preto", "Entre em contato com a DuKamp para informações sobre produtos veterinários, rações, suplementos e atendimento."],
  "/equipe-de-vendas": ["Equipe de Vendas e Representantes | DuKamp", "Conheça os representantes da DuKamp e fale com nossa equipe sobre saúde e nutrição animal."],
};
export function cleanPath(path: string) { return path.replace(/\/+$/, "") || "/"; }
export function isPublicPage(path: string) {
  const p = cleanPath(path);
  return Boolean(PUBLIC_PAGES[p]) || /^\/(produtos|catalogos|paginas|equipe-de-vendas)\/[^/]+$/.test(p);
}
export function absoluteUrl(path: string) { return new URL(path, SITE_URL).href; }
export function plainText(html: string | null | undefined) {
  return (html || "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ").trim();
}
export function descriptionText(html: string | null | undefined, fallback: string) {
  const text = plainText(html) || fallback;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}
export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
export function seoHead({ title, description, path, image = SITE_IMAGE, noindex = false, type = "website", schema }: {
  title: string; description: string; path: string; image?: string; noindex?: boolean; type?: string; schema?: unknown;
}) {
  const url = absoluteUrl(path);
  return {
    meta: [
      { title }, { name: "description", content: description },
      { name: "robots", content: noindex ? "noindex, follow" : "index, follow, max-image-preview:large" },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:url", content: url }, { property: "og:type", content: type },
      { property: "og:site_name", content: "DuKamp Saúde Animal" }, { property: "og:locale", content: "pt_BR" },
      { property: "og:image", content: image }, { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: title },
      { name: "twitter:description", content: description }, { name: "twitter:image", content: image },
    ],
    links: noindex ? [] : [{ rel: "canonical", href: url }],
    scripts: schema ? [{ type: "application/ld+json", children: safeJsonLd(schema) }] : [],
  };
}
export type SeoProduct = PricingProduct & { name: string; slug: string; description?: string | null; images?: string[] | null; brand?: string | null; code?: string; stock?: number; catalogs?: { name?: string; slug?: string } | null };
export function productSeo(product: SeoProduct) {
  const path = `/produtos/${encodeURIComponent(product.slug)}`;
  const title = `${product.name} | DuKamp Saúde Animal`;
  const description = descriptionText(product.description, `${product.name}${product.brand ? ` da ${product.brand}` : ""} na DuKamp Saúde Animal. Confira preço, disponibilidade e informações do produto.`);
  const images = (product.images || []).filter(src => /^https?:\/\//.test(src) || src.startsWith("/")).map(absoluteUrl);
  const price = priceForAccount(product, "cliente");
  const breadcrumbs = [{ "@type": "ListItem", position: 1, name: "Início", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Produtos", item: absoluteUrl("/produtos") }];
  if (product.catalogs?.slug && product.catalogs.name) breadcrumbs.push({ "@type": "ListItem", position: 3, name: product.catalogs.name, item: absoluteUrl(`/catalogos/${encodeURIComponent(product.catalogs.slug)}`) });
  breadcrumbs.push({ "@type": "ListItem", position: breadcrumbs.length + 1, name: product.name, item: absoluteUrl(path) });
  return seoHead({ title, description, path, image: images[0] || SITE_IMAGE, type: "product", schema: {
    "@context": "https://schema.org", "@graph": [
      { "@type": "Product", "@id": `${absoluteUrl(path)}#product`, name: product.name, description, url: absoluteUrl(path),
        ...(images.length ? { image: images } : {}), ...(product.code ? { sku: product.code } : {}),
        ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
        ...(product.catalogs?.name ? { category: product.catalogs.name } : {}),
        ...(Number.isFinite(price) && price > 0 ? { offers: { "@type": "Offer", url: absoluteUrl(path), priceCurrency: "BRL", price: price.toFixed(2), availability: `https://schema.org/${Number(product.stock) > 0 ? "InStock" : "OutOfStock"}`, itemCondition: "https://schema.org/NewCondition", seller: { "@id": `${SITE_URL}/#organization` } } } : {}),
      }, { "@type": "BreadcrumbList", itemListElement: breadcrumbs },
    ],
  } });
}
export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "DuKamp Saúde Animal", url: SITE_URL, logo: `${SITE_URL}/dukamp-logo.webp`, email: "contato@dukamp.com.br", location: [{ "@id": `${SITE_URL}/unidades#matriz` }, { "@id": `${SITE_URL}/unidades#filial` }] },
    { "@type": "Store", "@id": `${SITE_URL}/unidades#matriz`, name: "DuKamp — Matriz Monte Aprazível", url: absoluteUrl("/unidades"), telephone: "+55-17-3275-3106", parentOrganization: { "@id": `${SITE_URL}/#organization` }, address: { "@type": "PostalAddress", streetAddress: "Av. Santos Dumont, 403", addressLocality: "Monte Aprazível", addressRegion: "SP", addressCountry: "BR" } },
    { "@type": "Store", "@id": `${SITE_URL}/unidades#filial`, name: "DuKamp — Filial São José do Rio Preto", url: absoluteUrl("/unidades"), telephone: "+55-17-2136-1111", parentOrganization: { "@id": `${SITE_URL}/#organization` }, address: { "@type": "PostalAddress", streetAddress: "R. Pedro Amaral, 3409 — Vila Ercília", addressLocality: "São José do Rio Preto", addressRegion: "SP", postalCode: "15014-000", addressCountry: "BR" } },
  ],
};
export function xmlEscape(text: string) { return text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!); }
export function sitemapXml(entries: { path: string; updated_at?: string | null }[]) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries.map(e => `<url><loc>${xmlEscape(absoluteUrl(e.path))}</loc>${e.updated_at && Number.isFinite(Date.parse(e.updated_at)) ? `<lastmod>${new Date(e.updated_at).toISOString()}</lastmod>` : ""}</url>`).join("") + '</urlset>';
}
