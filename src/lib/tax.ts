export type SupportedTaxCode = "000" | "040";

export const CONSUMER_MARKUP = 0.22;
export const DUKAMP_ORIGIN_UF = "SP" as const;

// Matriz ICMS 2026 enviada pela Dukamp, considerando origem em SP.
// 040 = isento, portanto a alíquota de destino não é aplicada.
export const SP_ICMS_2026: Record<string, number> = {
  AC: 0.07,
  AL: 0.07,
  AM: 0.07,
  AP: 0.07,
  BA: 0.07,
  CE: 0.07,
  DF: 0.07,
  ES: 0.07,
  GO: 0.07,
  MA: 0.07,
  MG: 0.12,
  MS: 0.07,
  MT: 0.07,
  PA: 0.07,
  PB: 0.07,
  PE: 0.07,
  PI: 0.07,
  PR: 0.12,
  RJ: 0.12,
  RN: 0.07,
  RO: 0.07,
  RR: 0.07,
  RS: 0.12,
  SC: 0.12,
  SE: 0.07,
  SP: 0.18,
  TO: 0.07,
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function consumerPriceFromProducer(producerPrice: number): number {
  return roundMoney(Number(producerPrice) * (1 + CONSUMER_MARKUP));
}

export function normalizeTaxCode(value: unknown): string {
  return String(value ?? "").trim().padStart(3, "0");
}

export function isSupportedTaxCode(value: unknown): value is SupportedTaxCode {
  const code = normalizeTaxCode(value);
  return code === "000" || code === "040";
}

export function icmsRateFor(taxCode: unknown, destinationUf: string): number {
  const code = normalizeTaxCode(taxCode);
  if (code === "040") return 0;
  if (code !== "000") {
    throw new Error(`Código tributário ${code || "não informado"} ainda não é suportado no cálculo automático.`);
  }

  const uf = String(destinationUf || "").trim().toUpperCase();
  const rate = SP_ICMS_2026[uf];
  if (rate == null) throw new Error(`UF de destino inválida para ICMS: ${uf || "não informada"}.`);
  return rate;
}

export function calculateItemIcms(baseAmount: number, taxCode: unknown, destinationUf: string): {
  rate: number;
  amount: number;
} {
  const rate = icmsRateFor(taxCode, destinationUf);
  return { rate, amount: roundMoney(Number(baseAmount) * rate) };
}
