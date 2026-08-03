import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/cart";

type AcceptedQuoteItem = {
  id: string;
  name: string;
  price: number | string;
  image?: string | null;
  quantity: number;
};

type AcceptQuoteResult = {
  quote_id: string;
  status: "accepted";
  already_accepted: boolean;
  items: AcceptedQuoteItem[];
};

/**
 * Calls the database transaction that validates and accepts a sales quote.
 * Prices returned here are for display only; checkout recalculates them server-side.
 */
export async function acceptSalesQuote(quoteId: string): Promise<{ items: CartItem[]; alreadyAccepted: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Entre na sua conta para aceitar este orçamento.");

  const { data, error } = await (supabase as any).rpc("accept_sales_quote", { _quote_id: quoteId });
  if (error) throw new Error(error.message || "Não foi possível aceitar o orçamento.");

  const result = data as AcceptQuoteResult | null;
  if (!result || !Array.isArray(result.items)) {
    throw new Error("O servidor retornou um orçamento inválido. Tente novamente.");
  }

  return {
    alreadyAccepted: result.already_accepted,
    items: result.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image: item.image ?? undefined,
      quantity: item.quantity,
    })),
  };
}
