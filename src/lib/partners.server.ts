import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingProduct } from "./pricing";
import type {
  PartnerInput,
  PartnerSummary,
  PartnerProduct,
  PartnerOrder,
  PartnerStoredQuote,
  PartnerCheckoutData,
} from "./partners";
import { getRequest } from "@tanstack/react-start/server";
import { createAuditedAdminClient } from "./audit.server";
import {
  defaultPartnerSettings,
  partnerSettingsSchema,
  partnerLoginEmail,
  partnerAmounts,
  partnerQuoteFingerprint,
  PARTNER_QUOTE_MINUTES,
  type Partner,
  type PartnerQuoteInput,
  type PartnerSettings,
} from "./partners";
import { priceForAccount } from "./pricing";
import { assertDukampPartnerProduct, DUKAMP_MANUFACTURED_FILTER, isDukampManufacturedProduct } from "./dukamp-products";
import { productQuantities, readProductOptions, resolveOptionSelections } from "./product-options";

function database(userId: string) {
  return createAuditedAdminClient(userId, getRequest()) as SupabaseClient;
}
function check(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "Não foi possível concluir a operação.");
}
export async function requirePartner(db: SupabaseClient, userId: string): Promise<Partner> {
  const { data, error } = await db
    .from("dukamp_partners")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  check(error);
  if (!data) throw new Error("Acesso de parceiro não autorizado ou desativado. Fale com a Dukamp.");
  return data;
}
export async function requirePartnerAdmin(db: SupabaseClient, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  check(error);
  if (!data) throw new Error("Apenas administradores podem gerenciar parceiros.");
}
async function settings(db: SupabaseClient): Promise<PartnerSettings> {
  const { data, error } = await db
    .from("dukamp_partner_settings")
    .select("settings")
    .eq("id", true)
    .maybeSingle();
  check(error);
  return partnerSettingsSchema.parse({ ...defaultPartnerSettings, ...(data?.settings || {}) });
}
export async function bootstrapPartner(userId: string) {
  const db = database(userId);
  const partner = await requirePartner(db, userId);
  const [area, summary] = await Promise.all([
    settings(db),
    db.from("dukamp_partner_sales_summary").select("*").eq("partner_id", partner.id).single(),
  ]);
  check(summary.error);
  return { partner, settings: area, summary: summary.data as PartnerSummary };
}
export async function getAdminPartnerData(userId: string) {
  const db = database(userId);
  await requirePartnerAdmin(db, userId);
  const rows: Partner[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db
      .from("dukamp_partners")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
    check(result.error);
    rows.push(...result.data!);
    if (result.data!.length < 1000) break;
  }
  const summaries: PartnerSummary[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db
      .from("dukamp_partner_sales_summary")
      .select("*")
      .order("partner_id")
      .range(offset, offset + 999);
    check(result.error);
    summaries.push(...result.data!);
    if (result.data!.length < 1000) break;
  }
  return { partners: rows, summaries, settings: await settings(db) };
}
export async function upsertPartner(userId: string, input: PartnerInput) {
  const db = database(userId);
  await requirePartnerAdmin(db, userId);
  const { id, password, ...fields } = input;
  if (!id && !password) throw new Error("Defina uma senha com pelo menos 10 caracteres.");
  const duplicate = await db
    .from("dukamp_partners")
    .select("id")
    .or(`username.eq.${fields.username},cnpj.eq.${fields.cnpj}`);
  check(duplicate.error);
  if (duplicate.data!.some((row: { id: string }) => row.id !== id))
    throw new Error("CNPJ ou usuário já cadastrado, inclusive em parcerias arquivadas.");
  if (id) {
    const existing = await db.from("dukamp_partners").select("*").eq("id", id).single();
    check(existing.error);
    // The login alias belongs exclusively to this dedicated partner account.
    const changedLogin = fields.username !== existing.data!.username;
    if (changedLogin) {
      const auth = await db.auth.admin.updateUserById(existing.data!.user_id, {
        email: partnerLoginEmail(fields.username),
        email_confirm: true,
      });
      check(auth.error);
    }
    const result = await db
      .from("dukamp_partners")
      .update({ ...fields, deleted_at: fields.active ? null : existing.data!.deleted_at })
      .eq("id", id)
      .select("*")
      .single();
    if (result.error) {
      if (changedLogin) {
        const rollback = await db.auth.admin.updateUserById(existing.data!.user_id, {
          email: partnerLoginEmail(existing.data!.username),
          email_confirm: true,
        });
        if (rollback.error)
          console.error("[partners] Falha ao restaurar login", {
            partnerId: id,
            message: rollback.error.message,
          });
      }
      check(result.error);
    }
    if (password) {
      const auth = await db.auth.admin.updateUserById(existing.data!.user_id, { password });
      if (auth.error)
        throw new Error(
          "Cadastro atualizado, mas a senha não foi alterada. Tente redefini-la novamente.",
        );
    }
    return result.data! as Partner;
  }
  const auth = await db.auth.admin.createUser({
    email: partnerLoginEmail(fields.username),
    password,
    email_confirm: true,
    user_metadata: { full_name: fields.nome_completo },
  });
  check(auth.error);
  if (!auth.data.user) throw new Error("Não foi possível criar o acesso.");
  const result = await db
    .from("dukamp_partners")
    .insert({ ...fields, user_id: auth.data.user.id })
    .select("*")
    .single();
  if (result.error) {
    const cleanup = await db.auth.admin.deleteUser(auth.data.user.id);
    if (cleanup.error)
      console.error("[partners] Falha ao remover acesso incompleto", {
        userId: auth.data.user.id,
        message: cleanup.error.message,
      });
    check(result.error);
  }
  return result.data! as Partner;
}
export async function deletePartner(userId: string, id: string) {
  const db = database(userId);
  await requirePartnerAdmin(db, userId);
  const result = await db
    .from("dukamp_partners")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  check(result.error);
  // Every portal action checks the database; already-issued JWTs cannot bypass this.
  return { success: true };
}
export async function updatePartnerSettings(userId: string, value: PartnerSettings) {
  const db = database(userId);
  await requirePartnerAdmin(db, userId);
  const result = await db.from("dukamp_partner_settings").upsert({ id: true, settings: value });
  check(result.error);
  return value;
}
export async function getPartnerProducts(userId: string) {
  const db = database(userId);
  await requirePartner(db, userId);
  const rows: PartnerProduct[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("products")
      .select(
        "id,name,brand,code,images,stock,options,price,consumer_price,producer_price,on_sale,sale_producer_price,catalogs(name,slug)",
      )
      .eq("active", true)
      .or(DUKAMP_MANUFACTURED_FILTER)
      .order("name")
      .order("id")
      .range(offset, offset + 999);
    check(error);
    rows.push(
      ...data!.filter(isDukampManufacturedProduct).map((p: PartnerProduct & PricingProduct) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        images: p.images,
        stock: p.stock,
        options: readProductOptions(p.options),
        price: priceForAccount(p, "cliente"),
      })),
    );
    if (data!.length < 1000) break;
  }
  return rows;
}
export async function quotePurchase(userId: string, input: PartnerQuoteInput) {
  const db = database(userId);
  const partner = await requirePartner(db, userId);
  const { calculateDukampShipping } = await import("./dukamp-shipping.functions");
  const { calculateShipping } = await import("./checkout.functions");
  const { data: products, error } = await db
    .from("products")
    .select(
      "id,name,brand,active,stock,options,price,consumer_price,producer_price,on_sale,sale_producer_price,catalogs(name,slug)",
    )
    .in("id", [...new Set(input.items.map((i) => i.product_id))]);
  check(error);
  const quantities = productQuantities(input.items);
  let subtotalCents = 0;
  const lines = input.items.map((item) => {
    const product = products!.find((p) => p.id === item.product_id);
    if (!product?.active || (product.stock ?? 0) < quantities.get(item.product_id)!)
      throw new Error(
        `Produto indisponível ou estoque insuficiente: ${product?.name || item.product_id}`,
      );
    assertDukampPartnerProduct(product);
    resolveOptionSelections(product.options, item.selected_options);
    const price = priceForAccount(product, "cliente");
    if (!Number.isFinite(price) || price <= 0)
      throw new Error(`Preço indisponível: ${product.name}`);
    const lineCents = Math.round(price * 100) * item.quantity;
    subtotalCents += lineCents;
    return { ...item, name: product.name, unit_price: price, subtotal: lineCents / 100 };
  });
  let options: { servico: string; valor: number; prazoDias: number }[];
  if (input.fulfillment_method === "pickup") {
    const { PICKUP_SERVICE } = await import("./order-fulfillment");
    options = [{ servico: PICKUP_SERVICE, valor: 0, prazoDias: 0 }];
  } else {
    const own = await calculateDukampShipping({
      data: { items: input.items, latitude: input.latitude, longitude: input.longitude },
    });
    if (own.option) options = [own.option];
    else {
      try {
        const freight = await calculateShipping({
          data: { items: input.items, cepDestino: input.cep },
        });
        options = freight.opcoes;
      } catch {
        throw new Error(
          own.status.eligible
            ? `${own.status.reason || "Frete Dukamp indisponível."} Não foi possível cotar os Correios. Informe o ponto de entrega ou fale com a Dukamp.`
            : "Nenhum frete disponível para este pedido. Confira o endereço ou fale com a Dukamp.",
        );
      }
    }
  }
  const shipping = input.shipping_service
    ? options.find((o) => o.servico === input.shipping_service)
    : [...options].sort((a, b) => a.valor - b.valor)[0];
  if (!shipping || !Number.isFinite(shipping.valor) || shipping.valor < 0)
    throw new Error("Frete inválido.");
  const subtotal = subtotalCents / 100;
  const amounts = partnerAmounts(subtotal, shipping.valor);
  const expires_at = new Date(Date.now() + PARTNER_QUOTE_MINUTES * 60_000).toISOString();
  const payload = { fingerprint: partnerQuoteFingerprint(input), input, lines, shipping };
  const result = await db
    .from("dukamp_partner_quotes")
    .insert({
      partner_id: partner.id,
      payload,
      subtotal,
      shipping_cost: shipping.valor,
      gross_total: amounts.gross,
      commission_amount: amounts.commission,
      net_total: amounts.net,
      expires_at,
    })
    .select("id")
    .single();
  check(result.error);
  return {
    id: result.data!.id as string,
    lines,
    subtotal,
    shipping,
    options,
    ...amounts,
    expires_at,
  };
}
// Called only by the shared checkout after authentication. No browser-supplied
// partner ID, discount, price or freight is ever accepted as authoritative.
export async function authorizePartnerCheckout(
  db: SupabaseClient,
  userId: string | null,
  data: PartnerCheckoutData,
) {
  if (!userId) throw new Error("Entre no painel de parceiro para registrar esta compra.");
  const partner = await requirePartner(db, userId);
  const result = await db
    .from("dukamp_partner_quotes")
    .select("*")
    .eq("id", data.partner_quote_id)
    .eq("partner_id", partner.id)
    .single();
  check(result.error);
  const quote = result.data! as PartnerStoredQuote;

  if (!quote || quote.payload.fingerprint !== partnerQuoteFingerprint(data))
    throw new Error("Os produtos ou o endereço mudaram. Simule a compra novamente.");
  if (!quote.order_id && Date.parse(quote.expires_at) <= Date.now())
    throw new Error("A simulação expirou. Calcule novamente.");
  // Revalidate old quotes too: a quote issued before the catalog restriction
  // must not authorize a new third-party order.
  if (!quote.order_id) {
    const ids = [...new Set(data.items.map((item) => item.product_id))];
    const current = await db.from("products").select("id,name,brand,active").in("id", ids);
    check(current.error);
    if (current.data?.length !== ids.length || current.data.some((p) => !p.active))
      throw new Error("Produto indisponível. Simule a compra novamente.");
    current.data.forEach(assertDukampPartnerProduct);
  }
  // New registrations require commercial approval and never start an online charge.
  if (!quote.order_id) throw new Error("Registre a venda sem pagamento no painel de parceiro. A Dukamp confirmará o pedido com o cliente.");
  const { createHash } = await import("node:crypto");
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        fingerprint: quote.payload.fingerprint,
        customer: [
          data.customer_name,
          data.email,
          data.phone,
          data.cpf_cnpj,
          data.referencia_entrega || "",
          data.pessoa_autorizada || "",
        ],
        profile: data.partner_customer_details || {},
        method: data.payment_method,
        installments: data.payment_method === "card" ? (data.card_installments ?? 1) : null,
      }),
    )
    .digest("hex");
  if (quote.checkout_hash && quote.checkout_hash !== requestHash)
    throw new Error(
      "Esta simulação já possui um pedido. Acompanhe-o em Gerenciar vendas ou faça outra simulação.",
    );
  const existing = quote.order_id
    ? await db
        .from("orders")
        .select("*")
        .eq("id", quote.order_id)
        .eq("partner_id", partner.id)
        .single()
    : null;
  if (existing) check(existing.error);
  return {
    partner,
    quote,
    requestHash,
    existingOrder: (existing?.data as PartnerOrder | null) ?? null,
  };
}
export async function getPartnerSales(
  userId: string,
  input: { page: number; partnerId?: string; admin: boolean },
) {
  const db = database(userId);
  let partnerId = input.partnerId;
  if (input.admin) await requirePartnerAdmin(db, userId);
  else partnerId = (await requirePartner(db, userId)).id;
  let query = db.from("partner_sales_feed").select("id,partner_id,created_at,payload", { count: "exact" });
  if (partnerId) query = query.eq("partner_id", partnerId);
  const result = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range((input.page - 1) * 25, input.page * 25 - 1);
  check(result.error);
  // Summary is database-side, so totals are never truncated by pagination.
  const summaries: PartnerSummary[] = [];
  for (let offset = 0; ; offset += 1000) {
    let summaryQuery = db
      .from("dukamp_partner_sales_summary")
      .select("*")
      .order("partner_id")
      .range(offset, offset + 999);
    if (partnerId) summaryQuery = summaryQuery.eq("partner_id", partnerId);
    const summary = await summaryQuery;
    check(summary.error);
    summaries.push(...(summary.data! as PartnerSummary[]));
    if (summary.data!.length < 1000) break;
  }
  return {
    orders: result.data!.map(row => normalizePartnerOrder(row.payload)) as PartnerOrder[],
    count: result.count as number,
    summaries,
  };
}
export async function getPartnerSale(userId: string, orderId: string, admin = false) {
  const db = database(userId);
  let partnerId: string | undefined;
  if (admin) await requirePartnerAdmin(db, userId);
  else partnerId = (await requirePartner(db, userId)).id;
  let requestQuery = db.from("partner_sales_feed").select("payload").eq("id", orderId);
  if (partnerId) requestQuery = requestQuery.eq("partner_id", partnerId);
  const request = await requestQuery.maybeSingle();
  check(request.error);
  if (request.data?.payload?.request_kind === "approval") {
    const payload = request.data.payload;
    if (admin) {
      const contact = await db.from("dukamp_partners").select("pix_key").eq("id", payload.partner_id).single();
      check(contact.error);
      payload.partner_pix_key = contact.data?.pix_key || "";
    }
    return payload as PartnerOrder;
  }
  let query = (db as any)
    .from("orders")
    .select("*,order_items(*)")
    .eq("id", orderId)
    .or("partner_id.not.is.null,origin_partner_id.not.is.null");
  if (partnerId) query = query.or(`partner_id.eq.${partnerId},origin_partner_id.eq.${partnerId}`);
  const result = await query.maybeSingle();
  check(result.error);
  if (!result.data!) throw new Error("Venda não encontrada.");
  const order = result.data!;
  if (order.mp_payment_id && ["pending", "in_process"].includes(order.payment_status)) {
    try {
      const { refreshOrderPayment } = await import("./mercadopago-payment.server");
      const payment = await refreshOrderPayment(order.id, order.mp_payment_id);
      if (payment) order.payment_status = payment.payment_status;
    } catch (error) {
      console.error("[partners] Falha ao atualizar pagamento", {
        orderId,
        message: (error as Error).message,
      });
    }
  }
  // Do not expose provider internals/shipping error logs to partner sessions.
  const { shipping_error, correios_prepostagem_id, mp_status_updated_at, ...publicOrder } = order;
  return normalizePartnerOrder(publicOrder) as PartnerOrder;
}

function normalizePartnerOrder(order: any) {
  if (!order.origin_store_id) return order;
  return {
    ...order,
    partner_id: order.origin_partner_id,
    partner_name: order.partner_name || "Loja online parceira",
    partner_gross_total:
      Number(order.subtotal) + Number(order.shipping_cost) + Number(order.tax_amount || 0),
    partner_commission_amount: Number(order.origin_commission_amount),
    partner_customer_details: order.partner_customer_details || {},
  };
}
