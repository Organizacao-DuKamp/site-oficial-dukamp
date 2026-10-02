export type WebSale = {
  order_id: string; customer_id: string; user_id: string | null; seller_id: string | null;
  seller_name: string | null; seller_code: string | null; amount: number | string;
  payment_total: number | string; cost_amount: number | string | null; weight_kg: number | string;
  paid_at: string; active: boolean;
};
export function normalizeWebSellerCode(value: unknown) { return String(value ?? "").trim().replace(/^0+(?=\d)/, ""); }
export function webSaleBelongsToSeller(sale: WebSale, id: string, code: string | null) {
  return sale.seller_id === id || Boolean(code && normalizeWebSellerCode(sale.seller_code) === normalizeWebSellerCode(code));
}
export function webSaleDate(sale: WebSale) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(sale.paid_at));
}
export function webSalesInRange(sales: WebSale[], from: string, to: string) { return sales.filter(sale => sale.active && webSaleDate(sale) >= from && webSaleDate(sale) <= to); }
export function webSalesTotals(sales: WebSale[]) {
  const active = sales.filter(sale => sale.active);
  const known = active.filter(sale => sale.cost_amount !== null);
  return {
    total_venda: active.reduce((sum, sale) => sum + Number(sale.amount), 0),
    total_custo: known.reduce((sum, sale) => sum + Number(sale.cost_amount), 0),
    margem_bruta: known.reduce((sum, sale) => sum + Number(sale.amount) - Number(sale.cost_amount), 0),
    tonelagem: active.reduce((sum, sale) => sum + Number(sale.weight_kg) / 1000, 0),
    count: active.length, unknownCostCount: active.length - known.length,
  };
}
// Called only after admin/seller authorization in the owning route.
export async function loadWebSales(db: any, sellerId?: string | null, sellerCode?: string | null): Promise<WebSale[]> {
  const rows: WebSale[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = db.from("web_order_sales").select("*").order("paid_at", { ascending: false }).range(offset, offset + 999);
    if (sellerId) {
      const code = normalizeWebSellerCode(sellerCode);
      const variants = [...new Set([sellerCode, code, code.padStart(3, "0")].filter(Boolean))];
      query = code ? query.or(`seller_id.eq.${sellerId},seller_code.in.(${variants.join(",")})`) : query.eq("seller_id", sellerId);
    }
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return sellerId ? rows.filter(sale => webSaleBelongsToSeller(sale, sellerId, sellerCode ?? null)) : rows;
}

export function customerPortfolioFilter(sellerId: string, sellerCode: string | null) {
  const code = normalizeWebSellerCode(sellerCode);
  const variants = [...new Set([sellerCode, code, code.padStart(3, "0")].filter(Boolean))];
  return code ? `seller_record_id.eq.${sellerId},and(vendedor_codigo.in.(${variants.join(",")}),or(abc_na_carteira_atual.eq.true,web_registered.eq.true))` : `seller_record_id.eq.${sellerId}`;
}
