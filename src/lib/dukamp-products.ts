type ManufacturingProduct = { name?: string | null; brand?: string | null };

// Legacy catalog entries do not consistently have a brand. ADEKAMP is the
// DuKamp additive line; a feed category alone never proves the manufacturer.
export const DUKAMP_MANUFACTURED_FILTER =
  "name.ilike.%DUKAMP%,name.ilike.%ADEKAMP%,brand.ilike.%DUKAMP%";

export function isDukampManufacturedProduct(product: ManufacturingProduct): boolean {
  const normalize = (value?: string | null) =>
    (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const name = normalize(product.name);
  return /\bDUKAMP\b/.test(normalize(product.brand)) ||
    /\bDUKAMP\b/.test(name) || /^ADITIVO\s+ADEKAMP\b/.test(name);
}

export function assertDukampPartnerProduct(product: ManufacturingProduct): void {
  if (!isDukampManufacturedProduct(product)) {
    throw new Error("O catálogo de parceiros permite somente produtos fabricados pela Dukamp.");
  }
}
