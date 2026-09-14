import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const moduleUrl = source => "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const taxUrl = moduleUrl(read("src/lib/tax.ts"));
const pricing = await import(moduleUrl(read("src/lib/pricing.ts").replace('"./tax"', JSON.stringify(taxUrl))));
const { priceForAccount, regularPriceForAccount, pixPriceForAccount, consumerTaxRate } = pricing;
const product = { producer_price: 100, consumer_price: 122, catalogs: { name: "Nutrição Animal" } };

test("consumer and anonymous use 22%, rural producer keeps the base", () => {
  assert.equal(priceForAccount(product), 122);
  assert.equal(priceForAccount(product, "cliente"), 122);
  assert.equal(priceForAccount(product, "produtor"), 100);
  assert.equal(consumerTaxRate(product), 0.22);
  assert.equal(consumerTaxRate(product, "produtor"), 0);
});

for (const [name, slug] of [
  ["Arames", "arames"],
  ["Ferragens", "ferragens"],
  ["Pets", "pets"],
  ["Utensílios Gerais", "utensilios-gerais"],
  ["Lonas e Coberturas", "lonas-e-coberturas"],
  ["Arames e Ferragens", "arames-e-ferragens"],
]) {
  test(name + " is exempt for both consumer and producer", () => {
    for (const catalogs of [
      { name },
      { slug },
      { name: "  " + name.toUpperCase() + "  " },
      [{ name, slug }],
    ]) {
      const p = { ...product, catalogs };
      assert.equal(priceForAccount(p), 100);
      assert.equal(priceForAccount(p, "cliente"), 100);
      assert.equal(priceForAccount(p, "produtor"), 100);
      assert.equal(consumerTaxRate(p), 0);
    }
  });
}

test("all other categories and uncategorized products receive 22%", () => {
  for (const catalogs of [null, { name: "Vacinas" }, { name: "Outros" }, [{ slug: "vacinas" }]]) {
    assert.equal(priceForAccount({ ...product, catalogs }), 122);
  }
});

test("promotions and Pix use the same 22% rule", () => {
  const p = {
    ...product,
    on_sale: true,
    sale_producer_price: 80,
    producer_pix_price: 90,
    sale_producer_pix_price: 70,
  };
  assert.equal(priceForAccount(p), 97.6);
  assert.equal(priceForAccount(p, "produtor"), 80);
  assert.equal(pixPriceForAccount(p), 85.4);
  assert.equal(pixPriceForAccount(p, "produtor"), 70);
  assert.equal(regularPriceForAccount(p), 122);
});

test("exempt categories never receive 22%, including Pix", () => {
  const p = {
    producer_price: 181.94,
    consumer_price: 221.97,
    producer_pix_price: 177.71,
    consumer_pix_price: 216.81,
    catalogs: [{ name: "Ferragens", slug: "ferragens" }],
  };
  assert.equal(priceForAccount(p), 181.94);
  assert.equal(pixPriceForAccount(p), 177.71);
});

test("rounding and mixed cart totals use the new rate once", () => {
  assert.equal(priceForAccount({ ...product, producer_price: 19.99 }), 24.39);
  const lines = [{ ...product }, { ...product, catalogs: { name: "Pets" } }];
  assert.equal(lines.reduce((sum, p) => sum + priceForAccount(p) * 2, 0), 444);
  assert.equal(lines.reduce((sum, p) => sum + priceForAccount(p, "produtor") * 2, 0), 400);
});
