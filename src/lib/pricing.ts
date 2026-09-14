import { CONSUMER_MARKUP, roundMoney } from "./tax";

export type PricingProduct = {
  price?: number | null;
  producer_price?: number | null;
  consumer_price?: number | null;
  pix_price?: number | null;
  producer_pix_price?: number | null;
  consumer_pix_price?: number | null;
  on_sale?: boolean | null;
  sale_producer_price?: number | null;
  sale_consumer_price?: number | null;
  sale_producer_pix_price?: number | null;
  sale_consumer_pix_price?: number | null;
  catalogs?: { name?: string | null; slug?: string | null } | null;
};

const EXEMPT_CATEGORIES = new Set([
  "pets", "utensilios-gerais", "lonas-e-coberturas", "arames-e-ferragens", "arames", "ferragens",
]);
function categoryKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/&/g, "e").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function consumerTaxRate(product: PricingProduct, accountType = "cliente"): number {
  if (accountType === "produtor") return 0;
  const category = product.catalogs;
  if ([category?.name, category?.slug].some(value =>
    value != null && EXEMPT_CATEGORIES.has(categoryKey(value)))) return 0;
  return CONSUMER_MARKUP;
}
function taxed(base: number, product: PricingProduct, type: string): number {
  return roundMoney(base * (1 + consumerTaxRate(product, type)));
}
export function regularPriceForAccount(product: PricingProduct, type = "cliente"): number {
  const base = Number(product.producer_price ?? 0);
  if (Number.isFinite(base) && base > 0) return taxed(base, product, type);
  // Legacy products without a producer base retain their explicitly stored price.
  return Number(product.consumer_price ?? product.price ?? 0);
}
export function priceForAccount(product: PricingProduct, type = "cliente"): number {
  if (product.on_sale && product.sale_producer_price != null) {
    return taxed(Number(product.sale_producer_price), product, type);
  }
  return regularPriceForAccount(product, type);
}
export function isOnSaleForAccount(product: PricingProduct, type = "cliente"): boolean {
  return Boolean(product.on_sale && product.sale_producer_price != null &&
    priceForAccount(product, type) < regularPriceForAccount(product, type));
}
export function pixPriceForAccount(product: PricingProduct, type = "cliente"): number | null {
  const base = product.on_sale && product.sale_producer_pix_price != null
    ? product.sale_producer_pix_price : product.producer_pix_price;
  return base != null ? taxed(Number(base), product, type) : null;
}
