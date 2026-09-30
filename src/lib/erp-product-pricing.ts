export type MarginBand = {
  numero: number;
  margem_configurada?: string;
  margem_bruta?: string;
  comissao_interna?: string;
};

export type PriceChannel = { preco?: string; comissao_percentual?: string };
export type PriceRow = {
  prazo_dias?: number;
  tabela?: PriceChannel;
  produtor?: PriceChannel;
  revenda?: PriceChannel;
  tabela_endereco?: PriceChannel;
  preco_5?: PriceChannel;
  preco_web?: PriceChannel;
  [key: string]: unknown;
};
export type PricingData = Record<string, string> & {
  faixas?: PriceRow[];
  percentual_margens?: MarginBand[];
};

export const marginLabels = ["Tabela", "Produtor", "Revenda", "Tabela endereço", "Modalidade 5", "Modalidade 6"] as const;
const channels = ["tabela", "produtor", "revenda", "tabela_endereco"] as const;
const costFields = new Set(["custo_real", "frete", "carga_descarga", "percentual_ajuste"]);

export function numberFrom(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = value.trim().replace(/\s/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  const normalized = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

const format = (value: number, digits = 2) => value.toFixed(digits);
const factor = (monthly: number, days: number) => 1 - monthly * days / 3000;
const channelBase = (rows: PriceRow[], channel: typeof channels[number], monthly: number) => {
  for (const row of [...rows].sort((a, b) => Number(a.prazo_dias ?? 0) - Number(b.prazo_dias ?? 0))) {
    const price = numberFrom(row[channel]?.preco);
    const term = factor(monthly, Number(row.prazo_dias ?? 0));
    if (price !== null && price > 0 && term > 0) return price * term;
  }
  return null;
};

export function calculatedCost(values: PricingData): number | null {
  const real = numberFrom(values.custo_real);
  const freight = numberFrom(values.frete);
  const handling = numberFrom(values.carga_descarga);
  const adjustment = numberFrom(values.percentual_ajuste);
  if ([real, freight, handling, adjustment].some((item) => item === null)) return null;
  return (real! + freight! + handling!) * (1 + adjustment! / 100);
}

function sourceCost(values: PricingData): number | null {
  const stored = numberFrom(values.custo_ajustado);
  return stored !== null && stored > 0 ? stored : calculatedCost(values);
}

export function pricingError(values: PricingData): string | null {
  const cost = calculatedCost(values);
  const monthly = numberFrom(values.financiamento_mensal);
  if (cost === null || cost < 0 || monthly === null) return "Informe custos e financiamento válidos.";
  for (const band of (values.percentual_margens ?? []).slice(0, 4)) {
    const margin = numberFrom(band.margem_configurada);
    const commission = numberFrom(band.comissao_interna);
    if (margin === null || commission === null || margin >= 100 || commission >= 100 || margin < 0 || commission < 0) {
      return "Margem e comissão devem estar entre 0% e 100%.";
    }
  }
  if ((values.faixas ?? []).some((row) => factor(monthly, Number(row.prazo_dias ?? 0)) <= 0)) {
    return "O financiamento é alto demais para um dos prazos.";
  }
  return null;
}

function recalculate(previous: PricingData, next: PricingData): PricingData {
  if (pricingError(next)) return next;
  const oldCost = sourceCost(previous);
  const newCost = next.custo_ajustado !== previous.custo_ajustado ? numberFrom(next.custo_ajustado) : sourceCost(previous);
  const oldMonthly = numberFrom(previous.financiamento_mensal);
  const newMonthly = numberFrom(next.financiamento_mensal);
  if (oldCost === null || newCost === null || oldMonthly === null || newMonthly === null) return next;
  const costChanged = Math.abs(oldCost - newCost) > 0.000001;
  const financingChanged = oldMonthly !== newMonthly;
  const oldBands = previous.percentual_margens ?? [];
  const newBands = (next.percentual_margens ?? []).map((band) => ({ ...band }));
  const originalRows = previous.faixas ?? [];
  const rows: PriceRow[] = originalRows.length ? originalRows : [0, 28, 56].map((prazo_dias) => ({ prazo_dias }));
  const newRows: PriceRow[] = rows.map((row) => ({ ...row }));

  for (let index = 0; index < 4; index++) {
    const channel = channels[index];
    const oldMargin = numberFrom(oldBands[index]?.margem_configurada) ?? 0;
    const newMargin = numberFrom(newBands[index]?.margem_configurada) ?? 0;
    const oldCommission = numberFrom(oldBands[index]?.comissao_interna) ?? 0;
    const newCommission = numberFrom(newBands[index]?.comissao_interna) ?? 0;
    const rateChanged = oldMargin !== newMargin || oldCommission !== newCommission;
    if (!costChanged && !financingChanged && !rateChanged) continue;
    const oldDenominator = (1 - oldMargin / 100) * (1 - oldCommission / 100);
    const newDenominator = (1 - newMargin / 100) * (1 - newCommission / 100);
    const oldBase = channelBase(originalRows, channel, oldMonthly);
    if (!newBands[index] && oldBase === null) continue;
    const newBase = oldBase !== null && oldCost > 0
      ? oldBase * newCost / oldCost * oldDenominator / newDenominator
      : newCost / newDenominator;

    for (const row of newRows) {
      const days = Number(row.prazo_dias ?? 0);
      const previousChannel = row[channel];
      const previousRowCommission = numberFrom(previousChannel?.comissao_percentual) ?? oldCommission;
      const rowCommission = oldCommission > 0
        ? previousRowCommission * newCommission / oldCommission
        : newCommission;
      row[channel] = {
        ...previousChannel,
        preco: format(newBase / factor(newMonthly, days)),
        comissao_percentual: format(rowCommission),
      };
    }
    if (newCost > 0 && newBands[index]) {
      const zeroDay = newRows.find((row) => Number(row.prazo_dias ?? 0) === 0);
      const price = numberFrom(zeroDay?.[channel]?.preco) ?? newBase;
      newBands[index] = { ...newBands[index], margem_bruta: format((price / newCost - 1) * 100) };
    }
  }
  next.faixas = newRows;
  next.percentual_margens = newBands;
  return next;
}

export function updatePricingField(previous: PricingData, key: string, value: string): PricingData {
  const next = { ...previous, [key]: value };
  if (!costFields.has(key) && key !== "financiamento_mensal") return next;
  if (value.trim() === "" || numberFrom(value) === null) return next;
  if (costFields.has(key)) {
    const cost = calculatedCost(next);
    if (cost === null || cost < 0) return next;
    const real = numberFrom(next.custo_real) ?? 0;
    const freight = numberFrom(next.frete) ?? 0;
    const handling = numberFrom(next.carga_descarga) ?? 0;
    next.custo_final = format(real + freight + handling, 3);
    next.custo_ajustado = format(cost, 2);
  }
  return recalculate(previous, next);
}

export function updateMarginBand(previous: PricingData, index: number, key: "margem_configurada" | "comissao_interna", value: string): PricingData {
  const previousBands = previous.percentual_margens ?? [];
  const bands = previousBands.map((band) => ({ ...band }));
  if (!bands[index]) return previous;
  bands[index][key] = value;
  if (value.trim() === "" || numberFrom(value) === null) return { ...previous, percentual_margens: bands };
  if (key === "margem_configurada") {
    const oldMargin = numberFrom(previousBands[index].margem_configurada) ?? 0;
    const newMargin = numberFrom(value) ?? 0;
    const oldCommission = numberFrom(previousBands[index].comissao_interna) ?? 0;
    if (oldMargin > 0) bands[index].comissao_interna = format(oldCommission * newMargin / oldMargin);
    if (index === 0 && oldMargin > 0) {
      for (let i = 1; i < Math.min(4, bands.length); i++) {
        const margin = numberFrom(previousBands[i].margem_configurada) ?? 0;
        const commission = numberFrom(previousBands[i].comissao_interna) ?? 0;
        bands[i].margem_configurada = format(margin * newMargin / oldMargin);
        bands[i].comissao_interna = format(commission * newMargin / oldMargin);
      }
    }
  }
  return recalculate(previous, { ...previous, percentual_margens: bands });
}
