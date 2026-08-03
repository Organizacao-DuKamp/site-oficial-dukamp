import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

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

type EncryptedQuote = {
  version: 2;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

const PREFIX = "seller_quote:";

function encryptionKey(): Buffer {
  const secret =
    process.env.SELLER_QUOTES_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Chave de criptografia dos orçamentos não configurada.");
  }
  return createHash("sha256").update(`dukamp-seller-quotes:${secret}`).digest();
}

function isStoredQuote(value: unknown): value is StoredQuote {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredQuote>;
  return candidate.version === 1 && typeof candidate.id === "string" && Array.isArray(candidate.items);
}

function isEncryptedQuote(value: unknown): value is EncryptedQuote {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EncryptedQuote>;
  return (
    candidate.version === 2 &&
    candidate.algorithm === "aes-256-gcm" &&
    typeof candidate.iv === "string" &&
    typeof candidate.tag === "string" &&
    typeof candidate.ciphertext === "string"
  );
}

function encryptQuote(quote: StoredQuote): EncryptedQuote {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(quote), "utf8"),
    cipher.final(),
  ]);
  return {
    version: 2,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptQuote(value: EncryptedQuote): StoredQuote {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const parsed = JSON.parse(plaintext) as unknown;
  if (!isStoredQuote(parsed)) throw new Error("Conteúdo de orçamento inválido.");
  return parsed;
}

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
  if (!data?.value) return null;

  if (isEncryptedQuote(data.value)) return decryptQuote(data.value);
  if (isStoredQuote(data.value)) {
    // Migra automaticamente qualquer registro criado antes da criptografia.
    await writeQuote(supabaseAdmin, data.value);
    return data.value;
  }
  return null;
}

export async function listQuotes(supabaseAdmin: any): Promise<StoredQuote[]> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .like("key", `${PREFIX}%`);
  if (error) throw error;

  const quotes: StoredQuote[] = [];
  for (const row of data ?? []) {
    try {
      if (isEncryptedQuote(row.value)) {
        quotes.push(decryptQuote(row.value));
      } else if (isStoredQuote(row.value)) {
        quotes.push(row.value);
        await writeQuote(supabaseAdmin, row.value);
      }
    } catch (error) {
      console.error("[seller-quotes] Registro inválido ou impossível de descriptografar:", error);
    }
  }
  return quotes;
}

export async function writeQuote(supabaseAdmin: any, quote: StoredQuote): Promise<void> {
  const encrypted = encryptQuote(quote);
  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert(
      { key: quoteKey(quote.id), value: encrypted, updated_at: new Date().toISOString() },
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
