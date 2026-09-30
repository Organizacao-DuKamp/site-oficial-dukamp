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

const format = (value: number, digits = 2) => (Math.round(value * 10 ** digits + 1e-8) / 10 ** digits).toFixed(digits);
// The DBF program keeps two decimal places by truncation, including prices and gross margins.
const truncate = (value: number, digits = 2) => Math.trunc(value * 10 ** digits + 1e-8) / 10 ** digits;
const dbfFormat = (value: number, digits = 2) => truncate(value, digits).toFixed(digits);
const factor = (monthly: number, days: number) => 1 - monthly * days / 3000;

// Calibrated against the COMPRAS screens at 32%, 34% and 38%, including all four channels.
const minimumDiscountPerMarginPoint = 0.1704;
const commissionTermExponent = 2.3975;
function predictedMinimum(margin4: number, commission4: number, referenceMargin: number): number {
  const discount = 1 - minimumDiscountPerMarginPoint * referenceMargin / 100;
  return Number((100 * (1 - (1 - margin4 / 100) * (1 - commission4 / 100) / discount)).toFixed(2));
}


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

  if (firstChanged) {
    // In COMPRAS, these two discounts track the first margin at 5% and 10%.
    next.desconto_produto = dbfFormat(first * 0.05);
    next.desconto_revenda = dbfFormat(first * 0.10);

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
      row.calculo = { ...(sourceRow.calculo as Record<string, unknown>), percentual_minimo: next.percentual_minimo };
    }
    channels.forEach((channel, index) => {
      const band = bands[index];
      if (!band) return;
      const margin = numberFrom(band.margem_configurada) ?? 0;
      const commission = numberFrom(band.comissao_interna) ?? 0;
      const divisor = (1 - margin / 100) * (1 - commission / 100) * term;
      if (divisor <= 0) return;
      const price = truncate(cost / divisor);
      const saleTerm = numberFrom(next.prazo_venda) || Math.max(...sourceRows.map((item) => Number(item.prazo_dias ?? 0)));
      const termCommission = saleTerm > 0
        ? format(commission * (1 - monthly / 100) ** (commissionTermExponent * days / saleTerm))
        : format(commission);
      row[channel] = {
        ...sourceRow[channel],
        preco: dbfFormat(price),
        comissao_percentual: termCommission,
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

export function updateMarginBand(previous: PricingData, index: number, key: "margem_configurada" | "comissao_interna", value: string, reference: PricingData = previous): PricingData {
  const previousBands = previous.percentual_margens ?? [];
  const referenceBands = reference.percentual_margens ?? [];
  const bands = previousBands.map((band) => ({ ...band }));
  if (!bands[index]) return previous;
  bands[index][key] = value;
  if (value.trim() === "" || numberFrom(value) === null) return { ...previous, percentual_margens: bands };
  if (key === "margem_configurada") {
    const oldMargin = numberFrom(referenceBands[index]?.margem_configurada) ?? 0;
    const newMargin = numberFrom(value) ?? 0;
    const oldCommission = numberFrom(referenceBands[index]?.comissao_interna) ?? 0;
    if (oldMargin > 0) bands[index].comissao_interna = format(oldCommission * newMargin / oldMargin);
    if (index === 0 && oldMargin > 0) {
      for (let i = 1; i < Math.min(4, bands.length); i++) {
        const margin = numberFrom(referenceBands[i]?.margem_configurada) ?? 0;
        const commission = numberFrom(referenceBands[i]?.comissao_interna) ?? 0;
        bands[i].margem_configurada = format(margin * newMargin / oldMargin);
        bands[i].comissao_interna = format(commission * newMargin / oldMargin);
      }
    }
  }
  const next = { ...previous, percentual_margens: bands };
  const referenceMargin = numberFrom(referenceBands[0]?.margem_configurada) ?? 0;
  const referenceFourth = referenceBands[3];
  const fourth = bands[3];
  if (referenceFourth && fourth && referenceMargin > 0) {
    const oldMinimum = numberFrom(reference.percentual_minimo);
    const oldMargin4 = numberFrom(referenceFourth.margem_configurada);
    const oldCommission4 = numberFrom(referenceFourth.comissao_interna);
    const margin4 = numberFrom(fourth.margem_configurada);
    const commission4 = numberFrom(fourth.comissao_interna);
    if ([oldMinimum, oldMargin4, oldCommission4, margin4, commission4].every((item) => item !== null)) {
      const baseline = predictedMinimum(oldMargin4!, oldCommission4!, referenceMargin);
      const changed = predictedMinimum(margin4!, commission4!, referenceMargin);
      next.percentual_minimo = format(oldMinimum! + changed - baseline);
    }
  }
  return recalculate(previous, next);
}
