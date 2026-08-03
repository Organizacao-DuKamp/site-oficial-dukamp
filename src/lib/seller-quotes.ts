import { supabase } from "@/integrations/supabase/client";

export type QuoteItem = { id: string; product_id: string; quantity: number; product_name_snapshot: string | null; unit_price_snapshot: number | null };
export type SellerQuote = { id: string; seller_id: string; client_id: string; status: "draft" | "sent" | "accepted" | "declined" | "expired"; notes: string | null; valid_until: string; created_at: string; sent_at: string | null; viewed_at: string | null; accepted_at: string | null; declined_at: string | null; seller_name_snapshot: string | null; client_name_snapshot: string | null; client_email_snapshot: string | null; seller_quote_items?: QuoteItem[]; seller?: { full_name: string | null } | null; client?: { full_name: string | null; email: string | null } | null };

const db = supabase as any;
export async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function sellerQuotes(): Promise<SellerQuote[]> {
  const { data, error } = await db.from("seller_quotes").select("*, client:profiles!seller_quotes_client_id_fkey(full_name,email), seller_quote_items(*)").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function quoteById(id: string): Promise<SellerQuote> {
  const { data, error } = await db.from("seller_quotes").select("*, client:profiles!seller_quotes_client_id_fkey(full_name,email), seller:profiles!seller_quotes_seller_id_fkey(full_name), seller_quote_items(*)").eq("id", id).single();
  if (error) throw error;
  return data;
}
export async function unreadQuotes(): Promise<SellerQuote[]> {
  const { data, error } = await db.from("seller_quotes").select("*, seller:profiles!seller_quotes_seller_id_fkey(full_name), seller_quote_items(*)").eq("status", "sent").is("viewed_at", null).gt("valid_until", new Date().toISOString()).order("sent_at");
  if (error) throw error;
  return data ?? [];
}

export const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
