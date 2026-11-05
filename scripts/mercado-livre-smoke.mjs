// Only synthetic, unauthenticated requests. No sellers, ERP records or provider credentials are used.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const base = new URL(process.env.ML_SMOKE_BASE_URL || "https://dukamp.netlify.app");
assert.equal(base.protocol, "https:");
const expected = process.env.ML_SMOKE_EXPECTED_COMMIT;
const request = async (path, options = {}) => {
  const start = performance.now();
  const response = await fetch(new URL(path, base), {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
    milliseconds: Math.round(performance.now() - start),
  };
};
let health;
for (let attempt = 0; attempt < (expected ? 28 : 1); attempt++) {
  try {
    health = await request("/api/mercado-livre/notifications");
    if (
      health.status === 200 &&
      JSON.parse(health.body).service === "mercado-livre" &&
      (!expected || JSON.parse(health.body).version === expected)
    )
      break;
  } catch {
    /* The new deploy may not be published yet. */
  }
  if (attempt === 27 || !expected)
    throw new Error("Production did not serve the expected integration commit.");
  await delay(15000);
}
assert.equal(health.status, 200);
console.log(
  JSON.stringify({
    check: "webhook_health",
    status: health.status,
    milliseconds: health.milliseconds,
    version: JSON.parse(health.body).version,
  }),
);
const cases = [
  ["oauth_requires_state", "/api/mercado-livre/oauth/callback", {}, 400],
  [
    "oauth_rejects_forged_state",
    "/api/mercado-livre/oauth/callback?code=smoke-test&state=forged",
    {},
    400,
  ],
  ["admin_requires_session", "/api/admin/mercado-livre", {}, 401],
  [
    "webhook_rejects_invalid_json",
    "/api/mercado-livre/notifications",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" },
    400,
  ],
  [
    "webhook_rejects_oversize",
    "/api/mercado-livre/notifications",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(16385) },
    413,
  ],
  ["storefront_available", "/", {}, 200],
];
for (const [check, path, options, status] of cases) {
  const r = await request(path, options);
  assert.equal(r.status, status, `${check}: expected ${status}, received ${r.status}`);
  if (path.startsWith("/api/")) assert.match(r.headers.get("cache-control") || "", /no-store/);
  console.log(JSON.stringify({ check, status: r.status, milliseconds: r.milliseconds }));
}
console.log(
  "Production Mercado Livre endpoint smoke checks passed. Real seller authorization still requires configured client credentials and seller consent.",
);
