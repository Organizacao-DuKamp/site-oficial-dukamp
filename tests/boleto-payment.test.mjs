import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const moduleUrl = (text) => "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(text)).toString("base64");
const notificationsUrl = moduleUrl(source("src/lib/mercadopago-notifications.server.ts"));
const { paymentNotification } = await import(notificationsUrl);

test("boleto notifications accept IPN query and resource without treating event IDs as payments", () => {
  for (const [url, body, expected] of [
    ["?topic=payment&id=123", {}, "123"],
    ["?topic=payment&data.id=456", {}, "456"],
    ["", { topic: "payment", resource: "https://api.mercadopago.com/v1/payments/789", id: "event-id" }, "789"],
    ["", { topic: "payment", resource: "123" }, "123"],
  ]) assert.deepEqual(paymentNotification(new Request("https://dukamp.test/webhook" + url), body), {id:expected,isPayment:true});
  assert.equal(paymentNotification(new Request("https://dukamp.test/webhook"), {topic:"payment",resource:"https://evil.test/payments/123"}).id, null);
  assert.equal(paymentNotification(new Request("https://dukamp.test/webhook?topic=merchant_order&id=123"), {}).isPayment, false);
});

test("empty-body IPN invokes reconciliation; malformed JSON is rejected", async () => {
  const paymentUrl = moduleUrl('export async function fetchProviderPayment(id) { return {id}; } export async function applyProviderPayment(payment) { if(payment.id !== "123") throw new Error("wrong id"); }');
  const routeSource = source("src/routes/api/public/mercadopago-webhook.ts")
    .replace(/import \{ createFileRoute \} from .*?;/, "const createFileRoute = () => options => options;")
    .replaceAll("@/lib/mercadopago-notifications.server", notificationsUrl)
    .replaceAll("@/lib/mercadopago-payment.server", paymentUrl);
  const { Route } = await import(moduleUrl(routeSource));
  const oldSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  try {
    assert.equal((await Route.server.handlers.POST({request:new Request("https://dukamp.test/webhook?topic=payment&id=123",{method:"POST"})})).status,200);
    assert.equal((await Route.server.handlers.POST({request:new Request("https://dukamp.test/webhook",{method:"POST",body:"{"})})).status,400);
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "test-secret";
    assert.equal((await Route.server.handlers.POST({request:new Request("https://dukamp.test/webhook?topic=payment&id=123",{method:"POST"})})).status,401);
  } finally {
    if (oldSecret === undefined) delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    else process.env.MERCADO_PAGO_WEBHOOK_SECRET = oldSecret;
  }
});

test("pending list recovers paid boletos, preserves pending on provider failure and skips paid orders", async () => {
  const calls = [];
  globalThis.__boletoDb = {rpc: async (_, args) => {
    calls.push(args);
    return {data:{payment_status:"approved",newly_paid:false},error:null};
  }};
  const paymentSource = source("src/lib/mercadopago-payment.server.ts").replace(/import \{ supabaseAdmin \} from .*?;/,"const supabaseAdmin = globalThis.__boletoDb;");
  const { refreshPendingOrderPayments } = await import(moduleUrl(paymentSource));
  const id = "00000000-0000-4000-8000-000000000001";
  const rows = [{id,mp_payment_id:"123",payment_status:"pending"},{id,mp_payment_id:"456",payment_status:"pending"},{id,mp_payment_id:"789",payment_status:"approved"},{id,mp_payment_id:null,payment_status:"pending"}];
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "test-only-token";
  globalThis.fetch = async (url) => url.endsWith("/456") ? new Response("offline",{status:503}) : Response.json({id:123,external_reference:id,currency_id:"BRL",transaction_amount:9.54,date_last_updated:"2026-10-05T12:00:00Z",status:"approved"});
  try {
    const result = await refreshPendingOrderPayments(rows);
    assert.deepEqual(result.map(o=>o.payment_status),["approved","pending","approved","pending"]);
    assert.equal(calls.length,1);
    assert.equal(calls[0].p_payment_id,"123");
    assert.equal(rows[0].payment_status,"pending");
  } finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    else process.env.MERCADO_PAGO_ACCESS_TOKEN = oldToken;
  }
});

test("customer and admin lists reconcile issued boletos before applying open-order filters", async () => {
  const row = {id:"order",user_id:"customer",payment_method:"boleto",mp_payment_id:"123",payment_status:"pending",delivery_status:"preparando"};
  const filters = [];
  globalThis.__orderListContext = {userId:"customer",supabase:{
    rpc:async()=>({data:true,error:null}),
    from() {
      const chain = {
        select(){return chain;}, eq(key,value){filters.push([key,value]);return chain;},
        or(filter){filters.push(filter);return chain;}, order(){return chain;},limit(){return chain;},
        then(resolve){return Promise.resolve({data:[row],error:null}).then(resolve);},
      }; return chain;
    },
  }};
  const helperUrl = moduleUrl('export async function refreshPendingOrderPayments(rows) { return rows.map(row=>({...row,payment_status:"approved"})); }');
  const listSource = source("src/lib/orders.functions.ts")
    .replace(/import \{ createServerFn \} from .*?;/,'const createServerFn = () => { const chain = {middleware(){return chain;},inputValidator(){return chain;},handler(fn){return (data={})=>fn({data,context:globalThis.__orderListContext});}}; return chain; };')
    .replace(/import \{ requireSupabaseAuth \} from .*?;/,"const requireSupabaseAuth = {};")
    .replace(/import \{ z \} from .*?;/,"")
    .replaceAll("@/lib/mercadopago-payment.server",helperUrl);
  const {listMyOrders,adminListOrders} = await import(moduleUrl(listSource));
  assert.equal((await listMyOrders())[0].payment_status,"approved");
  assert.ok(filters.some(filter=>Array.isArray(filter) && filter[0]==="user_id" && filter[1]==="customer"));
  assert.ok(filters.some(filter=>typeof filter === "string" && filter.includes("payment_method.eq.boleto") && filter.includes("mp_payment_id.not.is.null")));
  assert.equal((await adminListOrders({onlyOpen:true}))[0].id,"order");
  globalThis.__orderListContext.supabase.rpc = async()=>({data:false,error:null});
  await assert.rejects(adminListOrders({}),/Acesso negado/);
});
