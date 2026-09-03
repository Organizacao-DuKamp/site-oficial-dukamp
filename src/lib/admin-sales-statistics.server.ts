type MarginRow = {
  id: string;
  seller_user_id: string | null;
  report_year: number;
  report_month: number;
  period_start: string;
  period_end: string;
  report_seller_code: string;
  report_seller_name: string;
  total_venda: number | string;
  devolucao: number | string;
  aditivos: number | string;
  sacarias: number | string;
  balcao: number | string;
  total_custo: number | string;
  margem_percentual: number | string;
  comissao_representante: number | string;
  tonelagem: number | string;
  margem_bruta: number | string;
  margem_aditivos: number | string;
  margem_aditivos_percentual: number | string;
  margem_sacarias: number | string;
  margem_sacarias_percentual: number | string;
  margem_balcao: number | string;
  margem_balcao_percentual: number | string;
  source_file: string;
  updated_at: string;
};

type CustomerRow = {
  id: string;
  codigo: string;
  cliente: string;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  ultima_compra: string | null;
  compra_ano: number | string | null;
  compra_ano_anterior: number | string | null;
  abc_na_carteira_atual: boolean;
  vendedor_codigo: string | null;
  vendedor_nome: string | null;
};

type SaleRequestRow = {
  id: string;
  seller_user_id: string;
  seller_record_id: string | null;
  seller_code: string;
  seller_name: string;
  customer_code: string;
  customer_name: string;
  sale_notes: string;
  sale_value: number | string;
  status: string;
  created_at: string;
};

type Totals = {
  total_venda: number;
  devolucao: number;
  aditivos: number;
  sacarias: number;
  balcao: number;
  total_custo: number;
  comissao_representante: number;
  tonelagem: number;
  margem_bruta: number;
  margem_aditivos: number;
  margem_sacarias: number;
  margem_balcao: number;
};

const TOTAL_KEYS: Array<keyof Totals> = [
  "total_venda", "devolucao", "aditivos", "sacarias", "balcao", "total_custo",
  "comissao_representante", "tonelagem", "margem_bruta", "margem_aditivos",
  "margem_sacarias", "margem_balcao",
];

function normalizeCode(value: unknown) {
  const code = String(value ?? "").trim();
  return code.replace(/^0+(?=\d)/, "") || (code ? "0" : "");
}

function codeVariants(value: string) {
  const raw = value.trim();
  const normalized = normalizeCode(raw);
  return [...new Set([raw, normalized, normalized.padStart(3, "0")].filter(Boolean))];
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyTotals(): Totals {
  return {
    total_venda: 0, devolucao: 0, aditivos: 0, sacarias: 0, balcao: 0,
    total_custo: 0, comissao_representante: 0, tonelagem: 0, margem_bruta: 0,
    margem_aditivos: 0, margem_sacarias: 0, margem_balcao: 0,
  };
}

function rowTotals(row: MarginRow): Totals {
  const result = emptyTotals();
  for (const key of TOTAL_KEYS) result[key] = n(row[key]);
  return result;
}

function add(target: Totals, source: Totals) {
  for (const key of TOTAL_KEYS) target[key] += source[key];
}

function subtract(current: Totals, previous: Totals) {
  const result = emptyTotals();
  for (const key of TOTAL_KEYS) result[key] = current[key] - previous[key];
  return result;
}

function withMargin(totals: Totals) {
  return { ...totals, margem_percentual: totals.total_venda ? (totals.margem_bruta / totals.total_venda) * 100 : 0 };
}

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function parseDate(value: string) { return new Date(`${value}T12:00:00Z`); }
function shiftDays(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}
function daysInclusive(from: string, to: string) {
  return Math.max(1, Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000) + 1);
}
function validIso(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseDate(value);
  return Number.isFinite(date.getTime()) && isoDate(date) === value ? value : null;
}
function monthBounds(year: number, month: number) {
  return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: isoDate(new Date(Date.UTC(year, month, 0, 12))) };
}

function previousPeriod(from: string, to: string, preset: string | null) {
  if (preset === "day") return { from: shiftDays(from, -1), to: shiftDays(to, -1) };
  if (preset === "year") {
    const year = Number(from.slice(0, 4)) - 1;
    return { from: `${year}-01-01`, to: `${year}-${to.slice(5)}` };
  }
  if (preset === "month") {
    const source = parseDate(from);
    source.setUTCMonth(source.getUTCMonth() - 1);
    const previousFrom = `${source.getUTCFullYear()}-${String(source.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const elapsedDays = daysInclusive(from, to);
    const previousMonthEnd = monthBounds(source.getUTCFullYear(), source.getUTCMonth() + 1).to;
    const sameElapsed = shiftDays(previousFrom, elapsedDays - 1);
    return { from: previousFrom, to: sameElapsed < previousMonthEnd ? sameElapsed : previousMonthEnd };
  }
  const length = daysInclusive(from, to);
  const previousTo = shiftDays(from, -1);
  return { from: shiftDays(previousTo, -(length - 1)), to: previousTo };
}

function aggregateRange(rows: MarginRow[], from: string, to: string) {
  const groups = new Map<string, MarginRow[]>();
  for (const row of rows) {
    const key = `${normalizeCode(row.report_seller_code)}:${row.report_year}-${String(row.report_month).padStart(2, "0")}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const totals = emptyTotals();
  let hasData = false;
  let partialWithoutBaseline = false;
  for (const group of groups.values()) {
    group.sort((a, b) => a.period_end.localeCompare(b.period_end));
    const sample = group[0];
    const bounds = monthBounds(sample.report_year, sample.report_month);
    if (bounds.to < from || bounds.from > to) continue;
    const effectiveFrom = from > bounds.from ? from : bounds.from;
    const effectiveTo = to < bounds.to ? to : bounds.to;
    const ending = [...group].reverse().find((row) => row.period_end <= effectiveTo);
    if (!ending) continue;
    let contribution = rowTotals(ending);
    if (effectiveFrom > ending.period_start) {
      const baseline = [...group].reverse().find((row) => row.period_end < effectiveFrom && row.period_start === ending.period_start);
      if (baseline) contribution = subtract(contribution, rowTotals(baseline));
      else partialWithoutBaseline = true;
    }
    add(totals, contribution);
    hasData = true;
  }
  return { totals: withMargin(totals), hasData, partialWithoutBaseline };
}

function pct(current: number, previous: number): number | null {
  if (Math.abs(previous) < 0.000001) return Math.abs(current) < 0.000001 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
function comparisons(current: ReturnType<typeof withMargin>, previous: ReturnType<typeof withMargin>) {
  const result: Record<string, number | null> = {};
  for (const key of [...TOTAL_KEYS, "margem_percentual"] as const) result[key] = pct(current[key], previous[key]);
  return result;
}
function latestReport(rows: MarginRow[], from: string, to: string) {
  return rows.filter((row) => row.period_end >= from && row.period_start <= to)
    .sort((a, b) => b.period_end.localeCompare(a.period_end) || b.updated_at.localeCompare(a.updated_at))[0] ?? null;
}
function blueDeadline(lastPurchase: string) {
  const date = parseDate(lastPurchase.slice(0, 10));
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + 6);
  return isoDate(date);
}
function nearBlue(customers: CustomerRow[], asOf: string) {
  const horizon = shiftDays(asOf, 30);
  return customers.map((customer) => {
    if (!customer.ultima_compra) return null;
    const entersBlueAt = blueDeadline(customer.ultima_compra);
    if (!entersBlueAt || entersBlueAt <= asOf || entersBlueAt > horizon) return null;
    return { id: customer.id, codigo: customer.codigo, cliente: customer.cliente, cidade: customer.cidade, uf: customer.uf, ultima_compra: customer.ultima_compra, entersBlueAt, daysRemaining: daysInclusive(asOf, entersBlueAt) - 1 };
  }).filter(Boolean).sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
}

async function loadCustomers(supabaseAdmin: any, sellerCode: string | null): Promise<CustomerRow[]> {
  const rows: CustomerRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = supabaseAdmin.from("customers")
      .select("id,codigo,cliente,cidade,uf,telefone,celular,email,ultima_compra,compra_ano,compra_ano_anterior,abc_na_carteira_atual,vendedor_codigo,vendedor_nome")
      .eq("abc_na_carteira_atual", true);
    if (sellerCode) query = query.in("vendedor_codigo", codeVariants(sellerCode));
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as CustomerRow[]));
    if ((data ?? []).length < pageSize) break;
  }
  return sellerCode ? rows.filter((row) => normalizeCode(row.vendedor_codigo) === normalizeCode(sellerCode)) : rows;
}

async function loadSales(supabaseAdmin: any, sellerCode: string | null): Promise<SaleRequestRow[]> {
  const rows: SaleRequestRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = supabaseAdmin.from("seller_sale_requests")
      .select("id,seller_user_id,seller_record_id,seller_code,seller_name,customer_code,customer_name,sale_notes,sale_value,status,created_at");
    if (sellerCode) query = query.in("seller_code", codeVariants(sellerCode));
    const { data, error } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as SaleRequestRow[]));
    if ((data ?? []).length < pageSize) break;
  }
  return sellerCode ? rows.filter((row) => normalizeCode(row.seller_code) === normalizeCode(sellerCode)) : rows;
}
function quoteTotal(quote: any) {
  return (quote.items ?? []).reduce((sum: number, item: any) => sum + n(item.unit_price_snapshot) * n(item.quantity), 0);
}

export async function buildAdminSalesStatistics(supabaseAdmin: any, request: Request) {
  const url = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = validIso(url.searchParams.get("from")) ?? `${today.slice(0, 7)}-01`;
  const to = validIso(url.searchParams.get("to")) ?? today;
  const preset = url.searchParams.get("preset");
  if (to < from) throw new Error("A data final não pode ser anterior à inicial.");

  const sellerId = url.searchParams.get("sellerId")?.trim() || null;
  let seller: { id: string; name: string; erp_seller_code: string | null } | null = null;
  let sellerCode: string | null = null;
  if (sellerId) {
    const result = await supabaseAdmin.from("sellers").select("id,name,erp_seller_code").eq("id", sellerId).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new Error("Vendedor não encontrado.");
    seller = result.data;
    sellerCode = result.data.erp_seller_code?.trim() || null;
    if (!sellerCode) return { sellerCodeMissing: true, seller: { id: seller.id, name: seller.name, code: null }, period: { from, to } };
  }

  const [{ data: reportData, error: reportError }, customers, saleRequests] = await Promise.all([
    supabaseAdmin.from("seller_margin_report_snapshots").select("*").order("period_end", { ascending: true }).limit(20000),
    loadCustomers(supabaseAdmin, sellerCode), loadSales(supabaseAdmin, sellerCode),
  ]);
  if (reportError) throw reportError;
  let reports = (reportData ?? []) as MarginRow[];
  if (sellerCode) reports = reports.filter((row) => normalizeCode(row.report_seller_code) === normalizeCode(sellerCode));

  const previous = previousPeriod(from, to, preset);
  const currentMargin = aggregateRange(reports, from, to);
  const previousMargin = aggregateRange(reports, previous.from, previous.to);
  const inRange = (value: string, start: string, end: string) => value.slice(0, 10) >= start && value.slice(0, 10) <= end;
  const currentSales = saleRequests.filter((row) => inRange(row.created_at, from, to));
  const previousSales = saleRequests.filter((row) => inRange(row.created_at, previous.from, previous.to));

  const { listQuotes } = await import("@/lib/seller-quotes.server");
  let quotes = await listQuotes(supabaseAdmin);
  if (sellerCode) {
    const userIds = new Set<string>();
    reports.forEach((row) => { if (row.seller_user_id) userIds.add(row.seller_user_id); });
    saleRequests.forEach((row) => { if (row.seller_user_id) userIds.add(row.seller_user_id); });
    quotes = quotes.filter((quote: any) => userIds.has(quote.seller_user_id));
  }
  const currentQuotes = quotes.filter((quote: any) => inRange(quote.created_at, from, to));
  const previousQuotes = quotes.filter((quote: any) => inRange(quote.created_at, previous.from, previous.to));
  const activity = { sale_requests: currentSales.length, sale_value: currentSales.reduce((sum, row) => sum + n(row.sale_value), 0), quotes: currentQuotes.length, quote_value: currentQuotes.reduce((sum: number, quote: any) => sum + quoteTotal(quote), 0) };
  const previousActivity = { sale_requests: previousSales.length, sale_value: previousSales.reduce((sum, row) => sum + n(row.sale_value), 0), quotes: previousQuotes.length, quote_value: previousQuotes.reduce((sum: number, quote: any) => sum + quoteTotal(quote), 0) };

  const year = Number(to.slice(0, 4));
  const annualSeries = Array.from({ length: 12 }, (_, index) => {
    const bounds = monthBounds(year, index + 1);
    const aggregate = aggregateRange(reports, bounds.from, bounds.to);
    return { month: index + 1, label: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, index, 1, 12))), total_venda: aggregate.totals.total_venda, margem_bruta: aggregate.totals.margem_bruta, tonelagem: aggregate.totals.tonelagem, hasData: aggregate.hasData };
  });
  const near = nearBlue(customers, to);
  const topCustomers = customers.map((customer) => ({ id: customer.id, code: customer.codigo, name: customer.cliente, city: customer.cidade, uf: customer.uf, total: n(customer.compra_ano) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")).slice(0, 3);
  const actions = [
    ...currentSales.map((row) => ({ id: `sale:${row.id}`, type: "sale" as const, title: "Registro de venda", description: row.customer_name, customerCode: row.customer_code, value: n(row.sale_value), status: row.status, notes: row.sale_notes, sellerName: row.seller_name, createdAt: row.created_at })),
    ...currentQuotes.map((quote: any) => ({ id: `quote:${quote.id}`, type: "quote" as const, title: "Orçamento", description: quote.client_name_snapshot || quote.client_email_snapshot || "Cliente", customerCode: null, value: quoteTotal(quote), status: quote.status, notes: quote.notes, sellerName: quote.seller_name_snapshot, createdAt: quote.created_at })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500);

  const margin = currentMargin.totals;
  return {
    sellerCodeMissing: false,
    seller: seller ? { id: seller.id, name: seller.name, code: sellerCode } : { id: null, name: "DuKamp", code: null },
    period: { from, to, previousFrom: previous.from, previousTo: previous.to },
    summary: { ...margin, portfolio_count: customers.length, near_blue_count: near.length, sale_requests: activity.sale_requests, sale_value: activity.sale_value, quotes: activity.quotes, quote_value: activity.quote_value },
    comparison: { ...comparisons(margin, previousMargin.totals), sale_requests: pct(activity.sale_requests, previousActivity.sale_requests), sale_value: pct(activity.sale_value, previousActivity.sale_value), quotes: pct(activity.quotes, previousActivity.quotes), quote_value: pct(activity.quote_value, previousActivity.quote_value) },
    dataQuality: { hasMarginData: currentMargin.hasData, partialWithoutBaseline: currentMargin.partialWithoutBaseline },
    annualSeries,
    marginReport: sellerCode ? latestReport(reports, from, to) : null,
    clients: customers.map((customer) => ({ id: customer.id, code: customer.codigo, name: customer.cliente, city: customer.cidade, uf: customer.uf, phone: customer.celular || customer.telefone, email: customer.email, lastPurchase: customer.ultima_compra, annualPurchase: n(customer.compra_ano) })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    nearBlueClients: near.slice(0, 100), topCustomers, actions,
  };
}
