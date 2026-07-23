import { createServerFn } from "@tanstack/react-start";

export type QuoteItem = {
  key: string;
  name: string;
  unit: string;
  price: number | null;
  previousPrice: number | null;
  change: number | null; // absolute
  changePct: number | null; // %
  updatedAt: string | null;
  source: string;
  sourceUrl: string;
  available: boolean;
  region?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function parseBrNumber(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/json" },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ---------- Dólar (melhorcambio.com) ----------
async function fetchDolar(): Promise<Partial<QuoteItem>> {
  const html = await fetchText("https://www.melhorcambio.com/dolar-hoje");
  if (!html) return {};
  const m = html.match(/id=["']comercial["'][^>]*value=["']([\d.,]+)["']/i);
  const price = m ? Number(m[1]) : null;
  if (!Number.isFinite(price as number)) return {};
  return { price: price as number, updatedAt: new Date().toISOString(), available: true };
}

// ---------- Noticias Agricolas ----------
type NaRow = { region: string; price: number };

function findFirstRowAfter(html: string, headerNeedle: string): NaRow | null {
  const i = html.indexOf(headerNeedle);
  if (i < 0) return null;
  const tbodyStart = html.indexOf("<tbody>", i);
  const tbodyEnd = html.indexOf("</tbody>", tbodyStart);
  if (tbodyStart < 0 || tbodyEnd < 0) return null;
  const block = html.slice(tbodyStart, tbodyEnd);
  const rowRe = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\d.,]+)<\/td>/g;
  const rows: NaRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(block))) {
    const price = parseBrNumber(m[2]);
    if (price != null) rows.push({ region: m[1].trim(), price });
  }
  if (!rows.length) return null;
  const sp = rows.find((r) => /s(ão|ao)\s*paulo|^sp\b/i.test(r.region));
  return sp ?? rows[0];
}

async function fetchNoticiasAgricolas() {
  const html = await fetchText("https://www.noticiasagricolas.com.br/cotacoes/boi");
  const now = new Date().toISOString();
  const out: Record<string, Partial<QuoteItem>> = {
    boi_gordo: {},
    vaca_gorda: {},
    novilha: {},
  };
  if (!html) return out;
  const bg = findFirstRowAfter(html, "Boi Gordo - (R$/@ - à vista)");
  if (bg) out.boi_gordo = { price: bg.price, region: bg.region, updatedAt: now, available: true };
  const vg = findFirstRowAfter(html, "Vaca Gorda (R$/@ - à vista)");
  if (vg) out.vaca_gorda = { price: vg.price, region: vg.region, updatedAt: now, available: true };
  const nv = findFirstRowAfter(html, "Indicador da Novilha");
  if (nv) out.novilha = { price: nv.price, region: nv.region, updatedAt: now, available: true };
  return out;
}

// ---------- Scot (Boi China) ----------
async function fetchBoiChina(): Promise<Partial<QuoteItem>> {
  const html = await fetchText("https://www.scotconsultoria.com.br/cotacoes/boi-gordo/");
  if (!html) return {};
  const hdr = html.match(/Boi China a Prazo\s*\(R\$\/@\)\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  const dateStr = hdr?.[1] ?? null;
  const i = html.indexOf("Boi China a Prazo");
  if (i < 0) return {};
  const tbodyStart = html.indexOf("<tbody>", i);
  const tbodyEnd = html.indexOf("</tbody>", tbodyStart);
  if (tbodyStart < 0 || tbodyEnd < 0) return {};
  const block = html.slice(tbodyStart, tbodyEnd);
  const rowRe = /<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*([\d.,]+)\s*<\/td>/g;
  const rows: NaRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(block))) {
    const price = parseBrNumber(m[2]);
    if (price != null) rows.push({ region: m[1].trim(), price });
  }
  if (!rows.length) return {};
  const sp = rows.find((r) => /s(ão|ao)\s*paulo/i.test(r.region)) ?? rows[0];
  let iso: string | null = new Date().toISOString();
  if (dateStr) {
    const [d, mo, y] = dateStr.split("/");
    const dt = new Date(`${y}-${mo}-${d}T12:00:00Z`);
    if (!Number.isNaN(dt.getTime())) iso = dt.toISOString();
  }
  return { price: sp.price, region: sp.region, updatedAt: iso, available: true };
}

// Module-level history for change tracking + micro sparkline
type HistPoint = { price: number; at: string };
const HISTORY: Record<string, HistPoint[]> = {};
const MAX_HIST = 12;

function pushHistory(key: string, price: number, at: string) {
  const arr = (HISTORY[key] ??= []);
  const last = arr[arr.length - 1];
  if (!last || last.price !== price) arr.push({ price, at });
  if (arr.length > MAX_HIST) arr.splice(0, arr.length - MAX_HIST);
}

const BASE: Record<string, Omit<QuoteItem, "price" | "previousPrice" | "change" | "changePct" | "updatedAt" | "available" | "region">> = {
  usd: { key: "usd", name: "Dólar Comercial", unit: "R$/US$", source: "melhorcambio", sourceUrl: "https://www.melhorcambio.com/dolar-hoje" },
  boi_china: { key: "boi_china", name: "Boi China", unit: "R$/@", source: "Scot Consultoria", sourceUrl: "https://www.scotconsultoria.com.br/cotacoes/boi-gordo/" },
  boi_gordo: { key: "boi_gordo", name: "Boi Gordo", unit: "R$/@", source: "Notícias Agrícolas", sourceUrl: "https://www.noticiasagricolas.com.br/cotacoes/boi" },
  vaca_gorda: { key: "vaca_gorda", name: "Vaca Gorda", unit: "R$/@", source: "Notícias Agrícolas", sourceUrl: "https://www.noticiasagricolas.com.br/cotacoes/boi" },
  novilha: { key: "novilha", name: "Novilha", unit: "R$/@", source: "Notícias Agrícolas", sourceUrl: "https://www.noticiasagricolas.com.br/cotacoes/boi" },
};

function build(key: string, patch: Partial<QuoteItem>): QuoteItem {
  const base = BASE[key];
  const item: QuoteItem = {
    ...base,
    price: null,
    previousPrice: null,
    change: null,
    changePct: null,
    updatedAt: null,
    available: false,
    ...patch,
  };
  if (item.available && item.price != null) {
    const hist = HISTORY[key] ?? [];
    const prev = hist.length ? hist[hist.length - 1].price : null;
    if (prev != null && prev !== item.price) {
      item.previousPrice = prev;
      item.change = item.price - prev;
      item.changePct = (item.change / prev) * 100;
    }
    pushHistory(key, item.price, item.updatedAt ?? new Date().toISOString());
  }
  return item;
}

export type MarketQuotes = {
  items: QuoteItem[];
  history: Record<string, number[]>;
  fetchedAt: string;
};

export const getMarketQuotes = createServerFn({ method: "GET" }).handler(async (): Promise<MarketQuotes> => {
  const [dolar, na, boiChina] = await Promise.all([
    fetchDolar(),
    fetchNoticiasAgricolas(),
    fetchBoiChina(),
  ]);
  const items: QuoteItem[] = [
    build("usd", dolar),
    build("boi_china", boiChina),
    build("boi_gordo", na.boi_gordo),
    build("vaca_gorda", na.vaca_gorda),
    build("novilha", na.novilha),
  ];
  const history: Record<string, number[]> = {};
  for (const it of items) history[it.key] = (HISTORY[it.key] ?? []).map((h) => h.price);
  return { items, history, fetchedAt: new Date().toISOString() };
});

// ---------- Per-state quotes ----------
function findAllRowsAfter(html: string, headerNeedle: string): NaRow[] {
  const i = html.indexOf(headerNeedle);
  if (i < 0) return [];
  const tbodyStart = html.indexOf("<tbody>", i);
  const tbodyEnd = html.indexOf("</tbody>", tbodyStart);
  if (tbodyStart < 0 || tbodyEnd < 0) return [];
  const block = html.slice(tbodyStart, tbodyEnd);
  const rowRe = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\d.,]+)<\/td>/g;
  const rows: NaRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(block))) {
    const price = parseBrNumber(m[2]);
    if (price != null) rows.push({ region: m[1].trim(), price });
  }
  return rows;
}

export type IndicatorRegions = {
  key: string;
  name: string;
  unit: string;
  source: string;
  sourceUrl: string;
  rows: { region: string; price: number }[];
};

export type QuotesByState = {
  indicators: IndicatorRegions[];
  states: string[];
  fetchedAt: string;
};

export const getMarketQuotesByState = createServerFn({ method: "GET" }).handler(async (): Promise<QuotesByState> => {
  const [naHtml, scotHtml] = await Promise.all([
    fetchText("https://www.noticiasagricolas.com.br/cotacoes/boi"),
    fetchText("https://www.scotconsultoria.com.br/cotacoes/boi-gordo/"),
  ]);

  const indicators: IndicatorRegions[] = [];

  if (naHtml) {
    indicators.push({
      ...BASE.boi_gordo,
      rows: findAllRowsAfter(naHtml, "Boi Gordo - (R$/@ - à vista)"),
    });
    indicators.push({
      ...BASE.vaca_gorda,
      rows: findAllRowsAfter(naHtml, "Vaca Gorda (R$/@ - à vista)"),
    });
    indicators.push({
      ...BASE.novilha,
      rows: findAllRowsAfter(naHtml, "Indicador da Novilha"),
    });
  }

  if (scotHtml) {
    const i = scotHtml.indexOf("Boi China a Prazo");
    if (i >= 0) {
      const tbodyStart = scotHtml.indexOf("<tbody>", i);
      const tbodyEnd = scotHtml.indexOf("</tbody>", tbodyStart);
      const rows: NaRow[] = [];
      if (tbodyStart >= 0 && tbodyEnd >= 0) {
        const block = scotHtml.slice(tbodyStart, tbodyEnd);
        const re = /<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*([\d.,]+)\s*<\/td>/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(block))) {
          const price = parseBrNumber(m[2]);
          if (price != null) rows.push({ region: m[1].trim(), price });
        }
      }
      indicators.push({ ...BASE.boi_china, rows });
    }
  }

  const stateSet = new Set<string>();
  for (const ind of indicators) for (const r of ind.rows) stateSet.add(r.region);

  return {
    indicators,
    states: Array.from(stateSet).sort((a, b) => a.localeCompare(b, "pt-BR")),
    fetchedAt: new Date().toISOString(),
  };
});

// ---------- Simple SP quotes (min/media/max) ----------
export type SpQuote = {
  key: string;
  name: string;
  unit: string;
  source: string;
  sourceUrl: string;
  min: number | null;
  media: number | null;
  max: number | null;
  samples: number;
  region: string;
  updatedAt: string | null;
  available: boolean;
};

export type SpQuotesResult = {
  items: SpQuote[];
  fetchedAt: string;
};

const SP_RE = /(\/SP\b|\bSP\s|São\s*Paulo|Sao\s*Paulo|Barretos|Araçatuba|Aracatuba|Presidente\s+Prudente|Bauru|Santos|Piracicaba|Campinas|Sorocaba|Cândido\s+Mota|Candido\s+Mota|Ourinhos|Itapeva|Assis)/i;

function stats(nums: number[]) {
  if (!nums.length) return { min: null, media: null, max: null, samples: 0 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const media = nums.reduce((a, b) => a + b, 0) / nums.length;
  return { min, media, max, samples: nums.length };
}

// Extract all rows: first cell = region label, remaining cells that look like prices
function extractRows(html: string, headerNeedle: string): { region: string; prices: number[] }[] {
  const i = html.indexOf(headerNeedle);
  if (i < 0) return [];
  const tbodyStart = html.indexOf("<tbody>", i);
  const tbodyEnd = html.indexOf("</tbody>", tbodyStart);
  if (tbodyStart < 0 || tbodyEnd < 0) return [];
  const block = html.slice(tbodyStart, tbodyEnd);
  const trs = block.split(/<tr[^>]*>/i).slice(1);
  const rows: { region: string; prices: number[] }[] = [];
  for (const tr of trs) {
    const cells: string[] = [];
    const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tr))) cells.push(m[1].replace(/<[^>]+>/g, "").trim());
    if (cells.length < 2) continue;
    const region = cells[0];
    const prices: number[] = [];
    for (let j = 1; j < cells.length; j++) {
      const v = parseBrNumber(cells[j].match(/[\d.,]+/)?.[0]);
      if (v != null && v > 0 && v < 100000) prices.push(v);
    }
    if (region) rows.push({ region, prices });
  }
  return rows;
}

function spStats(rows: { region: string; prices: number[] }[]) {
  const sp = rows.filter((r) => SP_RE.test(r.region));
  const pool = sp.length ? sp : [];
  const nums: number[] = [];
  for (const r of pool) nums.push(...r.prices);
  return stats(nums);
}

export const getSpQuotes = createServerFn({ method: "GET" }).handler(async (): Promise<SpQuotesResult> => {
  const [dolar, naBoi, naSoja, naMilho, scot] = await Promise.all([
    fetchDolar(),
    fetchText("https://www.noticiasagricolas.com.br/cotacoes/boi"),
    fetchText("https://www.noticiasagricolas.com.br/cotacoes/soja"),
    fetchText("https://www.noticiasagricolas.com.br/cotacoes/milho"),
    fetchText("https://www.scotconsultoria.com.br/cotacoes/boi-gordo/"),
  ]);
  const now = new Date().toISOString();

  const items: SpQuote[] = [];

  // Boi Gordo — Scot Mercado Físico (SP Barretos + SP Araçatuba, à vista+prazo)
  {
    const rows = scot ? extractRows(scot, "Município") : [];
    // Boi gordo prices are 1st & 2nd numeric columns
    const spRows = rows.filter((r) => SP_RE.test(r.region));
    const nums: number[] = [];
    for (const r of spRows) nums.push(...r.prices.slice(0, 2));
    const s = stats(nums);
    items.push({
      key: "boi_gordo",
      name: "Boi Gordo",
      unit: "R$/@",
      source: "Scot Consultoria (SP)",
      sourceUrl: "https://www.scotconsultoria.com.br/cotacoes/boi-gordo/",
      region: "São Paulo",
      updatedAt: now,
      available: s.samples > 0,
      ...s,
    });

    // Vaca gorda 3rd numeric column
    const nums2: number[] = [];
    for (const r of spRows) if (r.prices[2] != null) nums2.push(r.prices[2]);
    const s2 = stats(nums2);
    items.push({
      key: "vaca_gorda",
      name: "Vaca Gorda",
      unit: "R$/@",
      source: "Scot Consultoria (SP)",
      sourceUrl: "https://www.scotconsultoria.com.br/cotacoes/boi-gordo/",
      region: "São Paulo",
      updatedAt: now,
      available: s2.samples > 0,
      ...s2,
    });
  }

  // Boi China — Scot Boi China a Prazo table, filter SP
  {
    if (scot) {
      const rows = extractRows(scot, "Boi China a Prazo");
      const s = spStats(rows);
      items.push({
        key: "boi_china",
        name: "Boi China",
        unit: "R$/@",
        source: "Scot Consultoria (SP)",
        sourceUrl: "https://www.scotconsultoria.com.br/cotacoes/boi-gordo/",
        region: "São Paulo",
        updatedAt: now,
        available: s.samples > 0,
        ...s,
      });
    }
  }

  // Novilha — NA
  if (naBoi) {
    const rows = extractRows(naBoi, "Indicador da Novilha");
    const s = spStats(rows);
    items.push({
      key: "novilha",
      name: "Novilha",
      unit: "R$/@",
      source: "Notícias Agrícolas (SP)",
      sourceUrl: "https://www.noticiasagricolas.com.br/cotacoes/boi",
      region: "São Paulo",
      updatedAt: now,
      available: s.samples > 0,
      ...s,
    });
  }

  // Dólar
  if (dolar.price != null) {
    items.push({
      key: "usd",
      name: "Dólar Comercial",
      unit: "R$/US$",
      source: "melhorcambio",
      sourceUrl: "https://www.melhorcambio.com/dolar-hoje",
      region: "Brasil",
      updatedAt: now,
      available: true,
      min: dolar.price as number,
      media: dolar.price as number,
      max: dolar.price as number,
      samples: 1,
    });
  }

  // Soja — NA mercado físico SP
  if (naSoja) {
    const rows = extractRows(naSoja, "Mercado Físico");
    const s = spStats(rows);
    items.push({
      key: "soja",
      name: "Soja",
      unit: "R$/sc 60kg",
      source: "Notícias Agrícolas (SP)",
      sourceUrl: "https://www.noticiasagricolas.com.br/cotacoes/soja",
      region: "São Paulo",
      updatedAt: now,
      available: s.samples > 0,
      ...s,
    });
  }

  // Milho — NA mercado físico SP
  if (naMilho) {
    const rows = extractRows(naMilho, "Mercado Físico");
    const s = spStats(rows);
    items.push({
      key: "milho",
      name: "Milho",
      unit: "R$/sc 60kg",
      source: "Notícias Agrícolas (SP)",
      sourceUrl: "https://www.noticiasagricolas.com.br/cotacoes/milho",
      region: "São Paulo",
      updatedAt: now,
      available: s.samples > 0,
      ...s,
    });
  }

  return { items, fetchedAt: now };
});
