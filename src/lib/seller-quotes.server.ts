export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export type StoredQuoteItem = {
  id: string;
  product_id: string;
  quantity: number;
  product_name_snapshot: string | null;
  unit_price_snapshot: number | null;
  image: string | null;
};

export type StoredQuote = {
  version: 1;
  id: string;
  seller_user_id: string;
  seller_record_id: string;
  seller_name_snapshot: string;
  client_id: string;
  client_name_snapshot: string | null;
  client_email_snapshot: string | null;
  status: QuoteStatus;
  notes: string | null;
  valid_until: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  items: StoredQuoteItem[];
};

const PREFIX = "seller_quote:";

export function quoteKey(id: string) {
  return `${PREFIX}${id}`;
}

export function publicQuote(quote: StoredQuote) {
  return {
    id: quote.id,
    seller_id: quote.seller_user_id,
    seller_record_id: quote.seller_record_id,
    client_id: quote.client_id,
    status: quote.status,
    notes: quote.notes,
    valid_until: quote.valid_until,
    created_at: quote.created_at,
    updated_at: quote.updated_at,
    sent_at: quote.sent_at,
    viewed_at: quote.viewed_at,
    accepted_at: quote.accepted_at,
    declined_at: quote.declined_at,
    seller_name_snapshot: quote.seller_name_snapshot,
    client_name_snapshot: quote.client_name_snapshot,
    client_email_snapshot: quote.client_email_snapshot,
    seller_quote_items: quote.items,
  };
}

export async function readQuote(supabaseAdmin: any, id: string): Promise<StoredQuote | null> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", quoteKey(id))
    .maybeSingle();
  if (error) throw error;
  return (data?.value as StoredQuote | undefined) ?? null;
}

export async function listQuotes(supabaseAdmin: any): Promise<StoredQuote[]> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .like("key", `${PREFIX}%`);
  if (error) throw error;
  return (data ?? [])
    .map((row: any) => row.value as StoredQuote)
    .filter((quote: StoredQuote | null): quote is StoredQuote =>
      Boolean(quote?.id && quote.version === 1),
    );
}

export async function writeQuote(supabaseAdmin: any, quote: StoredQuote): Promise<void> {
  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert(
      { key: quoteKey(quote.id), value: quote, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw error;
}

export async function refreshExpiration(
  supabaseAdmin: any,
  quote: StoredQuote,
): Promise<StoredQuote> {
  if (
    (quote.status === "sent" || quote.status === "draft") &&
    new Date(quote.valid_until).getTime() <= Date.now()
  ) {
    const expired = {
      ...quote,
      status: "expired" as const,
      updated_at: new Date().toISOString(),
    };
    await writeQuote(supabaseAdmin, expired);
    return expired;
  }
  return quote;
}

function firstFinite(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}

export function productPrice(
  product: any,
  accountType: string | null | undefined,
): number | null {
  const type = accountType ?? "cliente";

  if (type === "produtor") {
    return product.on_sale
      ? firstFinite(
          product.sale_producer_price,
          product.producer_price,
          product.consumer_price,
          product.price,
        )
      : firstFinite(product.producer_price, product.consumer_price, product.price);
  }

  if (type === "revendedor" || type === "empresa") {
    return firstFinite(product.reseller_price, product.consumer_price, product.price);
  }

  return product.on_sale
    ? firstFinite(product.sale_consumer_price, product.consumer_price, product.price)
    : firstFinite(product.consumer_price, product.price);
}

export async function getClientProfile(supabaseAdmin: any, clientId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, account_type")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProducts(supabaseAdmin: any, productIds: string[]) {
  if (!productIds.length) return [];
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id,name,images,stock,active,price,consumer_price,producer_price,reseller_price,on_sale,sale_consumer_price,sale_producer_price",
    )
    .in("id", productIds);
  if (error) throw error;
  return data ?? [];
}
