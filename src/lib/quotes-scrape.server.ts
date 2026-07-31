// Scrapers for Notícias Agrícolas / Scot Consultoria (server-only).

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const NA_BOI_URL = "https://www.noticiasagricolas.com.br/cotacoes/boi-gordo";
export const NA_SOJA_URL = "https://www.noticiasagricolas.com.br/cotacoes/soja";
export const NA_MILHO_URL = "https://www.noticiasagricolas.com.br/cotacoes/milho";
export const SCOT_URL = "https://www.scotconsultoria.com.br/cotacoes/boi-gordo/";
export const DOLAR_URL = "https://www.melhorcambio.com/dolar-hoje";

export function parseBrNumber(s: string | undefined | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(cleaned)) return null;
  const n = Number(cleaned.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function fetchText(url: string, timeoutMs = 9000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/json" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function decodeEntities(s: string) {
  const named: Record<string, string> = {
    nbsp: " ", amp: "&", aacute: "á", eacute: "é", iacute: "í", oacute: "ó",
    uacute: "ú", atilde: "ã", otilde: "õ", agrave: "à", ccedil: "ç", acirc: "â",
    ecirc: "ê", ocirc: "ô", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó",
    Uacute: "Ú", Atilde: "Ã", Otilde: "Õ", Ccedil: "Ç", Acirc: "Â", Ecirc: "Ê",
    Ocirc: "Ô", quot: '"', apos: "'", lt: "<", gt: ">",
  };
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => named[n] ?? " ");
}

export type Table = { header: string[]; rows: string[][] };

/** Parse every <table> of a document into header + rows of plain-text cells. */
export function parseTables(html: string): Table[] {
  const out: Table[] = [];
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html))) {
    const blk = tm[0];
    const trs = blk.split(/<tr[^>]*>/i).slice(1);
    const parsed: string[][] = [];
    for (const tr of trs) {
      const cells: string[] = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(tr))) {
        cells.push(
          decodeEntities(cm[1].replace(/<[^>]+>/g, " "))
            .replace(/\s+/g, " ")
            .trim(),
        );
      }
      if (cells.length) parsed.push(cells);
    }
    if (!parsed.length) continue;
    // The header is the first row that has no numeric-only price cells.
    let headerIdx = 0;
    for (let i = 0; i < Math.min(parsed.length, 3); i++) {
      if (!parsed[i].slice(1).some((c) => /^\s*[\d.,]+\s*$/.test(c))) {
        headerIdx = i;
        break;
      }
    }
    out.push({ header: parsed[headerIdx], rows: parsed.slice(headerIdx + 1) });
  }
  return out;
}

export function findTable(tables: Table[], needles: string[]): Table | null {
  for (const t of tables) {
    const h = t.header.join(" | ").toLowerCase();
    if (needles.every((n) => h.includes(n.toLowerCase()))) return t;
  }
  return null;
}

export const isSpRow = (region: string) =>
  /(^|\s|\/)SP(\s|\/|$|\b)/i.test(region) || /s(ã|a)o\s*paulo/i.test(region);

export type Stats = { min: number | null; media: number | null; max: number | null; samples: number };

export function stats(nums: number[]): Stats {
  const vals = nums.filter((n) => Number.isFinite(n) && n > 0);
  if (!vals.length) return { min: null, media: null, max: null, samples: 0 };
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    media: vals.reduce((a, b) => a + b, 0) / vals.length,
    samples: vals.length,
  };
}

/** Collect values of the given column indexes from rows matching a region filter. */
export function collect(
  table: Table | null,
  cols: number[],
  match: (region: string) => boolean,
): { values: number[]; regions: string[] } {
  if (!table) return { values: [], regions: [] };
  const values: number[] = [];
  const regions: string[] = [];
  for (const row of table.rows) {
    const region = row[0] ?? "";
    if (!region || !match(region)) continue;
    let got = false;
    for (const c of cols) {
      const v = parseBrNumber(row[c]);
      if (v != null && v > 0) {
        values.push(v);
        got = true;
      }
    }
    if (got) regions.push(region);
  }
  return { values, regions };
}

/** Try SP rows first, fall back to all rows. */
export function collectSpFirst(table: Table | null, cols: number[]) {
  const sp = collect(table, cols, isSpRow);
  if (sp.values.length) return { ...sp, scope: "sp" as const };
  const all = collect(table, cols, () => true);
  return { ...all, scope: all.values.length ? ("br" as const) : ("none" as const) };
}

export function extractUpdatedAt(html: string, near: string): string | null {
  const i = html.indexOf(near);
  const slice = i >= 0 ? html.slice(i, i + 6000) : html;
  const m = decodeEntities(slice.replace(/<[^>]+>/g, " ")).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const dt = new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00Z`);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export async function fetchDolarPrice(): Promise<number | null> {
  const html = await fetchText(DOLAR_URL);
  if (!html) return null;
  const m = html.match(/id=["']comercial["'][^>]*value=["']([\d.,]+)["']/i);
  const price = m ? parseBrNumber(m[1]) : null;
  return price;
}
