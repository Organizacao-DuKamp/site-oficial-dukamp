import { supabase } from "@/integrations/supabase/client";

export type QuoteItem = {
  id: string;
  product_id: string;
  quantity: number;
  product_name_snapshot: string | null;
  unit_price_snapshot: number | null;
  image?: string | null;
};

export type SellerQuote = {
  id: string;
  seller_id: string;
  seller_record_id?: string;
  client_id: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  notes: string | null;
  valid_until: string;
  created_at: string;
  updated_at?: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  seller_name_snapshot: string | null;
  client_name_snapshot: string | null;
  client_email_snapshot: string | null;
  seller_quote_items?: QuoteItem[];
};

type QuoteResponse = {
  ok?: boolean;
  quote?: SellerQuote;
  quotes?: SellerQuote[];
  cartItems?: Array<{
    id: string;
    name: string;
    price: number;
    image?: string;
    quantity: number;
  }>;
  error?: string;
};

async function request(
  url: string,
  body?: Record<string, unknown>,
): Promise<QuoteResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as QuoteResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar o orçamento.");
  return payload;
}

export async function sellerQuotes(): Promise<SellerQuote[]> {
  return (await request("/api/seller/quotes")).quotes ?? [];
}

export async function quoteById(id: string): Promise<SellerQuote> {
  const quote = (await request(`/api/seller/quotes?id=${encodeURIComponent(id)}`)).quote;
  if (!quote) throw new Error("Orçamento não encontrado.");
  return quote;
}

export async function createSellerQuote(
  clientId: string,
  notes: string,
  validUntil: string,
): Promise<SellerQuote> {
  const quote = (await request("/api/seller/quotes", {
    action: "create",
    clientId,
    notes,
    validUntil,
  })).quote;
  if (!quote) throw new Error("Não foi possível criar o orçamento.");
  return quote;
}

export async function saveSellerQuoteItem(
  quoteId: string,
  productId: string,
  quantity: number,
): Promise<SellerQuote> {
  const quote = (await request("/api/seller/quotes", {
    action: "saveItem",
    quoteId,
    productId,
    quantity,
  })).quote;
  if (!quote) throw new Error("Não foi possível salvar o produto.");
  return quote;
}

export async function removeSellerQuoteItem(
  quoteId: string,
  productId: string,
): Promise<SellerQuote> {
  const quote = (await request("/api/seller/quotes", {
    action: "removeItem",
    quoteId,
    productId,
  })).quote;
  if (!quote) throw new Error("Não foi possível remover o produto.");
  return quote;
}

export async function sendSellerQuote(quoteId: string): Promise<SellerQuote> {
  const quote = (await request("/api/seller/quotes", { action: "send", quoteId })).quote;
  if (!quote) throw new Error("Não foi possível enviar o orçamento.");
  return quote;
}

export async function unreadQuotes(): Promise<SellerQuote[]> {
  return (await request("/api/account/quotes?pending=1")).quotes ?? [];
}

export async function markSellerQuoteViewed(quoteId: string): Promise<SellerQuote | null> {
  return (await request("/api/account/quotes", { action: "view", quoteId })).quote ?? null;
}

export async function respondSellerQuote(quoteId: string, accept: boolean) {
  const payload = await request("/api/account/quotes", {
    action: "respond",
    quoteId,
    accept,
  });
  return {
    quote: payload.quote ?? null,
    cartItems: payload.cartItems ?? [],
  };
}

/** Compatibilidade temporária com as chamadas antigas baseadas em RPC. */
export async function rpc(name: string, args: Record<string, unknown>) {
  if (name === "create_seller_quote") {
    const quote = await createSellerQuote(
      String(args._client_id ?? ""),
      String(args._notes ?? ""),
      String(args._valid_until ?? ""),
    );
    return quote.id;
  }
  if (name === "save_seller_quote_item") {
    return saveSellerQuoteItem(
      String(args._quote_id ?? ""),
      String(args._product_id ?? ""),
      Number(args._quantity ?? 0),
    );
  }
  if (name === "remove_seller_quote_item") {
    return removeSellerQuoteItem(
      String(args._quote_id ?? ""),
      String(args._product_id ?? ""),
    );
  }
  if (name === "send_seller_quote") {
    return sendSellerQuote(String(args._quote_id ?? ""));
  }
  if (name === "mark_seller_quote_viewed") {
    return markSellerQuoteViewed(String(args._quote_id ?? ""));
  }
  if (name === "respond_seller_quote") {
    return respondSellerQuote(String(args._quote_id ?? ""), args._accept === true);
  }
  throw new Error(`Ação de orçamento desconhecida: ${name}`);
}

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
