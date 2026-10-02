import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { createHmac } from "node:crypto";

const moduleUrl = (source) =>
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const notificationsUrl = moduleUrl(source("src/lib/mercadopago-notifications.server.ts"));
const { paymentNotification, paymentNotificationUrl, validPaymentSignature } = await import(
  notificationsUrl
);

test("webhooks accept query-only notifications and sign the query ID", () => {
  const request = new Request("https://dukamp.test/webhook?data.id=123&type=payment");
  assert.deepEqual(paymentNotification(request, {}), { id: "123", isPayment: true });
  assert.equal(paymentNotification(request, { data: { id: "999" } }).id, "123");
  assert.deepEqual(
    paymentNotification(new Request("https://dukamp.test/webhook"), {
      action: "payment.updated",
      data: { id: 456 },
    }),
    { id: "456", isPayment: true },
  );
});

test("signature validation rejects absent, malformed, and forged signatures", () => {
  const secret = "test-only-secret";
  const signature = createHmac("sha256", secret)
    .update("id:123;request-id:req;ts:1234;")
    .digest("hex");
  const request = (sig) =>
    new Request("https://dukamp.test/webhook", {
      headers: { "x-request-id": "req", "x-signature": sig },
    });
  assert.equal(validPaymentSignature(request(`ts=1234,v1=${signature}`), "123", secret), true);
  for (const sig of ["", "ts=1234", "ts=1234,v1=invalid", `ts=1234,v1=${"0".repeat(64)}`]) {
    assert.equal(validPaymentSignature(request(sig), "123", secret), false);
  }
});

test("database reconciliation errors reach the caller; amounts and currency are required", async () => {
  globalThis.__paymentDb = { rpc: async () => ({ error: new Error("database unavailable") }) };
  const paymentSource = source("src/lib/mercadopago-payment.server.ts").replace(
    /import \{ supabaseAdmin \} from .*?;/,
    "const supabaseAdmin = globalThis.__paymentDb;",
  );
  const { applyProviderPayment } = await import(moduleUrl(paymentSource));
  const payment = {
    id: 123,
    external_reference: "00000000-0000-4000-8000-000000000001",
    currency_id: "BRL",
    transaction_amount: 56.41,
    date_last_updated: "2026-10-02T12:00:00Z",
    status: "approved",
  };
  await assert.rejects(applyProviderPayment(payment), /database unavailable/);
  await assert.rejects(applyProviderPayment({ ...payment, currency_id: "USD" }), /moeda/);
  await assert.rejects(
    applyProviderPayment({ ...payment, transaction_amount: undefined }),
    /moeda/,
  );
});

test("webhook returns retryable failure when provider or database reconciliation fails", async () => {
  const failingPaymentUrl = moduleUrl(
    'export async function fetchProviderPayment() { throw new Error("offline"); } export async function applyProviderPayment() {}',
  );
  const routeSource = source("src/routes/api/public/mercadopago-webhook.ts")
    .replace(
      /import \{ createFileRoute \} from .*?;/,
      "const createFileRoute = () => options => options;",
    )
    .replaceAll("@/lib/mercadopago-notifications.server", notificationsUrl)
    .replaceAll("@/lib/mercadopago-payment.server", failingPaymentUrl);
  const { Route } = await import(moduleUrl(routeSource));
  const previousSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  try {
    const response = await Route.server.handlers.POST({
      request: new Request("https://dukamp.test/webhook?data.id=123&type=payment", {
        method: "POST",
        body: "{}",
      }),
    });
    assert.equal(response.status, 503);
  } finally {
    if (previousSecret !== undefined) process.env.MERCADO_PAGO_WEBHOOK_SECRET = previousSecret;
  }
});

test("support actions reject non-admins before reading any conversation", async () => {
  globalThis.__supportReads = 0;
  globalThis.__supportAuth = async () => ({
    user: { id: "customer" },
    supabaseAdmin: {
      from(table) {
        assert.equal(table, "user_roles");
        const chain = {
          select() {
            return chain;
          },
          eq() {
            return chain;
          },
          maybeSingle: async () => ({ data: null, error: null }),
        };
        globalThis.__supportReads++;
        return chain;
      },
    },
  });
  const adminSource = source("src/lib/admin-support.server.ts")
    .replace(
      /import \{ isMasterAdminUserId \} from .*?;/,
      "const isMasterAdminUserId = () => false;",
    )
    .replace(
      /import \{ authenticateRequest, errorResponse \} from .*?;/,
      "const authenticateRequest = globalThis.__supportAuth; const errorResponse = (error, status) => Response.json({error}, {status});",
    );
  const { handleSupportAction } = await import(moduleUrl(adminSource));
  const response = await handleSupportAction(
    new Request("https://dukamp.test/support", {
      method: "POST",
      body: JSON.stringify({
        action: "send",
        ticketId: "00000000-0000-4000-8000-000000000001",
        message: "hello",
      }),
    }),
  );
  assert.equal(response.status, 403);
  assert.equal(globalThis.__supportReads, 1);
});

test("notification URL follows the actual site and respects explicit production configuration", () => {
  const request = new Request("https://dukamp.netlify.app/_serverFn/payment");
  assert.equal(
    paymentNotificationUrl(request),
    "https://dukamp.netlify.app/api/public/mercadopago-webhook",
  );
  assert.equal(
    paymentNotificationUrl(request, "https://backend.example.com/path/"),
    "https://backend.example.com/api/public/mercadopago-webhook",
  );
  assert.throws(() => paymentNotificationUrl(new Request("http://example.com")), /HTTPS/);
});

test("admin list includes the saved customer chat and its unread count", async () => {
  const ticket = { id: "00000000-0000-4000-8000-000000000001", user_id: "customer", status: "open" };
  const adminDb = {
    from(table) {
      const result = { data: table === "support_tickets" ? [ticket] : table === "profiles" ? [] : [{ ticket_id: ticket.id }], error: null };
      const chain = { select() { return chain; }, order() { return Promise.resolve(result); }, in() { return chain; }, eq() { return Promise.resolve(result); }, then(resolve) { return Promise.resolve(result).then(resolve); } };
      return chain;
    },
  };
  globalThis.__adminListDb = adminDb;
  const authUrl = moduleUrl('export async function authenticateSupportAdmin() { return { supabaseAdmin: globalThis.__adminListDb }; }');
  const errorsUrl = moduleUrl('export const errorResponse = (error, status) => Response.json({error}, {status});');
  const routeSource = source("src/routes/api/admin/support-tickets.ts")
    .replace(/import \{ createFileRoute \} from .*?;/, "const createFileRoute = () => options => options;")
    .replaceAll("@/lib/admin-support.server", authUrl)
    .replaceAll("@/lib/seller-system.server", errorsUrl);
  const { Route } = await import(moduleUrl(routeSource));
  const response = await Route.server.handlers.GET({ request: new Request("https://dukamp.test/api/admin/support-tickets") });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.tickets[0].id, ticket.id);
  assert.equal(payload.tickets[0].unread, 1);
});
