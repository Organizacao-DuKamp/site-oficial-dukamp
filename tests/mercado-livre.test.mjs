import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const source = stripTypeScriptTypes(
  readFileSync(new URL("../src/lib/mercado-livre.server.ts", import.meta.url), "utf8"),
);
const { createMercadoLivreService, validateMercadoLivreNotification, ML_CALLBACK_PATH } =
  await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const migration = readFileSync(
  new URL("../supabase/migrations/20261105115040_mercado_livre_integration.sql", import.meta.url),
  "utf8",
);
const adminId = "10000000-0000-4000-8000-000000000001";
const customerId = "10000000-0000-4000-8000-000000000002";
const origin = "https://dukamp.test";

// Small PostgREST-compatible adapter against real Postgres (PGlite), rather than SQL string assertions.
function adapter(pg) {
  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.params = [];
      this.verb = "select";
      this.columns = "*";
    }
    bind(value) {
      this.params.push(value);
      return "$" + this.params.length;
    }
    select(columns = "*") {
      this.columns = columns;
      return this;
    }
    insert(data) {
      this.verb = "insert";
      this.values = data;
      return this;
    }
    update(data) {
      this.verb = "update";
      this.values = data;
      return this;
    }
    delete() {
      this.verb = "delete";
      return this;
    }
    eq(key, value) {
      this.filters.push('"' + key + '"=' + this.bind(value));
      return this;
    }
    gt(key, value) {
      this.filters.push('"' + key + '">' + this.bind(value));
      return this;
    }
    in(key, values) {
      this.filters.push('"' + key + '" IN (' + values.map((v) => this.bind(v)).join(",") + ")");
      return this;
    }
    order(key, { ascending } = {}) {
      this.sort = '"' + key + '" ' + (ascending === false ? "DESC" : "ASC");
      return this;
    }
    limit(value) {
      this.count = value;
      return this;
    }
    maybeSingle() {
      this.single = true;
      return this;
    }
    async run() {
      const where = this.filters.length ? " WHERE " + this.filters.join(" AND ") : "";
      const columns =
        this.columns === "*"
          ? "*"
          : this.columns
              .split(",")
              .map((c) => '"' + c + '"')
              .join(",");
      let sql;
      if (this.verb === "select")
        sql = `SELECT ${columns} FROM public."${this.table}"${where}${this.sort ? " ORDER BY " + this.sort : ""}${this.count ? " LIMIT " + this.count : ""}`;
      if (this.verb === "delete")
        sql = `DELETE FROM public."${this.table}"${where} RETURNING ${columns}`;
      if (this.verb === "insert") {
        const entries = Object.entries(this.values);
        sql = `INSERT INTO public."${this.table}"(${entries.map(([k]) => '"' + k + '"').join(",")}) VALUES(${entries.map(([, v]) => this.bind(v)).join(",")}) RETURNING ${columns}`;
      }
      if (this.verb === "update")
        sql = `UPDATE public."${this.table}" SET ${Object.entries(this.values)
          .map(([k, v]) => '"' + k + '"=' + this.bind(v))
          .join(",")}${where} RETURNING ${columns}`;
      try {
        const { rows } = await pg.query(sql, this.params);
        return { data: this.single ? rows[0] || null : rows, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
    then(resolve, reject) {
      return this.run().then(resolve, reject);
    }
  }
  return {
    auth: {
      getUser: async (token) => ({
        data: {
          user:
            token === "admin-session"
              ? { id: adminId }
              : token === "customer-session"
                ? { id: customerId }
                : null,
        },
        error: null,
      }),
    },
    from: (table) => new Query(table),
    rpc: async (name, args = {}) => {
      const entries = Object.entries(args);
      try {
        const list = entries.map(([k], i) => '"' + k + '"=>$' + (i + 1)).join(",");
        const set = name === "mercado_livre_claim_events";
        const { rows } = await pg.query(
          `SELECT ${set ? "*" : 'public."' + name + '"(' + list + ") AS value"}${set ? ' FROM public."' + name + '"(' + list + ")" : ""}`,
          entries.map(([, v]) => v),
        );
        return { data: set ? rows : rows[0]?.value, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  };
}

async function setup(t, changes = {}) {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.user_roles(user_id uuid,role text); INSERT INTO public.user_roles VALUES('${adminId}','admin');`);
  await pg.exec(migration);
  const env = {
    MERCADO_LIVRE_CLIENT_ID: "123456",
    MERCADO_LIVRE_CLIENT_SECRET: "synthetic-provider-secret",
    MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    MERCADO_LIVRE_REDIRECT_URI: origin + ML_CALLBACK_PATH,
    ...changes,
  };
  const db = adapter(pg),
    calls = [],
    tokenCalls = [];
  let provider = async (url, init) => {
    if (url.endsWith("/oauth/token")) {
      const body = new URLSearchParams(init.body);
      tokenCalls.push(body);
      assert.equal(init.method, "POST");
      return Response.json({
        access_token: "synthetic-access-" + tokenCalls.length,
        refresh_token: "synthetic-refresh-" + tokenCalls.length,
        user_id: 42,
        expires_in: 21600,
        scope: "read offline_access",
      });
    }
    if (url.endsWith("/users/me"))
      return Response.json({ id: 42, site_id: "MLB", nickname: "DUKAMP" });
    return Response.json({
      id: 900,
      status: "paid",
      seller: { id: 42 },
      buyer: { email: "must-not-store@example.test" },
      total_amount: 80,
      order_items: [{ item: { id: "MLB900", seller_sku: "ERP1" }, quantity: 2, unit_price: 40 }],
    });
  };
  const service = createMercadoLivreService({
    db,
    env,
    fetcher: async (url, init = {}) => {
      calls.push({ url, init });
      return provider(url, init);
    },
  });
  const adminRequest = (body, token = "admin-session", requestOrigin = origin) =>
    new Request(origin + "/api/admin/mercado-livre", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        Origin: requestOrigin,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const connect = async () => {
    const start = await service.admin(adminRequest({ action: "connect" }));
    assert.equal(start.status, 200, await start.clone().text());
    const url = new URL((await start.json()).authorizationUrl);
    const request = new Request(
      origin + ML_CALLBACK_PATH + "?code=synthetic-code&state=" + url.searchParams.get("state"),
      { headers: { Cookie: start.headers.get("set-cookie").split(";")[0] } },
    );
    const result = await service.callback(request);
    assert.equal(result.status, 303);
    assert.match(result.headers.get("location"), /ml=connected$/);
    return { start, url, request, result };
  };
  const envelope = (extra = {}) => ({
    _id: "event-1",
    user_id: 42,
    application_id: 123456,
    topic: "orders_v2",
    resource: "/orders/900",
    received: "2026-11-05T08:00:00.000Z",
    sent: "2026-11-05T08:00:01.000Z",
    attempts: 1,
    ...extra,
  });
  const notify = (data) =>
    service.notifications(
      new Request(origin + "/api/mercado-livre/notifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    );
  return {
    service,
    pg,
    db,
    env,
    calls,
    tokenCalls,
    adminRequest,
    connect,
    envelope,
    notify,
    provider: (fn) => {
      provider = fn;
    },
  };
}

test("OAuth requires a server-validated admin and a matching Origin; no tokens in admin responses", async (t) => {
  const f = await setup(t);
  assert.equal(
    (await f.service.admin(f.adminRequest({ action: "connect" }, "bad-session"))).status,
    401,
  );
  assert.equal(
    (await f.service.admin(f.adminRequest({ action: "connect" }, "customer-session"))).status,
    403,
  );
  assert.equal(
    (
      await f.service.admin(
        f.adminRequest({ action: "connect" }, "admin-session", "https://attacker.test"),
      )
    ).status,
    403,
  );
  assert.equal(f.tokenCalls.length, 0);
});

test("OAuth uses S256, HttpOnly/Secure browser binding, one-use state, encrypted credentials and a clean redirect", async (t) => {
  const f = await setup(t),
    { start, url, request, result } = await f.connect();
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.match(start.headers.get("set-cookie"), /Secure; HttpOnly; SameSite=Lax/);
  assert.equal(result.headers.get("referrer-policy"), "no-referrer");
  assert.doesNotMatch(result.headers.get("location"), /synthetic|state=|code=/);
  assert.ok(f.tokenCalls[0].get("code_verifier"));
  const row = (await f.pg.query("SELECT * FROM mercado_livre_connections")).rows[0];
  assert.doesNotMatch(JSON.stringify(row), /synthetic/);
  assert.equal(f.service.open(row.access_ciphertext, "access:42"), "synthetic-access-1");
  assert.throws(() => f.service.open(row.access_ciphertext, "refresh:42"));
  assert.match((await f.service.callback(request)).headers.get("location"), /invalid_state/);
  assert.equal(f.tokenCalls.length, 1);
  const status = await f.service.admin(f.adminRequest());
  assert.doesNotMatch(
    await status.text(),
    /ciphertext|synthetic-access|synthetic-refresh|synthetic-provider/,
  );
});

test("invalid state/cookie, expired authorization, refusal and removed admin role cannot exchange codes", async (t) => {
  const f = await setup(t);
  assert.equal(
    (await f.service.callback(new Request(origin + ML_CALLBACK_PATH + "?code=x&state=x"))).status,
    400,
  );
  async function begin() {
    const response = await f.service.admin(f.adminRequest({ action: "connect" }));
    return {
      cookie: response.headers.get("set-cookie").split(";")[0],
      url: new URL((await response.json()).authorizationUrl),
    };
  }
  const a = await begin();
  const callback = (suffix) =>
    new Request(origin + ML_CALLBACK_PATH + suffix + "&state=" + a.url.searchParams.get("state"), {
      headers: { Cookie: a.cookie },
    });
  await f.pg.exec("UPDATE mercado_livre_oauth_states SET expires_at=now()-interval '1 minute'");
  assert.match(
    (await f.service.callback(callback("?code=x"))).headers.get("location"),
    /invalid_state/,
  );
  const b = await begin();
  assert.match(
    (
      await f.service.callback(
        new Request(
          origin +
            ML_CALLBACK_PATH +
            "?error=access_denied&state=" +
            b.url.searchParams.get("state"),
          { headers: { Cookie: b.cookie } },
        ),
      )
    ).headers.get("location"),
    /access_denied/,
  );
  const c = await begin();
  await f.pg.exec("DELETE FROM user_roles");
  assert.match(
    (
      await f.service.callback(
        new Request(
          origin + ML_CALLBACK_PATH + "?code=x&state=" + c.url.searchParams.get("state"),
          { headers: { Cookie: c.cookie } },
        ),
      )
    ).headers.get("location"),
    /access_denied/,
  );
  assert.equal(f.tokenCalls.length, 0);
});

test("webhook validates app, shape and resource; unknown accounts are ignored without provider calls", async (t) => {
  const f = await setup(t);
  assert.equal((await f.notify(f.envelope({ application_id: 999 }))).status, 403);
  for (const resource of [
    "https://attacker.test/a",
    "//attacker.test/a",
    "/orders/../users/me",
    "/orders/900?access_token=x",
    "/orders/%39",
  ]) {
    assert.equal((await f.notify(f.envelope({ resource }))).status, 400);
  }
  assert.equal((await f.notify(f.envelope({ user_id: 55 }))).status, 200);
  assert.equal((await f.pg.query("SELECT * FROM mercado_livre_events")).rows.length, 0);
  assert.equal(f.calls.length, 0);
  assert.equal(
    (await f.service.notifications(new Request(origin, { method: "POST", body: "{" }))).status,
    400,
  );
  assert.equal(
    (
      await f.service.notifications(
        new Request(origin, { method: "POST", body: "x".repeat(16385) }),
      )
    ).status,
    413,
  );
});

test("notification identity ignores retry sent/attempts and preserves distinct changes to the same resource", () => {
  const n = {
    user_id: 42,
    application_id: 123,
    topic: "items",
    resource: "/items/MLB900",
    received: "2026-11-05T08:00:00Z",
  };
  const a = validateMercadoLivreNotification(n, "123");
  assert.equal(
    a.event_key,
    validateMercadoLivreNotification({ ...n, attempts: 8, sent: "2026-11-05T09:00:00Z" }, "123")
      .event_key,
  );
  assert.notEqual(
    a.event_key,
    validateMercadoLivreNotification({ ...n, received: "2026-11-05T08:00:01Z" }, "123").event_key,
  );
});

test("webhook durably deduplicates before ACK; worker confirms ownership via API and saves only encrypted minimal data", async (t) => {
  const f = await setup(t);
  await f.connect();
  const before = f.calls.length;
  assert.equal((await f.notify(f.envelope())).status, 200);
  assert.equal(
    (await f.notify(f.envelope({ sent: "2026-11-05T09:00:00Z", attempts: 2 }))).status,
    200,
  );
  assert.equal(f.calls.length, before, "ACK must not wait for the Mercado Livre API");
  assert.equal((await f.pg.query("SELECT count(*) FROM mercado_livre_events")).rows[0].count, 1);
  await f.service.processQueue(3);
  const e = (await f.pg.query("SELECT * FROM mercado_livre_events")).rows[0];
  assert.equal(e.status, "done");
  const snapshot = f.service.open(e.snapshot_ciphertext, `event:${e.id}`);
  assert.match(snapshot, /"total_amount":80/);
  assert.doesNotMatch(snapshot, /buyer|email|must-not-store/);
  assert.ok(f.calls.at(-1).init.headers.Authorization.startsWith("Bearer synthetic-access"));
  assert.equal(f.calls.at(-1).init.redirect, "error");
});

test("worker rejects resources owned by another seller and retries API failures without touching ERP tables", async (t) => {
  const f = await setup(t);
  await f.connect();
  await f.notify(f.envelope());
  f.provider(async () => Response.json({ id: 900, seller: { id: 55 } }));
  await f.service.processQueue();
  let e = (await f.pg.query("SELECT * FROM mercado_livre_events")).rows[0];
  assert.equal(e.status, "dead");
  assert.equal(e.last_error, "resource_owner_mismatch");
  assert.equal(e.snapshot_ciphertext, null);
  await f.notify(f.envelope({ _id: "event-2" }));
  f.provider(async () => new Response("", { status: 500 }));
  await f.service.processQueue();
  e = (await f.pg.query("SELECT * FROM mercado_livre_events WHERE notification_id='event-2'"))
    .rows[0];
  assert.equal(e.status, "retry");
  assert.equal(e.attempts, 1);
  assert.deepEqual(
    (
      await f.pg.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'mercado_livre_%'",
      )
    ).rows,
    [{ tablename: "user_roles" }],
  );
});

test("rotating refresh tokens are locked, encrypted and updated exactly once under concurrent access", async (t) => {
  const f = await setup(t);
  await f.connect();
  await f.pg.exec("UPDATE mercado_livre_connections SET expires_at=now()-interval '1 minute'");
  const results = await Promise.allSettled([
    f.service.accessToken("42"),
    f.service.accessToken("42"),
  ]);
  assert.ok(results.some((r) => r.status === "fulfilled"));
  assert.equal(f.tokenCalls.filter((p) => p.get("grant_type") === "refresh_token").length, 1);
  const row = (await f.pg.query("SELECT * FROM mercado_livre_connections")).rows[0];
  assert.equal(f.service.open(row.refresh_ciphertext, "refresh:42"), "synthetic-refresh-2");
  assert.equal(row.token_version, 2);
  assert.equal(row.refresh_lease, null);
});

test("unknown refresh result quarantines account and never reuses a possibly consumed refresh token", async (t) => {
  const f = await setup(t);
  await f.connect();
  await f.pg.exec("UPDATE mercado_livre_connections SET expires_at=now()-interval '1 minute'");
  let refreshes = 0;
  f.provider(async () => {
    refreshes++;
    throw new Error("network result unknown");
  });
  await assert.rejects(f.service.accessToken("42"));
  await assert.rejects(f.service.accessToken("42"));
  assert.equal(refreshes, 1);
  assert.equal(
    (await f.pg.query("SELECT status FROM mercado_livre_connections")).rows[0].status,
    "reconnect_required",
  );
});

test("abandoned queue leases recover; disconnect fences refresh writers and clears encrypted credentials", async (t) => {
  const f = await setup(t);
  await f.connect();
  await f.notify(f.envelope());
  const claimed = await f.db.rpc("mercado_livre_claim_events", { p_limit: 1 });
  assert.equal(claimed.data.length, 1);
  assert.equal((await f.db.rpc("mercado_livre_claim_events", { p_limit: 1 })).data.length, 0);
  await f.pg.exec("UPDATE mercado_livre_events SET lease_until=now()-interval '1 minute'");
  await f.service.processQueue();
  assert.equal((await f.pg.query("SELECT attempts FROM mercado_livre_events")).rows[0].attempts, 2);
  await f.service.admin(f.adminRequest({ action: "disconnect", accountId: "42" }));
  const row = (await f.pg.query("SELECT * FROM mercado_livre_connections")).rows[0];
  assert.equal(row.status, "disconnected");
  assert.equal(row.access_ciphertext, null);
  assert.equal(row.refresh_ciphertext, null);
  assert.equal((await f.notify(f.envelope({ _id: "after-disconnect" }))).status, 200);
  assert.equal((await f.pg.query("SELECT count(*) FROM mercado_livre_events")).rows[0].count, 1);
});

test("service-only tables and RPCs reject anonymous and authenticated direct API access", async (t) => {
  const f = await setup(t);
  await f.connect();
  for (const role of ["anon", "authenticated"]) {
    await f.pg.exec("SET ROLE " + role);
    try {
      await assert.rejects(
        f.pg.query("SELECT * FROM public.mercado_livre_connections"),
        /permission denied/,
      );
      await assert.rejects(
        f.pg.query("SELECT public.mercado_livre_claim_events(1)"),
        /permission denied/,
      );
      await assert.rejects(
        f.pg.query("SELECT * FROM public.mercado_livre_events"),
        /permission denied/,
      );
    } finally {
      await f.pg.exec("RESET ROLE");
    }
  }
  const tables = await f.pg.query(
    "SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'mercado_livre_%'",
  );
  assert.ok(tables.rows.every((r) => r.rowsecurity));
});

test("a mismatched browser cannot consume another OAuth state", async (t) => {
  const f = await setup(t);
  const response = await f.service.admin(f.adminRequest({ action: "connect" }));
  const url = new URL((await response.json()).authorizationUrl);
  const callbackUrl = origin + ML_CALLBACK_PATH + "?code=x&state=" + url.searchParams.get("state");
  const result = await f.service.callback(
    new Request(callbackUrl, {
      headers: { Cookie: "__Host-dukamp_ml_oauth=" + randomBytes(32).toString("base64url") },
    }),
  );
  assert.match(result.headers.get("location"), /invalid_state/);
  assert.equal(
    (await f.pg.query("SELECT count(*) FROM mercado_livre_oauth_states")).rows[0].count,
    1,
  );
  assert.equal(f.tokenCalls.length, 0);
});

test("price notifications naming the item query /prices and verify the item owner", async (t) => {
  const f = await setup(t);
  await f.connect();
  assert.equal(
    (
      await f.notify(
        f.envelope({ _id: "price-1", topic: "items_prices", resource: "/items/MLB900" }),
      )
    ).status,
    200,
  );
  f.provider(async (url) =>
    url.endsWith("/prices")
      ? Response.json({
          id: "MLB900",
          prices: [{ id: "1", type: "standard", amount: 120, currency_id: "BRL" }],
        })
      : Response.json({ id: "MLB900", seller_id: 42 }),
  );
  await f.service.processQueue();
  const e = (await f.pg.query("SELECT * FROM mercado_livre_events")).rows[0];
  assert.equal(e.resource, "/items/MLB900/prices");
  assert.equal(e.status, "done");
  assert.match(f.service.open(e.snapshot_ciphertext, `event:${e.id}`), /"amount":120/);
});

test("401 triggers one refresh and revoked grants require reconnect rather than repeated refresh", async (t) => {
  const f = await setup(t);
  await f.connect();
  await f.notify(f.envelope());
  let reads = 0;
  f.provider(async (url) => {
    if (url.endsWith("/oauth/token"))
      return Response.json({
        access_token: "rotated-access",
        refresh_token: "rotated-refresh",
        user_id: 42,
        expires_in: 21600,
      });
    reads++;
    return reads === 1
      ? Response.json({ error: "expired" }, { status: 401 })
      : Response.json({ id: 900, seller: { id: 42 }, status: "paid" });
  });
  await f.service.processQueue();
  assert.equal(
    (await f.pg.query("SELECT status FROM mercado_livre_events")).rows[0].status,
    "done",
  );
  assert.equal(reads, 2);
  await f.pg.exec("UPDATE mercado_livre_connections SET expires_at=now()-interval '1 minute'");
  f.provider(async () => Response.json({ error: "invalid_grant" }, { status: 400 }));
  await assert.rejects(f.service.accessToken("42"));
  assert.equal(
    (await f.pg.query("SELECT status FROM mercado_livre_connections")).rows[0].status,
    "reconnect_required",
  );
});

test("webhook returns 503 on persistence failure; a failed ACK never pretends an event was saved", async (t) => {
  const f = await setup(t);
  await f.connect();
  const broken = createMercadoLivreService({
    env: f.env,
    db: {
      ...f.db,
      rpc: async () => ({ data: null, error: { message: "synthetic database outage" } }),
    },
  });
  const result = await broken.notifications(
    new Request(origin, { method: "POST", body: JSON.stringify(f.envelope()) }),
  );
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /synthetic database outage/);
  assert.equal((await f.pg.query("SELECT count(*) FROM mercado_livre_events")).rows[0].count, 0);
});

test("missing credentials fail closed; real service-role database permissions work and request limits are atomic", async (t) => {
  const f = await setup(t, { MERCADO_LIVRE_CLIENT_SECRET: undefined });
  assert.equal((await f.service.admin(f.adminRequest({ action: "connect" }))).status, 503);
  await f.pg.exec("SET ROLE service_role");
  try {
    assert.equal(
      (await f.pg.query("SELECT public.mercado_livre_limit($1,2) ok", ["test"])).rows[0].ok,
      true,
    );
    assert.equal(
      (await f.pg.query("SELECT public.mercado_livre_limit($1,2) ok", ["test"])).rows[0].ok,
      true,
    );
    assert.equal(
      (await f.pg.query("SELECT public.mercado_livre_limit($1,2) ok", ["test"])).rows[0].ok,
      false,
    );
    assert.equal(
      (await f.pg.query("SELECT * FROM public.mercado_livre_connections")).rows.length,
      0,
    );
  } finally {
    await f.pg.exec("RESET ROLE");
  }
});
