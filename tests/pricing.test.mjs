import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const moduleUrl = source => "data:text/javascript;base64," +
  Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const taxUrl = moduleUrl(read("src/lib/tax.ts"));
const pricing = await import(moduleUrl(read("src/lib/pricing.ts").replace('"./tax"', JSON.stringify(taxUrl))));
const { priceForAccount, regularPriceForAccount, pixPriceForAccount, consumerTaxRate } = pricing;
const product = { producer_price: 100, consumer_price: 122, catalogs: { name: "Nutrição Animal" } };

test("consumer and anonymous use 18%, rural producer keeps the base", () => {
  assert.equal(priceForAccount(product), 118);
  assert.equal(priceForAccount(product, "cliente"), 118);
  assert.equal(priceForAccount(product, "produtor"), 100);
  assert.equal(consumerTaxRate(product), 0.18);
  assert.equal(consumerTaxRate(product, "produtor"), 0);
});
for (const [name, slug] of [
  ["Arames", "arames"], ["Ferragens", "ferragens"], ["Pets", "pets"], ["Utensílios Gerais", "utensilios-gerais"],
  ["Lonas e Coberturas", "lonas-e-coberturas"], ["Arames e Ferragens", "arames-e-ferragens"],
]) {
  test(name + " is exempt for both consumer and producer", () => {
    for (const catalogs of [{ name }, { slug }, { name: "  " + name.toUpperCase() + "  " }]) {
      const p = { ...product, catalogs };
      assert.equal(priceForAccount(p), 100);
      assert.equal(priceForAccount(p, "cliente"), 100);
      assert.equal(priceForAccount(p, "produtor"), 100);
    }
  });
}
test("all other categories, uncategorized products and legacy tax codes receive 18%", () => {
  for (const catalogs of [null, { name: "Vacinas" }, { name: "Outros" }]) {
    for (const tax_code of ["000", "040", "060", null]) {
      assert.equal(priceForAccount({ ...product, catalogs, tax_code }), 118);
    }
  }
});
test("producer promotions and Pix use the same rule, without stale 22% fields", () => {
  const p = { ...product, on_sale: true, sale_producer_price: 80, sale_consumer_price: 97.6,
    producer_pix_price: 90, consumer_pix_price: 109.8, sale_producer_pix_price: 70 };
  assert.equal(priceForAccount(p), 94.4);
  assert.equal(priceForAccount(p, "produtor"), 80);
  assert.equal(pixPriceForAccount(p), 82.6);
  assert.equal(pixPriceForAccount(p, "produtor"), 70);
  assert.equal(priceForAccount({ ...p, catalogs: { name: "Pets" } }), 80);
  assert.equal(pixPriceForAccount({ ...p, catalogs: { name: "Pets" } }), 70);
  assert.equal(regularPriceForAccount(p), 118);
});
test("rounding and mixed cart totals do not add a second tax", () => {
  assert.equal(priceForAccount({ ...product, producer_price: 19.99 }), 23.59);
  const lines = [{ ...product }, { ...product, catalogs: { name: "Pets" } }];
  assert.equal(lines.reduce((sum, p) => sum + priceForAccount(p) * 2, 0), 436);
  assert.equal(lines.reduce((sum, p) => sum + priceForAccount(p, "produtor") * 2, 0), 400);
  for (const path of ["src/lib/tax.functions.ts", "src/lib/checkout.functions.ts"]) {
    const source = read(path);
    assert.match(source, /priceForAccount\(product, accountType\)/);
    assert.doesNotMatch(source, /calculateItemIcms\(/);
    assert.match(source, /catalogs\(name,slug\)/);
    assert.match(source, /auth\.getUser\(token\)/);
  }
});
test("category information is fetched in every storefront pricing path", () => {
  for (const path of ["src/routes/index.tsx", "src/routes/produtos.index.tsx",
    "src/routes/produtos.$slug.tsx", "src/routes/catalogos.$slug.tsx",
    "src/components/site/MainNav.tsx", "src/lib/cart.tsx"]) {
    assert.match(read(path), /catalogs\(name,slug\)/, path);
  }
});
