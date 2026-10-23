import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { createClient } from "@supabase/supabase-js";

const source = (path) => readFileSync(new URL(`../src/lib/${path}.ts`, import.meta.url), "utf8");
const url = (text) => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(text)).toString("base64")}`;
const tax = url(source("tax"));
const pricing = url(source("pricing").replace('"./tax"', JSON.stringify(tax)));
const { importProdWeb } = await import(url(source("prod-web-import")
  .replace('"./tax"', JSON.stringify(tax))
  .replace('"./pricing"', JSON.stringify(pricing))));

const row = (code, { stock = "12", price = "100,00", tax = "000" } = {}) =>
  `${code};Nome ERP;${stock};999,00;${price};GRUPO;18,00;${tax};5;789123;S`;
const product = (code, active = true, catalogs = null) => ({
  id: `id-${code}`, code, active, name: `Nome site ${code}`, catalogs,
  price: 10, producer_price: 10, stock: 3, images: ["foto.jpg"],
});

// Use the real Supabase client against an in-memory HTTP boundary, including PATCH filters.
function database(products, { beforeWrite, failCode } = {}) {
  const requests = [];
  const supabase = createClient("https://fixture.supabase.co", "fixture-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const request = new URL(input);
      const method = init.method;
      requests.push({ method, params: request.searchParams });
      assert.equal(request.pathname, "/rest/v1/products");
      if (method === "GET") {
        const codes = request.searchParams.get("code").slice(4, -1).split(",");
        return Response.json(products.filter((p) => codes.includes(p.code)).map((p) => ({ ...p })));
      }
      assert.equal(method, "PATCH", "Import must never create or delete products");
      beforeWrite?.(products);
      const patch = JSON.parse(init.body);
      assert.equal("active" in patch, false);
      const matches = products.filter((p) => [...request.searchParams].every(([key, value]) =>
        key === "select" || `eq.${p[key]}` === value));
      if (matches.some((p) => p.code === failCode)) {
        return Response.json({ message: "Falha simulada" }, { status: 400 });
      }
      for (const p of matches) Object.assign(p, patch);
      return Response.json(matches.map((p) => ({ id: p.id })));
    } },
  });
  return { supabase, requests };
}

test("default import updates active prices and stock; inactive and unknown codes remain untouched", async () => {
  const products = [product("001"), product("002", false), product("004")];
  const before = structuredClone(products);
  const { supabase, requests } = database(products);
  const result = await importProdWeb(supabase, [row("001"), row("002"), row("003")].join("\r\n"));
  assert.equal(result.onlyActive, true);
  assert.equal(result.total, 3);
  assert.equal(result.updated, 1);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.ignored.map((p) => p.code), ["002", "003"]);
  assert.deepEqual(products[1], before[1]);
  assert.deepEqual(products[2], before[2]);
  assert.equal(products.length, 3);
  assert.equal(products[0].producer_price, 100);
  assert.equal(products[0].consumer_price, 122);
  assert.equal(products[0].price, 122);
  assert.equal(products[0].stock, 12);
  assert.equal(products[0].name, before[0].name);
  assert.deepEqual(products[0].images, before[0].images);
  assert.equal(requests.find((r) => r.method === "PATCH").params.get("active"), "eq.true");
});

test("disabling the option updates inactive registered products without activating or creating products", async () => {
  const products = [product("001"), product("002", false, { slug: "pets" })];
  const result = await importProdWeb(database(products).supabase,
    [row("001"), row("002", { stock: "-5" }), row("003")].join("\n"), false);
  assert.equal(result.onlyActive, false);
  assert.equal(result.updated, 2);
  assert.equal(result.ignored.length, 1);
  assert.equal(products[0].active, true);
  assert.equal(products[1].active, false);
  assert.equal(products[1].price, 100, "exempt categories retain the existing price rule");
  assert.equal(products[1].stock, 0);
  assert.equal(products.length, 2);
});

test("a product deactivated between reading and writing is not updated or counted", async () => {
  const products = [product("001")];
  const { supabase } = database(products, { beforeWrite: () => { products[0].active = false; } });
  const result = await importProdWeb(supabase, row("001"));
  assert.equal(products[0].price, 10);
  assert.equal(products[0].stock, 3);
  assert.equal(result.updated, 0);
  assert.equal(result.ignored.length, 1);
});

test("invalid lines, duplicate codes, unsupported tax and zero price do not overwrite product data", async () => {
  const products = [product("001"), product("002"), product("003")];
  const result = await importProdWeb(database(products).supabase, [
    row("001"), row("001"), "invalido", row("002", { tax: "060" }), row("003", { price: "0" }),
  ].join("\n"));
  assert.equal(result.total, 5);
  assert.equal(result.updated, 1);
  assert.equal(result.errors.length, 2);
  assert.equal(result.ignored.length, 2);
  assert.equal(products[1].price, 10);
  assert.equal(products[2].price, 10);
});

test("a failed update is reported while the remaining file continues", async () => {
  const products = [product("001"), product("002")];
  const result = await importProdWeb(database(products, { failCode: "001" }).supabase,
    [row("001"), row("002")].join("\n"));
  assert.equal(result.updated, 1);
  assert.equal(result.errors[0].code, "001");
  assert.match(result.errors[0].message, /Falha simulada/);
  assert.equal(products[0].price, 10);
  assert.equal(products[1].price, 122);
});

test("files larger than a lookup batch still update every matching active product", async () => {
  const products = Array.from({ length: 205 }, (_, i) => product(String(i).padStart(6, "0")));
  const { supabase, requests } = database(products);
  const result = await importProdWeb(supabase, products.map((p) => row(p.code)).join("\n"));
  assert.equal(result.updated, 205);
  assert.equal(result.errors.length, 0);
  assert.equal(requests.filter((r) => r.method === "GET").length, 2);
  assert.ok(products.every((p) => p.stock === 12));
});
