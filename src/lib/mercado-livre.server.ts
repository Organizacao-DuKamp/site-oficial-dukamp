import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

// This module is imported dynamically inside server handlers only. Never send it to the client.
export const ML_CALLBACK_PATH = "/api/mercado-livre/oauth/callback";
export const ML_NOTIFICATION_PATH = "/api/mercado-livre/notifications";
const API = "https://api.mercadolibre.com";
const COOKIE = "__Host-dukamp_ml_oauth";
const ADMIN_RETURN = "/admin/erp?modulo=mercado-livre";
const SAFE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

type Options = {
  db: any;
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  now?: () => number;
};

export class MercadoLivreError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  constructor(code: string, status = 503, retryable = true) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const id = (value: unknown) => {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return "";
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  return /^[1-9]\d{0,19}$/.test(text) ? text : "";
};
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { ...SAFE_HEADERS, ...headers } });

export function validateMercadoLivreNotification(value: unknown, clientId: string) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new MercadoLivreError("invalid_notification", 400, false);
  const n = value as Record<string, unknown>;
  const userId = id(n.user_id),
    applicationId = id(n.application_id);
  if (!userId || !applicationId || applicationId !== clientId)
    throw new MercadoLivreError("invalid_application", 403, false);
  const topic = typeof n.topic === "string" ? n.topic : "";
  let resource = typeof n.resource === "string" ? n.resource : "";
  // No arbitrary URLs, query strings, encodings, redirects, or path traversal are accepted.
  const patterns: Record<string, RegExp> = {
    orders_v2: /^\/orders\/[1-9]\d{0,19}$/,
    items: /^\/items\/ML[A-Z][1-9]\d{0,19}$/,
    shipments: /^\/shipments\/[1-9]\d{0,19}$/,
    questions: /^\/questions\/[1-9]\d{0,19}$/,
    items_prices: /^\/items\/ML[A-Z][1-9]\d{0,19}(?:\/prices)?$/,
  };
  if (!patterns[topic]) return null;
  if (!patterns[topic].test(resource)) throw new MercadoLivreError("invalid_resource", 400, false);
  // The documented price notification can name the item; prices are read from its /prices resource.
  if (topic === "items_prices" && !resource.endsWith("/prices")) resource += "/prices";
  const notificationId = typeof (n._id ?? n.id) === "string" ? String(n._id ?? n.id) : "";
  if (notificationId.length > 200) throw new MercadoLivreError("invalid_notification", 400, false);
  const received =
    typeof n.received === "string" && n.received.length < 50 ? Date.parse(n.received) : NaN;
  if (!notificationId && !Number.isFinite(received))
    throw new MercadoLivreError("missing_notification_identity", 400, false);
  // sent/attempts change on retries. received (the original event time) does not.
  const identity = notificationId || new Date(received).toISOString();
  return {
    event_key: hash(JSON.stringify([applicationId, userId, topic, resource, identity])),
    account_id: userId,
    application_id: applicationId,
    topic,
    resource,
    notification_id: notificationId || null,
    received_at: Number.isFinite(received) ? new Date(received).toISOString() : null,
  };
}

export function createMercadoLivreService({
  db,
  env = process.env,
  fetcher = fetch,
  now = Date.now,
}: Options) {
  const check = (result: any) => {
    if (result.error) throw new MercadoLivreError("database_unavailable");
    return result.data;
  };
  const encryptionKey = () => {
    const value = env.MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY || "";
    const key = Buffer.from(value, "base64");
    if (!/^[A-Za-z0-9+/]{43}=$/.test(value) || key.length !== 32)
      throw new MercadoLivreError("encryption_key_missing");
    return key;
  };
  const seal = (value: string, purpose: string) => {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
    cipher.setAAD(Buffer.from(`dukamp:mercado-livre:${purpose}`));
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  };
  const open = (value: string, purpose: string) => {
    try {
      const [version, iv, tag, ciphertext, extra] = value.split(".");
      if (version !== "v1" || !iv || !tag || !ciphertext || extra) throw new Error();
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey(),
        Buffer.from(iv, "base64url"),
      );
      decipher.setAAD(Buffer.from(`dukamp:mercado-livre:${purpose}`));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new MercadoLivreError("credentials_unreadable", 503, false);
    }
  };
  const config = () => {
    const clientId = id(env.MERCADO_LIVRE_CLIENT_ID);
    if (!clientId || !env.MERCADO_LIVRE_CLIENT_SECRET)
      throw new MercadoLivreError("configuration_missing");
    encryptionKey();
    let redirect: URL;
    try {
      redirect = new URL(env.MERCADO_LIVRE_REDIRECT_URI || "");
    } catch {
      throw new MercadoLivreError("redirect_uri_missing");
    }
    if (
      redirect.protocol !== "https:" ||
      redirect.username ||
      redirect.password ||
      redirect.search ||
      redirect.hash ||
      redirect.pathname !== ML_CALLBACK_PATH
    )
      throw new MercadoLivreError("invalid_redirect_uri");
    return {
      clientId,
      clientSecret: env.MERCADO_LIVRE_CLIENT_SECRET!,
      redirect: redirect.href,
      origin: redirect.origin,
    };
  };
  const log = (event: string, error?: unknown, eventId?: string) => {
    // Provider bodies, request URLs, codes, state, cookies and credentials are deliberately excluded.
    console.info(
      "[mercado-livre]",
      JSON.stringify({
        event,
        eventId,
        code:
          error instanceof MercadoLivreError ? error.code : error ? "internal_error" : undefined,
      }),
    );
  };
  const safeError = (error: unknown) => {
    log("request_failed", error);
    const status = error instanceof MercadoLivreError ? error.status : 503;
    return json(
      {
        error:
          status === 401
            ? "Sessão inválida."
            : status === 403
              ? "Acesso não autorizado."
              : status === 400
                ? "Requisição inválida."
                : "Integração temporariamente indisponível. Verifique a configuração ou tente novamente.",
      },
      status,
    );
  };
  const apiFetch = async (path: string, token: string) => {
    const response = await fetcher(API + path, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(4_000),
      redirect: "error",
    });
    if (!response.ok)
      throw new MercadoLivreError(
        `api_${response.status}`,
        response.status,
        response.status === 401 || response.status === 429 || response.status >= 500,
      );
    return response.json();
  };
  const tokenRequest = async (fields: Record<string, string>) => {
    const c = config();
    let response: Response;
    try {
      response = await fetcher(API + "/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          client_id: c.clientId,
          client_secret: c.clientSecret,
          ...fields,
        }),
        signal: AbortSignal.timeout(4_000),
        redirect: "error",
      });
    } catch {
      throw new MercadoLivreError("token_result_unknown", 503, false);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = [
        "invalid_grant",
        "invalid_client",
        "unauthorized_client",
        "unauthorized_application",
      ].includes(data.error)
        ? data.error
        : `token_http_${response.status}`;
      // A 5xx can have an uncertain result. Only an explicit rate-limit rejection is safe to retry.
      throw new MercadoLivreError(code, 503, response.status === 429);
    }
    if (
      !id(data.user_id) ||
      typeof data.access_token !== "string" ||
      typeof data.refresh_token !== "string" ||
      !data.access_token ||
      !data.refresh_token ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0 ||
      data.expires_in > 604800
    )
      throw new MercadoLivreError("invalid_token_response", 503, false);
    return { ...data, user_id: id(data.user_id) };
  };
  const requireAdmin = async (request: Request) => {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new MercadoLivreError("unauthorized", 401, false);
    const auth = await db.auth.getUser(token);
    if (auth.error || !auth.data?.user) throw new MercadoLivreError("unauthorized", 401, false);
    const role = check(
      await db
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.data.user.id)
        .eq("role", "admin")
        .maybeSingle(),
    );
    if (!role) throw new MercadoLivreError("forbidden", 403, false);
    return auth.data.user.id as string;
  };
  const cookie = (value: string, age = 600) =>
    `${COOKIE}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
  const redirectBack = (result: string) =>
    new Response(null, {
      status: 303,
      headers: {
        ...SAFE_HEADERS,
        Location: `${ADMIN_RETURN}&ml=${result}`,
        "Set-Cookie": cookie("", 0),
      },
    });

  async function start(request: Request, adminId: string) {
    const c = config();
    if (request.headers.get("origin") !== c.origin)
      throw new MercadoLivreError("invalid_origin", 403, false);
    if (!check(await db.rpc("mercado_livre_limit", { p_key: `oauth:${adminId}`, p_limit: 10 })))
      throw new MercadoLivreError("rate_limited", 429, true);
    const state = randomBytes(32).toString("base64url"),
      binding = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    check(
      await db.from("mercado_livre_oauth_states").insert({
        state_hash: hash(state),
        browser_hash: hash(binding),
        initiated_by: adminId,
        verifier_ciphertext: seal(verifier, "pkce"),
        redirect_uri: c.redirect,
        expires_at: new Date(now() + 600_000).toISOString(),
      }),
    );
    const url = new URL("https://auth.mercadolivre.com.br/authorization");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: c.clientId,
      redirect_uri: c.redirect,
      state,
      scope: "read offline_access",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    return json({ authorizationUrl: url.href }, 200, { "Set-Cookie": cookie(binding) });
  }

  async function callback(request: Request) {
    const params = new URL(request.url).searchParams;
    const state = params.get("state") || "";
    const binding =
      request.headers
        .get("cookie")
        ?.split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(COOKIE + "="))
        ?.slice(COOKIE.length + 1) || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(binding))
      return json({ error: "Autorização inválida. Inicie a conexão pelo ERP Dukamp." }, 400);
    try {
      const c = config();
      if (
        params.getAll("state").length !== 1 ||
        params.getAll("code").length > 1 ||
        new URL(request.url).origin !== c.origin
      )
        return redirectBack("invalid_state");
      // Deletion plus filters is atomic: a state can be redeemed only once, by its original browser.
      const rows = check(
        await db
          .from("mercado_livre_oauth_states")
          .delete()
          .eq("state_hash", hash(state))
          .eq("browser_hash", hash(binding))
          .gt("expires_at", new Date(now()).toISOString())
          .select("initiated_by,verifier_ciphertext,redirect_uri"),
      );
      const row = rows?.[0];
      if (!row || row.redirect_uri !== c.redirect) return redirectBack("invalid_state");
      const role = check(
        await db
          .from("user_roles")
          .select("role")
          .eq("user_id", row.initiated_by)
          .eq("role", "admin")
          .maybeSingle(),
      );
      if (!role) return redirectBack("access_denied");
      if (params.has("error")) return redirectBack("access_denied");
      const code = params.get("code") || "";
      if (!code || code.length > 2048 || /[\x00-\x20]/.test(code))
        return redirectBack("invalid_code");
      const tokens = await tokenRequest({
        grant_type: "authorization_code",
        code,
        redirect_uri: c.redirect,
        code_verifier: open(row.verifier_ciphertext, "pkce"),
      });
      const profile = await apiFetch("/users/me", tokens.access_token);
      if (id(profile.id) !== tokens.user_id || profile.site_id !== "MLB")
        throw new MercadoLivreError("account_mismatch", 403, false);
      const allowed = env.MERCADO_LIVRE_ALLOWED_SELLER_IDS?.split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (allowed?.length && !allowed.includes(tokens.user_id))
        throw new MercadoLivreError("account_not_allowed", 403, false);
      // An RPC serializes reconnection with refresh and fences in-flight refresh writers.
      check(
        await db.rpc("mercado_livre_save_connection", {
          p_account_id: tokens.user_id,
          p_application_id: c.clientId,
          p_nickname:
            typeof profile.nickname === "string" ? profile.nickname.slice(0, 200) : tokens.user_id,
          p_access: seal(tokens.access_token, `access:${tokens.user_id}`),
          p_refresh: seal(tokens.refresh_token, `refresh:${tokens.user_id}`),
          p_expires_at: new Date(now() + tokens.expires_in * 1000).toISOString(),
          p_scopes: typeof tokens.scope === "string" ? tokens.scope : "",
          p_actor: row.initiated_by,
        }),
      );
      log("account_connected");
      return redirectBack("connected");
    } catch (error) {
      log("oauth_failed", error);
      return redirectBack("failed");
    }
  }

  async function connection(accountId: string) {
    const c = config();
    const row = check(
      await db
        .from("mercado_livre_connections")
        .select("*")
        .eq("account_id", accountId)
        .eq("application_id", c.clientId)
        .eq("status", "connected")
        .maybeSingle(),
    );
    if (!row) throw new MercadoLivreError("reconnect_required", 503, false);
    return row;
  }
  async function accessToken(accountId: string, rejectedVersion?: number) {
    let row = await connection(accountId);
    if (
      Date.parse(row.expires_at) > now() + 60_000 &&
      (rejectedVersion === undefined || row.token_version !== rejectedVersion)
    )
      return {
        token: open(row.access_ciphertext, `access:${accountId}`),
        version: row.token_version,
      };
    const lease = randomUUID();
    const locked = check(
      await db.rpc("mercado_livre_lock_refresh", {
        p_account_id: accountId,
        p_version: row.token_version,
        p_lease: lease,
      }),
    );
    if (!locked) throw new MercadoLivreError("refresh_in_progress");
    try {
      const tokens = await tokenRequest({
        grant_type: "refresh_token",
        refresh_token: open(row.refresh_ciphertext, `refresh:${accountId}`),
      });
      if (tokens.user_id !== accountId) throw new MercadoLivreError("account_mismatch", 503, false);
      const stored = check(
        await db
          .from("mercado_livre_connections")
          .update({
            access_ciphertext: seal(tokens.access_token, `access:${accountId}`),
            refresh_ciphertext: seal(tokens.refresh_token, `refresh:${accountId}`),
            expires_at: new Date(now() + tokens.expires_in * 1000).toISOString(),
            token_version: row.token_version + 1,
            refresh_lease: null,
            refresh_started_at: null,
            updated_at: new Date(now()).toISOString(),
            last_error: null,
          })
          .eq("account_id", accountId)
          .eq("refresh_lease", lease)
          .eq("status", "connected")
          .select("account_id"),
      );
      if (!stored?.length) throw new MercadoLivreError("refresh_fenced", 503, false);
      return { token: tokens.access_token, version: row.token_version + 1 };
    } catch (error) {
      // Never blindly replay a one-use refresh token after a timeout/crash. Reauthorize if its result is unknown.
      const retry = error instanceof MercadoLivreError && error.retryable;
      check(
        await db
          .from("mercado_livre_connections")
          .update({
            status: retry ? "connected" : "reconnect_required",
            refresh_lease: null,
            refresh_started_at: null,
            last_error: error instanceof MercadoLivreError ? error.code : "refresh_failed",
            updated_at: new Date(now()).toISOString(),
          })
          .eq("account_id", accountId)
          .eq("refresh_lease", lease),
      );
      throw error;
    }
  }
  async function readResource(accountId: string, path: string) {
    let access = await accessToken(accountId);
    try {
      return await apiFetch(path, access.token);
    } catch (error) {
      if (!(error instanceof MercadoLivreError) || error.status !== 401) throw error;
      access = await accessToken(accountId, access.version);
      return apiFetch(path, access.token);
    }
  }

  async function notifications(request: Request) {
    if (request.method === "GET") return json({ service: "mercado-livre", mode: "read_only" });
    if (request.method !== "POST")
      return json({ error: "Método não permitido." }, 405, { Allow: "GET, POST" });
    try {
      if (Number(request.headers.get("content-length") || 0) > 16_384)
        return json({ error: "Corpo muito grande." }, 413);
      // Bound the streamed body too; Content-Length is controlled by the sender.
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 16_384) {
            await reader.cancel();
            return json({ error: "Corpo muito grande." }, 413);
          }
          chunks.push(value);
        }
      }
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return json({ error: "JSON inválido." }, 400);
      }
      const clientId = id(env.MERCADO_LIVRE_CLIENT_ID);
      if (!clientId) throw new MercadoLivreError("configuration_missing");
      const n = validateMercadoLivreNotification(body, clientId);
      if (!n) return json({ received: true });
      // One DB round trip durably queues, deduplicates, limits volume and checks the authorized seller.
      // Mercado Livre notifications have no documented Mercado Pago-style HMAC signature.
      // This envelope is an untrusted hint. Only the authenticated API response is trusted by the worker.
      const result = check(
        await db.rpc(
          "mercado_livre_enqueue",
          Object.fromEntries(Object.entries(n).map(([k, v]) => [`p_${k}`, v])),
        ),
      );
      if (result === "limited")
        return json({ error: "Limite temporário." }, 429, { "Retry-After": "60" });
      return json({ received: true });
    } catch (error) {
      return safeError(error);
    }
  }

  async function processQueue(limit = 5) {
    try {
      config();
    } catch {
      return { processed: 0, configured: false };
    }
    // Expired refresh leases are quarantined instead of replaying an uncertain single-use token.
    check(await db.rpc("mercado_livre_maintenance"));
    const events = check(await db.rpc("mercado_livre_claim_events", { p_limit: limit }));
    await Promise.all(
      (events || []).map(async (event: any) => {
        let update: Record<string, unknown>;
        try {
          const data = await readResource(event.account_id, event.resource);
          let owner = id(data.seller?.id ?? data.seller_id ?? data.sender_id);
          if (event.topic === "items_prices") {
            const item = await readResource(
              event.account_id,
              event.resource.replace(/\/prices$/, ""),
            );
            owner = id(item.seller_id);
          }
          // Questions use seller_id; orders seller.id; shipments sender_id; items seller_id.
          if (owner !== event.account_id)
            throw new MercadoLivreError("resource_owner_mismatch", 403, false);
          // Encrypt a minimal snapshot; no buyer contacts, addresses or messages are retained.
          const snapshot: Record<string, unknown> = {};
          for (const key of [
            "id",
            "status",
            "substatus",
            "last_updated",
            "date_created",
            "date_closed",
            "title",
            "price",
            "currency_id",
            "available_quantity",
            "sold_quantity",
            "total_amount",
            "order_id",
            "seller_custom_field",
          ])
            if (data[key] !== undefined) snapshot[key] = data[key];
          if (Array.isArray(data.order_items))
            snapshot.order_items = data.order_items.map((v: any) => ({
              item_id: v.item?.id,
              variation_id: v.item?.variation_id,
              seller_sku: v.item?.seller_sku,
              quantity: v.quantity,
              unit_price: v.unit_price,
            }));
          if (event.topic === "items_prices" && Array.isArray(data.prices))
            snapshot.prices = data.prices.map((v: any) => ({
              id: v.id,
              type: v.type,
              amount: v.amount,
              regular_amount: v.regular_amount,
              currency_id: v.currency_id,
            }));
          const serialized = JSON.stringify(snapshot);
          update = {
            status: "done",
            snapshot_ciphertext: seal(serialized, `event:${event.id}`),
            snapshot_hash: hash(serialized),
            last_error: null,
            processed_at: new Date(now()).toISOString(),
          };
          log("event_confirmed", undefined, event.id);
        } catch (error) {
          const retry = !(error instanceof MercadoLivreError) || error.retryable;
          update = {
            status: retry && event.attempts < 8 ? "retry" : "dead",
            last_error: error instanceof MercadoLivreError ? error.code : "processing_failed",
            available_at: new Date(
              now() + Math.min(3600, 15 * 2 ** event.attempts) * 1000,
            ).toISOString(),
          };
          log("event_failed", error, event.id);
        }
        check(
          await db
            .from("mercado_livre_events")
            .update({ ...update, lease: null, lease_until: null })
            .eq("id", event.id)
            .eq("lease", event.lease),
        );
      }),
    );
    return { processed: events?.length || 0, configured: true };
  }

  async function admin(request: Request) {
    try {
      const adminId = await requireAdmin(request);
      if (request.method === "GET") {
        const missing = [
          "MERCADO_LIVRE_CLIENT_ID",
          "MERCADO_LIVRE_CLIENT_SECRET",
          "MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY",
          "MERCADO_LIVRE_REDIRECT_URI",
        ].filter((k) => !env[k]);
        let configured = false;
        try {
          config();
          configured = true;
        } catch {
          /* Display setup status only. */
        }
        const connections = check(
          await db
            .from("mercado_livre_connections")
            .select("account_id,nickname,status,expires_at,last_error,connected_at")
            .order("connected_at", { ascending: false }),
        );
        const events = check(
          await db
            .from("mercado_livre_events")
            .select(
              "id,account_id,topic,resource,status,attempts,last_error,created_at,processed_at",
            )
            .order("created_at", { ascending: false })
            .limit(30),
        );
        return json({ configured, missing, connections, events, mode: "read_only" });
      }
      if (request.method !== "POST")
        return json({ error: "Método não permitido." }, 405, { Allow: "GET, POST" });
      const c = config();
      if (request.headers.get("origin") !== c.origin)
        throw new MercadoLivreError("invalid_origin", 403, false);
      const text = await request.text();
      if (text.length > 2048) return json({ error: "Requisição inválida." }, 413);
      let body: any;
      try {
        body = JSON.parse(text);
      } catch {
        throw new MercadoLivreError("invalid_json", 400, false);
      }
      if (body.action === "connect") return start(request, adminId);
      if (
        body.action === "retry" &&
        typeof body.eventId === "string" &&
        /^[0-9a-f-]{36}$/i.test(body.eventId)
      ) {
        if (!check(await db.rpc("mercado_livre_limit", { p_key: `retry:${adminId}`, p_limit: 20 })))
          throw new MercadoLivreError("rate_limited", 429, true);
        check(
          await db
            .from("mercado_livre_events")
            .update({
              status: "pending",
              attempts: 0,
              available_at: new Date(now()).toISOString(),
              last_error: null,
            })
            .eq("id", body.eventId)
            .in("status", ["dead", "retry"]),
        );
        log("retry_requested");
        return json({ queued: true });
      }
      if (body.action === "disconnect" && id(body.accountId)) {
        check(
          await db.rpc("mercado_livre_disconnect", {
            p_account_id: id(body.accountId),
            p_actor: adminId,
          }),
        );
        log("account_disconnected");
        return json({ disconnected: true });
      }
      throw new MercadoLivreError("invalid_action", 400, false);
    } catch (error) {
      return safeError(error);
    }
  }
  return { admin, callback, notifications, processQueue, accessToken, seal, open };
}

export async function getMercadoLivreService() {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  return createMercadoLivreService({ db: supabaseAdmin });
}
