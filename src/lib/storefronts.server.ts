import { readProductOptions } from "./product-options";
import { DUKAMP_MANUFACTURED_FILTER, isDukampManufacturedProduct } from "./dukamp-products";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requirePartner } from "./partners.server";
import {
  storeConfigSchema,
  storeProductSchema,
  storeDelivery,
  storeTotals,
  type Store,
  type StoreConfig,
  type StoreCheckout,
  type StoreProduct,
  type StoreOrder,
} from "./storefronts";
import { sealSecret, openSecret, secretHash, randomSecret } from "./storefront-secrets.server";
import sanitizeHtml from "sanitize-html";
const db = () => supabaseAdmin as SupabaseClient;
function ok<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<T>;
}
export function sanitizeStoreHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "h2",
      "h3",
      "h4",
      "p",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "br",
      "blockquote",
      "a",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}
function baseUrl() {
  const configured = process.env.PUBLIC_APP_URL || process.env.URL || "https://dukamp.netlify.app";
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1")
    throw new Error("URL pública inválida");
  return url.origin;
}
type StoreRow = Omit<Store, "cnpj"> & { config: StoreConfig };
function unpack(row: StoreRow, cnpj = ""): Store {
  return {
    ...storeConfigSchema.parse({
      ...row.config,
      name: row.name,
      slug: row.slug,
      published: row.published,
    }),
    id: row.id,
    partner_id: row.partner_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    payment_connected: row.payment_connected,
    payment_account: row.payment_account,
    cnpj,
  };
}
export async function ownStore(userId: string, create = false) {
  const partner = await requirePartner(db(), userId);
  let row = ok(
    await db().from("partner_stores").select("*").eq("partner_id", partner.id).maybeSingle(),
  );
  if (!row && create) {
    const config = storeConfigSchema.parse({
      name: partner.razao_social,
      slug: `loja-${partner.id}`,
      logo_url: partner.logo_url || "",
      address: `${partner.rua}, ${partner.numero}, ${partner.bairro} — ${partner.cidade}/${partner.estado}`,
    });
    const result = await db()
      .from("partner_stores")
      .insert({ partner_id: partner.id, slug: config.slug, name: config.name, config })
      .select("*")
      .single();
    if (result.error?.code === "23505")
      row = ok(await db().from("partner_stores").select("*").eq("partner_id", partner.id).single());
    else row = ok(result);
  }
  if (!row) throw new Error("Configure sua loja primeiro.");
  return { store: unpack(row, partner.cnpj), partner };
}
export async function dashboard(userId: string, page = 1) {
  const { store } = await ownStore(userId, true);
  const [products, orders, summary] = await Promise.all([
    db()
      .from("partner_store_products")
      .select("*")
      .eq("store_id", store.id)
      .is("deleted_at", null)
      .order("name")
      .limit(1000),
    db()
      .from("partner_store_orders")
      .select("*", { count: "exact" })
      .eq("store_id", store.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * 30, page * 30 - 1),
    db().from("partner_store_summary").select("*").eq("store_id", store.id).single(),
  ]);
  return {
    store,
    products: ok(products) as StoreProduct[],
    orders: ok(orders) as StoreOrder[],
    orderCount: orders.count || 0,
    summary: ok(summary) as {
      products: number;
      units: number;
      orders: number;
      paid_orders: number;
      revenue: number;
      pending: number;
      visits_30d: number;
    },
    oauth_available: !!(
      process.env.MERCADO_PAGO_CLIENT_ID && process.env.MERCADO_PAGO_CLIENT_SECRET
    ),
    page,
  };
}
export async function saveStore(userId: string, input: StoreConfig) {
  const { store } = await ownStore(userId, true);
  const config = storeConfigSchema.parse(input);
  for (const page of Object.values(config.footer)) page.html = sanitizeStoreHtml(page.html);
  if (config.published && !config.pickup_enabled && !config.delivery_enabled)
    throw new Error("Habilite retirada ou entrega para publicar a loja.");
  if (config.delivery_enabled && !config.delivery_cep_prefixes.length)
    throw new Error("Cadastre os prefixos de CEP atendidos pela loja.");
  if (config.published && (!config.email || !config.phone || !config.address))
    throw new Error("Preencha e-mail, telefone e endereço antes de publicar a loja.");
  const r = await db()
    .from("partner_stores")
    .update({ name: config.name, slug: config.slug, published: config.published, config })
    .eq("id", store.id)
    .select("*")
    .single();
  if (r.error?.code === "23505") throw new Error("Este endereço já pertence a outra loja.");
  return unpack(ok(r), store.cnpj);
}
export async function saveProduct(userId: string, input: unknown) {
  const { store } = await ownStore(userId);
  const { id, version, ...product } = storeProductSchema.parse(input);
  product.description = sanitizeStoreHtml(product.description);
  if (id) {
    if (!version) throw new Error("Reabra o produto antes de salvar as alterações.");
    const r = await db()
      .from("partner_store_products")
      .update(product)
      .eq("store_id", store.id)
      .eq("id", id)
      .eq("updated_at", version)
      .is("deleted_at", null)
      .select("id")
      .single();
    if (r.error)
      throw new Error(
        "O produto ou estoque foi atualizado. Recarregue a página e reabra o produto para editar.",
      );
    return ok(r);
  }
  return ok(
    await db()
      .from("partner_store_products")
      .insert({ ...product, store_id: store.id })
      .select("id")
      .single(),
  );
}
export async function deleteProduct(userId: string, id: string) {
  const { store } = await ownStore(userId);
  return ok(
    await db()
      .from("partner_store_products")
      .update({ active: false, deleted_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .eq("id", id)
      .select("id")
      .single(),
  );
}
export async function uploadImage(userId: string, input: { base64: string; mime: string }) {
  const { partner } = await ownStore(userId, true);
  const bytes = Buffer.from(input.base64, "base64");
  const { mime } = input;
  const magic =
    mime === "image/png"
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "image/webp"
          ? bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
          : false;
  if (!magic || bytes.length > 5 * 1024 * 1024)
    throw new Error("Use PNG, JPG ou WebP de até 5 MB.");
  const path = `${partner.id}/${randomSecret()}.${mime.split("/")[1]}`;
  ok(
    await db()
      .storage.from("partner-store-images")
      .upload(path, bytes, { contentType: mime, upsert: false }),
  );
  return {
    url: db().storage.from("partner-store-images").getPublicUrl(path).data.publicUrl as string,
  };
}
export async function limit(action: string, max: number) {
  const request = getRequest();
  const ip =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = secretHash(`${action}:${ip}:${Math.floor(Date.now() / 60000)}`);
  const allowed = ok(await db().rpc("partner_store_rate_limit", { p_bucket: key, p_limit: max }));
  if (!allowed) throw new Error("Muitas solicitações. Aguarde um minuto e tente novamente.");
}
export async function publicStore(slug: string, orderPage = false) {
  await limit("store-read", 120);
  let query = db().from("partner_stores").select("*").eq("slug", slug);
  if (!orderPage) query = query.eq("published", true);
  const row = ok(await query.maybeSingle());
  if (!row) throw new Error("Loja não encontrada ou ainda não publicada.");
  let partnerQuery = db().from("dukamp_partners").select("id,cnpj").eq("id", row.partner_id);
  if (!orderPage) partnerQuery = partnerQuery.eq("active", true).is("deleted_at", null);
  const partner = ok(await partnerQuery.maybeSingle());
  if (!partner) throw new Error("Loja indisponível.");
  let store = unpack(row, partner.cnpj);
  if (orderPage)
    store = {
      ...store,
      hero_text: "",
      hero_title: "",
      tagline: "",
      footer: {},
      navbar: store.navbar.filter((n) => n.key === "inicio" || n.key === "contato"),
    };
  const [own, dukamp] = await Promise.all([
    db()
      .from("partner_store_products")
      .select("id,name,code,description,category,brand,unit,images,price,stock,active")
      .eq("store_id", store.id)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name")
      .limit(1000),
    db()
      .from("products")
      .select(
        "id,name,brand,slug,code,images,description,options,price,consumer_price,producer_price,on_sale,sale_consumer_price,sale_producer_price,stock,featured,catalogs(name,slug)",
      )
      .eq("active", true)
      .or(DUKAMP_MANUFACTURED_FILTER)
      .order("featured", { ascending: false })
      .order("name")
      .limit(1000),
  ]);
  const { priceForAccount } = await import("./pricing");
  // Never return the partner identity, internal product costs or payment credentials.
  return {
    store: { ...store, partner_id: undefined, payment_account: "" },
    products: (orderPage ? [] : ok(own)) as Omit<
      StoreProduct,
      "cost" | "store_id" | "created_at"
    >[],
    dukamp: (orderPage ? [] : ok(dukamp)).filter(isDukampManufacturedProduct).map((p) => {
      const catalog = Array.isArray(p.catalogs) ? p.catalogs[0] : p.catalogs;
      return {
        id: String(p.id),
        name: String(p.name),
        slug: String(p.slug),
        images: (p.images || []) as string[],
        description: sanitizeStoreHtml(p.description || ""),
        options: readProductOptions(p.options),
        price: priceForAccount({ ...p, catalogs: catalog }, "cliente"),
        stock: Number(p.stock),
        featured: Boolean(p.featured),
        category: String(catalog?.name || "Dukamp"),
      };
    }),
  };
}
export async function recordVisit(slug: string, visitor: string) {
  await limit("store-visit", 30);
  const row = ok(
    await db()
      .from("partner_stores")
      .select("id")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle(),
  );
  if (!row) return { success: false };
  const day = new Date().toISOString().slice(0, 10);
  ok(
    await db()
      .from("partner_store_visits")
      .upsert(
        { store_id: row.id, day, visitor_hash: secretHash(`${row.id}:${day}:${visitor}`) },
        { onConflict: "store_id,day,visitor_hash", ignoreDuplicates: true },
      ),
  );
  return { success: true };
}
export async function mpRequest(path: string, token: string, body?: unknown, key?: string) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(key ? { "X-Idempotency-Key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!r.ok) {
    await r.text();
    throw new Error(
      `Mercado Pago não concluiu a operação (${r.status}). Confira a conexão e tente novamente.`,
    );
  }
  return r.json();
}
async function storeCredential(storeId: string) {
  const c = ok(
    await db().from("partner_store_credentials").select("*").eq("store_id", storeId).single(),
  );
  if (c.expires_at && Date.parse(c.expires_at) < Date.now() + 120000) {
    if (!c.encrypted_refresh || !process.env.MERCADO_PAGO_CLIENT_SECRET)
      throw new Error("Reconecte o Mercado Pago da loja.");
    const r = await mpRequest("/oauth/token", "", {
      grant_type: "refresh_token",
      client_id: process.env.MERCADO_PAGO_CLIENT_ID,
      client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
      refresh_token: openSecret(c.encrypted_refresh),
    });
    c.encrypted_token = sealSecret(r.access_token);
    c.encrypted_refresh = sealSecret(r.refresh_token);
    c.expires_at = new Date(Date.now() + r.expires_in * 1000).toISOString();
    ok(
      await db()
        .from("partner_store_credentials")
        .update({
          encrypted_token: c.encrypted_token,
          encrypted_refresh: c.encrypted_refresh,
          expires_at: c.expires_at,
        })
        .eq("store_id", storeId),
    );
  }
  return { token: openSecret(c.encrypted_token), collector: String(c.collector_id) };
}
async function connectStore(store: Store, token: string, refresh?: string, expires?: number) {
  const account = await mpRequest("/users/me", token);
  if (!account.id || account.site_id !== "MLB")
    throw new Error("Conecte uma conta Mercado Pago brasileira.");
  if (
    account.identification?.type === "CNPJ" &&
    String(account.identification.number).replace(/\D/g, "") !== store.cnpj
  )
    throw new Error("O CNPJ da conta Mercado Pago deve corresponder ao cadastro da parceria.");
  const prior = ok(
    await db()
      .from("partner_store_credentials")
      .select("collector_id")
      .eq("store_id", store.id)
      .maybeSingle(),
  );
  if (prior && String(prior.collector_id) !== String(account.id)) {
    const orders = await db()
      .from("partner_store_orders")
      .select("id", { head: true, count: "exact" })
      .eq("store_id", store.id)
      .eq("source", "online");
    if (orders.error) throw orders.error;
    if (orders.count)
      throw new Error(
        "A conta recebedora não pode ser trocada depois de emitir pedidos online. Fale com o suporte.",
      );
  }
  ok(
    await db()
      .from("partner_store_credentials")
      .upsert({
        store_id: store.id,
        encrypted_token: sealSecret(token),
        encrypted_refresh: refresh ? sealSecret(refresh) : null,
        collector_id: String(account.id),
        expires_at: expires ? new Date(Date.now() + expires * 1000).toISOString() : null,
        connection_type: refresh ? "oauth" : "credentials",
      }),
  );
  const name =
    account.nickname ||
    [account.first_name, account.last_name].filter(Boolean).join(" ") ||
    String(account.id);
  ok(
    await db()
      .from("partner_stores")
      .update({ payment_connected: true, payment_account: String(name) })
      .eq("id", store.id),
  );
  return { account: String(name) };
}
export async function connectCredentials(userId: string, token: string) {
  const { store } = await ownStore(userId, true);
  return connectStore(store, token);
}
export async function disconnectPayments(userId: string) {
  const { store } = await ownStore(userId);
  ok(await db().from("partner_stores").update({ payment_connected: false }).eq("id", store.id));
  return { success: true };
}
export async function beginOAuth(userId: string) {
  const { store } = await ownStore(userId, true);
  if (!process.env.MERCADO_PAGO_CLIENT_ID || !process.env.MERCADO_PAGO_CLIENT_SECRET)
    throw new Error(
      "Conexão por autorização ainda não configurada. Use as credenciais da sua integração.",
    );
  const state = randomSecret(),
    verifier = randomSecret();
  ok(
    await db()
      .from("partner_store_oauth_states")
      .delete()
      .lt("expires_at", new Date().toISOString()),
  );
  ok(
    await db()
      .from("partner_store_oauth_states")
      .insert({
        state_hash: secretHash(state),
        store_id: store.id,
        user_id: userId,
        verifier,
        expires_at: new Date(Date.now() + 600000).toISOString(),
      }),
  );
  setResponseHeader(
    "Set-Cookie",
    `dukamp_store_oauth=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/partner-store/oauth; Max-Age=600`,
  );
  const { createHash } = await import("node:crypto");
  const url = new URL("https://auth.mercadopago.com/authorization");
  Object.entries({
    client_id: process.env.MERCADO_PAGO_CLIENT_ID,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: `${baseUrl()}/api/partner-store/oauth`,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  return { url: url.href };
}
export async function finishOAuth(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("dukamp_store_oauth="))
    ?.split("=")[1];
  if (!state || state !== cookie)
    throw new Error("Autorização inválida ou expirada. Inicie a conexão novamente.");
  const row = ok(
    await db()
      .from("partner_store_oauth_states")
      .delete()
      .eq("state_hash", secretHash(state))
      .gt("expires_at", new Date().toISOString())
      .select("*")
      .maybeSingle(),
  );
  if (!row) throw new Error("Autorização expirada ou já utilizada.");
  const { store } = await ownStore(row.user_id);
  if (store.id !== row.store_id) throw new Error("Loja inválida.");
  const code = url.searchParams.get("code");
  if (!code) throw new Error("Autorização não concluída.");
  const r = await mpRequest("/oauth/token", "", {
    client_id: process.env.MERCADO_PAGO_CLIENT_ID,
    client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${baseUrl()}/api/partner-store/oauth`,
    code_verifier: row.verifier,
  });
  await connectStore(store, r.access_token, r.refresh_token, r.expires_in);
  return `${baseUrl()}/parceiro/site/definicoes?conexao=ok`;
}
export async function createStoreOrder(input: StoreCheckout, userId?: string) {
  await limit(userId ? "store-manual" : "store-checkout", userId ? 30 : 8);
  let store: Store;
  if (userId) {
    store = (await ownStore(userId)).store;
    if (store.slug !== input.slug || input.payment_method !== "manual")
      throw new Error("Venda inválida.");
  } else {
    if (input.payment_method === "manual") throw new Error("Pagamento inválido.");
    const r = ok(
      await db()
        .from("partner_stores")
        .select("*")
        .eq("slug", input.slug)
        .eq("published", true)
        .single(),
    );
    store = unpack(r);
    await requireActiveStore(store);
    if (!store.payment_connected)
      throw new Error("Esta loja ainda não habilitou pagamentos online.");
  }
  const hash = secretHash(JSON.stringify({ ...input, access_token: undefined }));
  const order = ok(
    await db().rpc("create_partner_store_order", {
      p_store: store.id,
      p_request: input.request_id,
      p_request_hash: hash,
      p_access_hash: secretHash(input.access_token),
      p_customer: input.customer,
      p_items: input.items,
      p_fulfillment: input.fulfillment,
      p_method: input.payment_method,
      p_source: userId ? "manual" : "online",
    }),
  ) as StoreOrder;
  let paymentPending = false;
  if (!userId) {
    try {
      await ensureStorePayment(store, order, input.access_token);
    } catch {
      paymentPending = true;
    }
  }
  return { id: order.id, order_number: order.order_number, payment_pending: paymentPending };
}
async function requireActiveStore(store: Store) {
  const r = ok(
    await db()
      .from("dukamp_partners")
      .select("id")
      .eq("id", store.partner_id)
      .eq("active", true)
      .is("deleted_at", null)
      .maybeSingle(),
  );
  if (!r) throw new Error("Loja indisponível.");
}
async function ensureStorePayment(store: Store, order: StoreOrder, accessToken: string) {
  if (order.payment_id || order.checkout_url || order.payment_status === "approved") return;
  if (Date.parse(order.expires_at) <= Date.now())
    throw new Error(
      "Este pedido expirou. Fale com a loja para liberar o estoque e faça um novo pedido.",
    );
  const claim = ok(
    await db().rpc("claim_partner_store_payment", { p_store: store.id, p_order: order.id }),
  ) as { claimed: boolean; issued: boolean; retry: boolean };
  if (!claim.claimed) {
    if (claim.issued) return;
    throw new Error(
      "Pagamento em emissão. Aguarde alguns instantes e tente novamente para retomar o mesmo pedido.",
    );
  }
  const credential = await storeCredential(store.id);
  const notify = `${baseUrl()}/api/partner-store/webhook?store=${store.id}`;
  if (order.payment_method === "pix") {
    const p = await mpRequest(
      "/v1/payments",
      credential.token,
      {
        transaction_amount: Number(order.total),
        description: `Pedido ${order.order_number} — ${store.name}`,
        payment_method_id: "pix",
        external_reference: order.id,
        notification_url: notify,
        date_of_expiration: new Date(order.expires_at).toISOString(),
        payer: {
          email: order.customer.email,
          first_name: order.customer.name.split(" ")[0],
          last_name: order.customer.name.split(" ").slice(1).join(" ") || order.customer.name,
          identification: {
            type: order.customer.document.length === 14 ? "CNPJ" : "CPF",
            number: order.customer.document,
          },
        },
      },
      order.id,
    );
    if (String(p.collector_id) !== credential.collector)
      throw new Error("Conta recebedora inválida.");
    ok(
      await db()
        .from("partner_store_orders")
        .update({
          payment_id: String(p.id),
          qr_code: p.point_of_interaction?.transaction_data?.qr_code || null,
          qr_image: p.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        })
        .eq("id", order.id)
        .eq("store_id", store.id),
    );
    await reconcileStorePayment(store.id, p, credential.collector);
  } else {
    const back = `${baseUrl()}/${store.slug}/pedido/${order.id}?token=${accessToken}`;
    // Return URL carries the capability token supplied in the current checkout, never a customer session.
    let preference;
    if (claim.retry) {
      const search = await mpRequest(
        `/checkout/preferences/search?external_reference=${encodeURIComponent(order.id)}`,
        credential.token,
      );
      const entry = search.elements?.[0];
      if (entry?.id) {
        const saved = await mpRequest(
          `/checkout/preferences/${encodeURIComponent(entry.id)}`,
          credential.token,
        );
        const amount = (saved.items || []).reduce(
          (n: number, i: { unit_price: number; quantity: number }) =>
            n + Number(i.unit_price) * Number(i.quantity),
          0,
        );
        if (
          saved.external_reference !== order.id ||
          String(saved.collector_id) !== credential.collector ||
          Math.round(amount * 100) !== Math.round(order.total * 100)
        )
          throw new Error("Checkout anterior precisa de conferência pela loja.");
        preference = saved;
      }
    }
    preference ||= await mpRequest(
      "/checkout/preferences",
      credential.token,
      {
        items: [
          {
            id: order.id,
            title: `Pedido ${order.order_number} — ${store.name}`,
            quantity: 1,
            unit_price: Number(order.total),
            currency_id: "BRL",
          },
        ],
        payer: { email: order.customer.email, name: order.customer.name },
        external_reference: order.id,
        notification_url: notify,
        back_urls: { success: back, pending: back, failure: back },
        auto_return: "approved",
        expires: true,
        expiration_date_to: new Date(order.expires_at).toISOString(),
        payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }] },
        metadata: { dukamp_store_id: store.id },
      },
      order.id,
    );
    if (!/^https:\/\/([a-z0-9-]+\.)?mercadopago\.com(\.br)?\//i.test(preference.init_point || ""))
      throw new Error("Link de pagamento inválido.");
    ok(
      await db()
        .from("partner_store_orders")
        .update({ checkout_url: preference.init_point, preference_id: String(preference.id) })
        .eq("id", order.id)
        .eq("store_id", store.id),
    );
  }
}
type MpPayment = {
  id: string | number;
  collector_id: string | number;
  currency_id: string;
  external_reference: string;
  transaction_amount: number;
  status: string;
  date_last_updated: string;
};
export async function reconcileStorePayment(storeId: string, p: MpPayment, collector: string) {
  if (
    String(p.collector_id) !== collector ||
    p.currency_id !== "BRL" ||
    !p.external_reference ||
    !Number.isFinite(p.transaction_amount)
  )
    throw new Error("Pagamento inválido para esta loja.");
  return ok(
    await db().rpc("reconcile_partner_store_payment", {
      p_store: storeId,
      p_order: p.external_reference,
      p_payment: String(p.id),
      p_status: p.status,
      p_amount: p.transaction_amount,
      p_updated: p.date_last_updated,
    }),
  );
}
export async function handleStoreWebhook(storeId: string, paymentId: string) {
  if (!/^\d+$/.test(paymentId)) throw new Error("Pagamento inválido.");
  const c = await storeCredential(storeId);
  return reconcileStorePayment(
    storeId,
    await mpRequest(`/v1/payments/${paymentId}`, c.token),
    c.collector,
  );
}
export async function refreshStoreOrder(order: StoreOrder) {
  if (
    order.source !== "online" ||
    ["refunded", "charged_back", "cancelled"].includes(order.payment_status)
  )
    return order;
  const c = await storeCredential(order.store_id);
  if (order.payment_id) {
    return (await reconcileStorePayment(
      order.store_id,
      await mpRequest(`/v1/payments/${order.payment_id}`, c.token),
      c.collector,
    )) as StoreOrder;
  }
  const found = await mpRequest(
    `/v1/payments/search?external_reference=${encodeURIComponent(order.id)}&sort=date_created&criteria=desc`,
    c.token,
  );
  const p = found.results?.find((p: MpPayment) => p.status === "approved") || found.results?.[0];
  return p ? ((await reconcileStorePayment(order.store_id, p, c.collector)) as StoreOrder) : order;
}
export async function publicOrder(slug: string, id: string, access: string) {
  await limit("store-order", 90);
  const row = ok(
    await db().from("partner_stores").select("id,name,slug").eq("slug", slug).maybeSingle(),
  );
  if (!row) throw new Error("Pedido não encontrado.");
  let order = ok(
    await db()
      .from("partner_store_orders")
      .select("*")
      .eq("id", id)
      .eq("store_id", row.id)
      .eq("access_hash", secretHash(access))
      .single(),
  ) as StoreOrder;
  try {
    order = await refreshStoreOrder(order);
  } catch {
    /* A provider outage does not hide an already issued Pix. */
  }
  return {
    id: order.id,
    order_number: order.order_number,
    items: order.items.map(({ cost: _, ...i }) => i),
    total: order.total,
    subtotal: order.subtotal,
    shipping_cost: order.shipping_cost,
    fulfillment: order.fulfillment,
    payment_status: order.payment_status,
    delivery_status: order.delivery_status,
    qr_code: order.qr_code,
    qr_image: order.qr_image,
    checkout_url: order.checkout_url,
    expires_at: order.expires_at,
    payment_method: order.payment_method,
    store_name: row.name,
  };
}
export async function manageStoreOrder(userId: string, id: string, action: string, patch: unknown) {
  const { store } = await ownStore(userId);
  if (action === "cancel") return cancelUnpaidStoreOrder(store.id, id);
  if (action === "refresh") {
    let order = ok(
      await db()
        .from("partner_store_orders")
        .select("*")
        .eq("id", id)
        .eq("store_id", store.id)
        .single(),
    );
    order = await refreshStoreOrder(order);
    return { id: order.id };
  }
  return ok(
    await db().rpc("manage_partner_store_order", {
      p_store: store.id,
      p_order: id,
      p_action: action,
      p_patch: patch,
    }),
  );
}
export async function resolveStoreOrigin(slug: string) {
  const row = ok(
    await db().from("partner_stores").select("*").eq("slug", slug).eq("published", true).single(),
  );
  const store = unpack(row);
  await requireActiveStore(store);
  const partner = ok(
    await db().from("dukamp_partners").select("razao_social").eq("id", store.partner_id).single(),
  );
  return { storeId: store.id, partnerId: store.partner_id, partnerName: partner.razao_social };
}

async function cancelUnpaidStoreOrder(storeId: string, id: string) {
  let order = ok(
    await db()
      .from("partner_store_orders")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeId)
      .single(),
  ) as StoreOrder;
  if (order.source !== "online") throw new Error("Utilize excluir registro para vendas manuais.");
  order = await refreshStoreOrder(order);
  if (!["pending", "rejected"].includes(order.payment_status))
    throw new Error("Pagamento aprovado, em análise ou já encerrado. Confira o Mercado Pago.");
  const c = await storeCredential(storeId);
  if (order.payment_method === "pix" && order.payment_id) {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${order.payment_id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Não foi possível cancelar o Pix. Consulte o Mercado Pago.");
    const payment = await response.json();
    if (payment.status !== "cancelled") throw new Error("Pagamento ainda não cancelado.");
    return reconcileStorePayment(storeId, payment, c.collector);
  }
  if (Date.parse(order.expires_at) > Date.now() - 3600000)
    throw new Error(
      "Aguarde uma hora após o vencimento para cancelar um checkout sem pagamento emitido.",
    );
  const found = await mpRequest(
    `/v1/payments/search?external_reference=${encodeURIComponent(order.id)}`,
    c.token,
  );
  if (
    found.results?.some((p: MpPayment) => ["approved", "in_process", "pending"].includes(p.status))
  )
    throw new Error(
      "Existe um pagamento em processamento. Confira a conta Mercado Pago antes de cancelar.",
    );
  return ok(
    await db().rpc("cancel_unpaid_partner_store_order", { p_store: storeId, p_order: order.id }),
  );
}

export async function retryPublicStorePayment(slug: string, id: string, access: string) {
  await limit("store-payment-retry", 15);
  const row = ok(await db().from("partner_stores").select("*").eq("slug", slug).single());
  const order = ok(
    await db()
      .from("partner_store_orders")
      .select("*")
      .eq("store_id", row.id)
      .eq("id", id)
      .eq("access_hash", secretHash(access))
      .single(),
  ) as StoreOrder;
  await ensureStorePayment(unpack(row), order, access);
  return { success: true };
}
