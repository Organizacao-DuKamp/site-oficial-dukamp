import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_COLS = "id,name,slug,code,price,consumer_price,reseller_price,producer_price,pix_price,consumer_pix_price,reseller_pix_price,producer_pix_price,on_sale,sale_consumer_price,sale_producer_price,sale_consumer_pix_price,sale_producer_pix_price,images,brand,stock,installments,catalog_id,featured,created_at,category_position,catalogs(name,slug)";
export async function activeCatalogs() {
  const { data, error } = await supabase.from("catalogs").select("*").eq("active", true).order("sort_order").order("name");
  if (error) throw error;
  return data || [];
}
export async function categoryProducts(catalogId: string) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("products").select("*,catalogs(name,slug)").eq("active", true).gt("stock", 0).eq("catalog_id", catalogId).order("category_position", { nullsFirst: false }).order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}
export async function listedProducts({ q, catId, page = 1 }: { q?: string; catId?: string; page?: number }) {
  let query = supabase.from("products").select("*,catalogs(name,slug)", { count: "exact" }).eq("active", true).gt("stock", 0);
  if (catId) query = query.eq("catalog_id", catId);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, count, error } = await query.order("category_position", { nullsFirst: false }).order("created_at", { ascending: false }).order("id").range((page - 1) * 24, page * 24 - 1);
  if (error) throw error;
  return { rows: data || [], count: count || 0 };
}
