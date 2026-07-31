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

export type MarketQuotes = {
  items: QuoteItem[];
  history: Record<string, number[]>;
  fetchedAt: string;
};

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

export const getMarketQuotes = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketQuotes> => {
    const S = await import("./quotes-scrape.server");
    const H = await import("./quotes-history.server");

    const [usd, naBoi, scot] = await Promise.all([
      S.fetchDolarPrice(),
      S.fetchText(S.NA_BOI_URL),
      S.fetchText(S.SCOT_URL),
    ]);

    const naTables = naBoi ? S.parseTables(naBoi) : [];
    const scotTables = scot ? S.parseTables(scot) : [];
    const boiTable = S.findTable(naTables, ["município", "boi gordo"]);
    const repoTable = S.findTable(naTables, ["desmama", "bezerra", "novilha"]);
    const chinaTable = S.findTableContaining(scotTables, ["boi china a prazo", "preço bruto"]);
    const naDate = naBoi ? S.extractUpdatedAt(naBoi, "Atualizado em") : null;
    const scotDate = scot ? S.extractUpdatedAt(scot, "Boi China a Prazo") : null;
    const now = new Date().toISOString();

    const pick = (table: ReturnType<typeof S.parseTables>[number] | null, col: number) => {
      const got = S.collectSpFirst(table, [col]);
      const st = S.stats(got.values);
      return { price: st.media, region: got.regions[0] ?? null, scope: got.scope };
    };

    const bg = pick(boiTable, 1);
    const vg = pick(boiTable, 3);
    const nv = pick(repoTable, 3);
    const bc = pick(chinaTable, 1);

    const defs: Array<[string, string, string, string, string, { price: number | null; region: string | null }, string | null]> = [
      ["usd", "Dólar Comercial", "R$/US$", "melhorcambio", S.DOLAR_URL, { price: usd, region: "Brasil" }, now],
      ["boi_china", "Boi China", "R$/@", "Scot Consultoria", S.SCOT_URL, bc, scotDate ?? now],
      ["boi_gordo", "Boi Gordo", "R$/@", "Notícias Agrícolas", S.NA_BOI_URL, bg, naDate ?? now],
      ["vaca_gorda", "Vaca Gorda", "R$/@", "Notícias Agrícolas", S.NA_BOI_URL, vg, naDate ?? now],
      ["novilha", "Novilha (reposição)", "R$/kg", "Notícias Agrícolas", S.NA_BOI_URL, nv, naDate ?? now],
    ];

    const items: QuoteItem[] = defs.map(([key, name, unit, source, sourceUrl, val, at]) => {
      const price = val.price;
      const prev = price != null ? H.previousPrice(key) : null;
      if (price != null) H.pushHistory(key, price, at ?? now);
      return {
        key,
        name,
        unit,
        source,
        sourceUrl,
        price,
        previousPrice: prev,
        change: prev != null && price != null ? price - prev : null,
        changePct: prev != null && price != null ? ((price - prev) / prev) * 100 : null,
        updatedAt: price != null ? at : null,
        available: price != null,
        region: val.region ?? undefined,
      };
    });

    const history: Record<string, number[]> = {};
    for (const it of items) history[it.key] = H.historyPoints(it.key);

    return { items, history, fetchedAt: now };
  },
);

export const getMarketQuotesByState = createServerFn({ method: "GET" }).handler(
  async (): Promise<QuotesByState> => {
    const S = await import("./quotes-scrape.server");
    const [naBoi, scot] = await Promise.all([S.fetchText(S.NA_BOI_URL), S.fetchText(S.SCOT_URL)]);

    const naTables = naBoi ? S.parseTables(naBoi) : [];
    const scotTables = scot ? S.parseTables(scot) : [];
    const boiTable = S.findTable(naTables, ["município", "boi gordo"]);
    const repoTable = S.findTable(naTables, ["desmama", "bezerra", "novilha"]);
    const chinaTable = S.findTableContaining(scotTables, ["boi china a prazo", "preço bruto"]);

    const rowsOf = (
      table: ReturnType<typeof S.parseTables>[number] | null,
      col: number,
    ): { region: string; price: number }[] => {
      if (!table) return [];
      const out: { region: string; price: number }[] = [];
      for (const row of table.rows) {
        const region = (row[0] ?? "").trim();
        const price = S.parseBrNumber(row[col]);
        if (!region || region.length > 40 || price == null || price <= 0) continue;
        out.push({ region, price });
      }
      return out;
    };

    const indicators: IndicatorRegions[] = [
      {
        key: "boi_gordo",
        name: "Boi Gordo (à vista)",
        unit: "R$/@",
        source: "Notícias Agrícolas",
        sourceUrl: S.NA_BOI_URL,
        rows: rowsOf(boiTable, 1),
      },
      {
        key: "vaca_gorda",
        name: "Vaca Gorda (à vista)",
        unit: "R$/@",
        source: "Notícias Agrícolas",
        sourceUrl: S.NA_BOI_URL,
        rows: rowsOf(boiTable, 3),
      },
      {
        key: "boi_china",
        name: "Boi China (30 dias)",
        unit: "R$/@",
        source: "Scot Consultoria",
        sourceUrl: S.SCOT_URL,
        rows: rowsOf(chinaTable, 1),
      },
      {
        key: "novilha",
        name: "Novilha (reposição)",
        unit: "R$/kg",
        source: "Notícias Agrícolas",
        sourceUrl: S.NA_BOI_URL,
        rows: rowsOf(repoTable, 3),
      },
    ].filter((i) => i.rows.length > 0);

    const stateSet = new Set<string>();
    for (const ind of indicators) for (const r of ind.rows) stateSet.add(r.region);

    return {
      indicators,
      states: Array.from(stateSet).sort((a, b) => a.localeCompare(b, "pt-BR")),
      fetchedAt: new Date().toISOString(),
    };
  },
);

export const getSpQuotes = createServerFn({ method: "GET" }).handler(
  async (): Promise<SpQuotesResult> => {
    const S = await import("./quotes-scrape.server");

    const [usd, naBoi, naSoja, naMilho, scot] = await Promise.all([
      S.fetchDolarPrice(),
      S.fetchText(S.NA_BOI_URL),
      S.fetchText(S.NA_SOJA_URL),
      S.fetchText(S.NA_MILHO_URL),
      S.fetchText(S.SCOT_URL),
    ]);

    const now = new Date().toISOString();
    const naTables = naBoi ? S.parseTables(naBoi) : [];
    const sojaTables = naSoja ? S.parseTables(naSoja) : [];
    const milhoTables = naMilho ? S.parseTables(naMilho) : [];
    const scotTables = scot ? S.parseTables(scot) : [];

    const boiTable = S.findTable(naTables, ["município", "boi gordo"]);
    const repoTable = S.findTable(naTables, ["desmama", "bezerra", "novilha"]);
    const chinaTable = S.findTableContaining(scotTables, ["boi china a prazo", "preço bruto"]);
    const sojaTable = S.findTable(sojaTables, ["praça", "sc de 60"]);
    const milhoTable = S.findTable(milhoTables, ["praça", "sc de 60"]);

    const naDate = naBoi ? S.extractUpdatedAt(naBoi, "Atualizado em") : null;
    const scotDate = scot ? S.extractUpdatedAt(scot, "Boi China a Prazo") : null;

    const make = (
      key: string,
      name: string,
      unit: string,
      source: string,
      sourceUrl: string,
      table: ReturnType<typeof S.parseTables>[number] | null,
      cols: number[],
      at: string | null,
    ): SpQuote => {
      const got = S.collectSpFirst(table, cols);
      const st = S.stats(got.values);
      const region =
        got.scope === "sp"
          ? "São Paulo"
          : got.scope === "br"
            ? "Brasil (média)"
            : "Sem dados";
      return {
        key,
        name,
        unit,
        source,
        sourceUrl,
        region,
        updatedAt: st.samples ? (at ?? now) : null,
        available: st.samples > 0,
        min: st.min,
        media: st.media,
        max: st.max,
        samples: st.samples,
      };
    };

    const items: SpQuote[] = [
      // Boi gordo SP: à vista (col 1) e prazo 30 dias (col 2)
      make("boi_gordo", "Boi Gordo", "R$/@", "Notícias Agrícolas", S.NA_BOI_URL, boiTable, [1, 2], naDate),
      make("boi_china", "Boi China", "R$/@", "Scot Consultoria", S.SCOT_URL, chinaTable, [1, 2], scotDate),
      {
        key: "usd",
        name: "Dólar Comercial",
        unit: "R$/US$",
        source: "melhorcambio",
        sourceUrl: S.DOLAR_URL,
        region: "Brasil",
        updatedAt: usd != null ? now : null,
        available: usd != null,
        min: usd,
        media: usd,
        max: usd,
        samples: usd != null ? 1 : 0,
      },
      make("soja", "Soja", "R$/sc 60kg", "Notícias Agrícolas", S.NA_SOJA_URL, sojaTable, [1], naDate),
      make("milho", "Milho", "R$/sc 60kg", "Notícias Agrícolas", S.NA_MILHO_URL, milhoTable, [1], naDate),
      make("vaca_gorda", "Vaca Gorda", "R$/@", "Notícias Agrícolas", S.NA_BOI_URL, boiTable, [3], naDate),
      make("novilha", "Novilha (reposição)", "R$/kg", "Notícias Agrícolas", S.NA_BOI_URL, repoTable, [3], naDate),
    ];

    return { items: items.filter((i) => i.available), fetchedAt: now };
  },
);
