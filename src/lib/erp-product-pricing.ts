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
// The DBF program keeps two decimal places by truncation, including prices and gross margins.
const truncate = (value: number, digits = 2) => Math.trunc(value * 10 ** digits + Number.EPSILON * 100) / 10 ** digits;
const dbfFormat = (value: number, digits = 2) => truncate(value, digits).toFixed(digits);
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
  const cost = sourceCost(next);
  const monthly = numberFrom(next.financiamento_mensal);
  if (cost === null || cost <= 0 || monthly === null) return next;

  const bands = (next.percentual_margens ?? []).map((band) => ({ ...band }));
  const oldBands = previous.percentual_margens ?? [];
  const oldFirst = numberFrom(oldBands[0]?.margem_configurada) ?? 0;
  const first = numberFrom(bands[0]?.margem_configurada) ?? 0;
  const firstChanged = first !== oldFirst;
  const firstCommission = numberFrom(bands[0]?.comissao_interna) ?? 0;

  if (firstChanged) {
    // In COMPRAS, these two discounts track the first margin at 5% and 10%.
    next.desconto_produto = dbfFormat(first * 0.05);
    next.desconto_revenda = dbfFormat(first * 0.10);
    // Preserve the product-specific minimum offset recorded in its DBF row.
    // COMPRAS changes the minimum by the movement in margin after commission.
    const oldMinimum = numberFrom(previous.percentual_minimo) ?? 0;
    const oldCommission = numberFrom(oldBands[0]?.comissao_interna) ?? 0;
    const delta = (first - oldFirst) - (firstCommission - oldCommission);
    next.percentual_minimo = format(oldMinimum + delta + Math.sign(delta) * 0.01);
  }

  const minimum = numberFrom(next.percentual_minimo);
  if (minimum !== null && minimum < 100) {
    next.valor_minimo = dbfFormat(cost / (1 - minimum / 100));
  }

  const sourceRows = previous.faixas?.length ? previous.faixas : [0, 28, 56].map((prazo_dias) => ({ prazo_dias }));
  next.faixas = sourceRows.map((sourceRow) => {
    const days = Number(sourceRow.prazo_dias ?? 0);
    const term = factor(monthly, days);
    const row: PriceRow = { ...sourceRow, preco_minimo: next.valor_minimo };
    if (sourceRow.calculo && typeof sourceRow.calculo === "object") {
      row.calculo = { ...sourceRow.calculo as Record<string, unknown>, percentual_minimo: next.percentual_minimo };
    }
    channels.forEach((channel, index) => {
      const band = bands[index];
      if (!band) return;
      const margin = numberFrom(band.margem_configurada) ?? 0;
      const commission = numberFrom(band.comissao_interna) ?? 0;
      const divisor = (1 - margin / 100) * (1 - commission / 100) * term;
      if (divisor <= 0) return;
      const price = truncate(cost / divisor);
      // Term commissions in the original are lower than the zero-day rate.
      // The DBF keeps only the zero-day rate; the displayed term rate is
      // reconstructed from its monthly financing factor.
      const termReduction = 0.0188 + 0.00433 * monthly;
      const termCommission = days === 0 ? commission : commission * (1 - termReduction) ** (days / 28);
      row[channel] = {
        ...sourceRow[channel],
        preco: dbfFormat(price),
        comissao_percentual: format(termCommission),
      };
      if (days === 0) {
        band.margem_bruta = dbfFormat((price / cost - 1) * 100);
      }
    });
    return row;
  });
  next.percentual_margens = bands;
  next.margem = bands[0]?.margem_bruta ?? next.margem;
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
