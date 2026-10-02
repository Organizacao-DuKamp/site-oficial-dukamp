import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const url = code => "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(code)).toString("base64");
const profileUrl = url(source("src/lib/customer-profile.ts"));
const { validCpf, consumerAddressError, checkoutPrefill } = await import(profileUrl);
const address = { cep: "15150-104", estado: "SP", cidade: "Monte Aprazível", rua: "Rua de teste", numero: "10", bairro: "Centro", complemento: "", referencia_entrega: "Portão azul", pessoa_autorizada: "Recebedor de teste" };
const cpf = "529.982.247-25";
test("consumer registration requires a valid CPF and every essential address field", () => {
  assert.equal(consumerAddressError(address, cpf), null);
  for (const value of ["", "11111111111", "52998224724", "123"]) assert.equal(validCpf(value), false);
  for (const field of ["cep", "estado", "cidade", "rua", "numero", "bairro"]) assert.ok(consumerAddressError({ ...address, [field]: "" }, cpf), field);
  assert.ok(consumerAddressError({ ...address, estado: "XX" }, cpf));
  assert.ok(consumerAddressError({ ...address, numero: "1".repeat(21) }, cpf));
});
test("checkout uses registered contact, CPF and delivery instructions, with billing fallback", () => {
  const prefill = checkoutPrefill({ full_name: "Cliente Teste", email: "fixture@example.invalid", phone: "17999999999", cpf, delivery_address: address }, {});
  assert.equal(prefill.customer_name, "Cliente Teste"); assert.equal(prefill.cep, address.cep);
  assert.equal(prefill.cpf_cnpj, cpf); assert.equal(prefill.pessoa_autorizada, address.pessoa_autorizada);
  assert.equal(prefill.referencia_entrega, address.referencia_entrega);
  const old = checkoutPrefill({ cobranca_rua: "Cobrança", cobranca_municipio: "Cidade", cobranca_cep: "15150000", uf: "SP", cnpj: "12345678000199" }, { email: "old@example.invalid" });
  assert.equal(old.rua, "Cobrança"); assert.equal(old.cpf_cnpj, "12345678000199"); assert.equal(old.email, "old@example.invalid");
});
const { resolveOrderSeller } = await import(url(source("src/lib/order-seller.server.ts")));
const linkedId = "00000000-0000-4000-8000-000000000001";
const publicId = "00000000-0000-4000-8000-000000000002";
const seller = (id, slug = "public-team") => ({ id, slug, name: "Vendedor Teste", active: true, erp_seller_code: "123" });
const sellerDb = records => ({ from() { let id; return { select() { return this; }, eq(key, value) { if (key === "id") id = value; return this; }, async maybeSingle() { return { data: records[id] ?? null }; } }; } });
test("current linked seller takes precedence over tampered checkout seller choice", async () => {
  const selected = await resolveOrderSeller(sellerDb({ [linkedId]: seller(linkedId, "conta-user"), [publicId]: seller(publicId) }), { user_metadata: { selected_seller_id: linkedId } }, publicId);
  assert.equal(selected.id, linkedId);
});
test("unlinked customers must answer, may choose none or an active public team seller", async () => {
  const db = sellerDb({ [publicId]: seller(publicId), [linkedId]: seller(linkedId, "conta-user") });
  await assert.rejects(resolveOrderSeller(db, null, undefined), /Selecione/);
  assert.equal(await resolveOrderSeller(db, null, null), null);
  assert.equal((await resolveOrderSeller(db, null, publicId)).id, publicId);
  await assert.rejects(resolveOrderSeller(db, null, linkedId), /equipe de vendas/);
  assert.equal(await resolveOrderSeller(sellerDb({}), { user_metadata: { selected_seller_id: linkedId } }, null), null);
});
const { webSalesTotals, webSalesInRange, webSaleBelongsToSeller } = await import(url(source("src/lib/web-sales.server.ts")));
const sale = { order_id: "order", customer_id: "customer", seller_id: linkedId, seller_code: "0123", seller_name: "Test", amount: 100, payment_total: 115, cost_amount: 60, weight_kg: 20, paid_at: "2026-10-01T02:00:00Z", active: true };
test("website statistics use Brazil dates, merchandise value, refunds and known costs", () => {
  assert.equal(webSalesInRange([sale], "2026-09-30", "2026-09-30").length, 1);
  assert.equal(webSalesInRange([sale], "2026-10-01", "2026-10-01").length, 0);
  assert.equal(webSaleBelongsToSeller(sale, publicId, "123"), true);
  assert.equal(webSaleBelongsToSeller({ ...sale, seller_id: null, seller_code: null }, publicId, null), false);
  assert.deepEqual(webSalesTotals([sale, { ...sale, cost_amount: null, amount: 50 }, { ...sale, active: false }]), { total_venda: 150, total_custo: 60, margem_bruta: 40, tonelagem: 0.04, count: 2, unknownCostCount: 1 });
});
test("CEP lookup combines providers and remains usable if one fails", async () => {
  const { lookupCepWithFallback } = await import(url(source("src/lib/cep.ts")));
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async input => input.includes("brasilapi") ? new Response("", { status: 500 }) : Response.json({ cep: "15150-104", localidade: "Monte Aprazível", uf: "SP", bairro: "Centro", logradouro: "Rua Teste" });
    const found = await lookupCepWithFallback("15150104");
    assert.equal(found.cidade, "Monte Aprazível"); assert.equal(found.estado, "SP"); assert.equal(found.bairro, "Centro");
    globalThis.fetch = async () => Response.json({ erro: true }, { status: 404 });
    await assert.rejects(lookupCepWithFallback("00000000"), /CEP não encontrado/);
  } finally { globalThis.fetch = original; }
});
let registered;
const routeSource = source("src/routes/api/public/register.ts")
  .replace('import { createFileRoute } from "@tanstack/react-router";', 'const createFileRoute = () => value => value;')
  .replace('"@/lib/customer-profile"', JSON.stringify(profileUrl))
  .replaceAll('await import("@/integrations/supabase/client.server")', '{ supabaseAdmin: globalThis.__registrationDb }');
const register = (await import(url(routeSource))).Route.server.handlers.POST;
const payload = { accountKind: "cliente", fullName: "Cliente Teste", email: "fixture@example.invalid", password: "test-only-password", phone: "17999999999", cpf, deliveryAddress: address, challengeA: 2, challengeB: 3, challengeAnswer: 5 };
test("signup endpoint rejects missing consumer data before creating Auth accounts", async () => {
  let creates = 0;
  globalThis.__registrationDb = { auth: { admin: { createUser: async () => { creates++; return {}; } } } };
  const response = await register({ request: new Request("https://dukamp.test/api/public/register", { method: "POST", body: JSON.stringify({ ...payload, deliveryAddress: { ...address, bairro: "" } }) }) });
  assert.equal(response.status, 400); assert.equal(creates, 0);
});
test("signup persists all consumer profile data and compensates failed profile saves", async () => {
  let deleted = 0, fail = false;
  globalThis.__registrationDb = {
    auth: { admin: { createUser: async () => ({ data: { user: { id: "fixture-user" } } }), deleteUser: async () => { deleted++; } } },
    from(table) { assert.equal(table, "profiles"); return { update(value) { registered = value; return this; }, eq() { return this; }, select() { return this; }, async single() { return { error: fail ? { message: "fixture failure" } : null }; } }; },
  };
  const request = () => ({ request: new Request("https://dukamp.test/api/public/register", { method: "POST", body: JSON.stringify(payload) }) });
  assert.equal((await register(request())).status, 200);
  assert.equal(registered.cpf, "52998224725"); assert.equal(registered.delivery_address.cep, "15150104");
  assert.equal(registered.delivery_address.pessoa_autorizada, address.pessoa_autorizada);
  fail = true; assert.equal((await register(request())).status, 500); assert.equal(deleted, 1);
});
