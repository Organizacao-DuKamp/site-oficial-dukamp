import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const moduleUrl = source => "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const taxUrl = moduleUrl(read("src/lib/tax.ts"));
const pricingUrl = moduleUrl(read("src/lib/pricing.ts").replace('"./tax"', JSON.stringify(taxUrl)));
const seo = await import(moduleUrl(read("src/lib/seo.ts").replace('"./pricing"', JSON.stringify(pricingUrl))));
const product = { name: 'Medicamento "Teste" 500 mL', slug: "teste-500ml", description: "<p>Descrição &amp; informações</p>", brand: "Fabricante", code: "001", stock: 3, producer_price: 100, images: ["https://example.com/foto.jpg"], catalogs: { name: "Saúde Animal", slug: "saude-animal" } };
const productSchema = value => JSON.parse(seo.productSeo(value).scripts[0].children)["@graph"][0];
test("offer matches the anonymous consumer price including tax and promotion", () => {
  assert.equal(productSchema(product).offers.price, "122.00");
  assert.equal(productSchema({ ...product, on_sale: true, sale_producer_price: 80 }).offers.price, "97.60");
  assert.equal(productSchema({ ...product, catalogs: { name: "Pets", slug: "pets" } }).offers.price, "100.00");
});
test("out of stock remains a product with an accurate unavailable offer", () => {
  assert.equal(productSchema({ ...product, stock: 0 }).offers.availability, "https://schema.org/OutOfStock");
  assert.equal(productSchema({ ...product, producer_price: 0, price: 0 }).offers, undefined);
});
test("metadata is specific and uses a single production canonical", () => {
  const head = seo.productSeo(product);
  assert.equal(head.meta.find(m => m.title)?.title, product.name + " | DuKamp Saúde Animal");
  assert.deepEqual(head.links, [{ rel: "canonical", href: "https://dukamp.netlify.app/produtos/teste-500ml" }]);
  assert.equal(head.meta.find(m => m.name === "description").content, "Descrição & informações");
});
test("private, API and placeholder routes are excluded from public indexing", () => {
  for (const path of ["/admin", "/admin/clientes", "/pedido/123", "/orcamento/123", "/auth", "/checkout", "/vendedor", "/api/teste", "/institucional/nossa-historia"]) assert.equal(seo.isPublicPage(path), false, path);
  for (const path of ["/", "/produtos/", "/produtos/teste", "/catalogos/saude", "/sobre", "/unidades"]) assert.equal(seo.isPublicPage(path), true, path);
  assert.equal(seo.seoHead({ title: "Conta", description: "Conta", path: "/auth", noindex: true }).links.length, 0);
});
test("structured data cannot close a script tag or inject HTML", () => {
  const malicious = '</script><script>alert("x")</script>\u2028';
  const result = seo.safeJsonLd({ text: malicious });
  assert.ok(!result.includes("<"));
  assert.equal(JSON.parse(result).text, malicious);
});
test("sitemap preserves encoded URLs, escapes XML and omits invented modification dates", () => {
  const xml = seo.sitemapXml([{ path: "/produtos/ração?a=1&b=2", updated_at: "2026-10-02T10:00:00Z" }, { path: "/sobre", updated_at: "invalid" }]);
  assert.ok(xml.includes("ra%C3%A7%C3%A3o?a=1&amp;b=2"));
  assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
  assert.ok(xml.includes("2026-10-02T10:00:00.000Z"));
});
