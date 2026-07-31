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
  price: number | null;
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

    const [usd, boiHtml, vacaHtml, novilhaHtml, graosHtml] = await Promise.all([
      S.fetchDolarPrice(),
      S.fetchText(S.SCOT_BOI_URL),
      S.fetchText(S.SCOT_VACA_URL),
      S.fetchText(S.SCOT_NOVILHA_URL),
      S.fetchText(S.SCOT_SOJA_URL),
    ]);

    const boiTables = boiHtml ? S.parseTables(boiHtml) : [];
    const vacaTables = vacaHtml ? S.parseTables(vacaHtml) : [];
    const novilhaTables = novilhaHtml ? S.parseTables(novilhaHtml) : [];
    const graosTables = graosHtml ? S.parseTables(graosHtml) : [];

    const boiTable = S.findTableWithRow(boiTables, ["sp barretos"]);
    const chinaTable = S.findTableWithRow(boiTables, ["são paulo"]);
    const vacaTable = S.findTableWithRow(vacaTables, ["sp barretos"]);
    const novilhaTable = S.findTableWithRow(novilhaTables, ["sp barretos"]);
    const sojaTable = S.findTableWithRow(graosTables, ["santos"]);
    const milhoTable = S.findTableWithRow(graosTables, ["são paulo"]);

    const now = new Date().toISOString();
    const selected = [
      {
        key: "boi_gordo",
        name: "Boi Gordo",
        unit: "R$/@",
        source: "Scot Consultoria",
        sourceUrl: S.SCOT_BOI_URL,
        price: S.firstPositiveNumber(S.findRowContaining(boiTable, ["sp barretos"])),
        region: "SP/Barretos",
        updatedAt: boiHtml ? S.extractUpdatedAt(boiHtml, "Mercado Físico") : null,
      },
      {
        key: "boi_china",
        name: "Boi China",
        unit: "R$/@",
        source: "Scot Consultoria",
        sourceUrl: S.SCOT_BOI_URL,
        price: S.firstPositiveNumber(S.findRowContaining(chinaTable, ["são paulo"])),
        region: "SP/São Paulo",
        updatedAt: boiHtml ? S.extractUpdatedAt(boiHtml, "Boi China a Prazo") : null,
      },
      {
        key: "usd",
        name: "Dólar Comercial",
        unit: "R$/US$",
        source: "melhorcambio",
        sourceUrl: S.DOLAR_URL,
        price: usd,
        region: "Brasil",
        updatedAt: usd != null ? now : null,
      },
      {
        key: "soja",
        name: "Soja",
        unit: "R$/sc 60kg",
        source: "Scot Consultoria",
        sourceUrl: S.SCOT_SOJA_URL,
        price: S.firstPositiveNumber(S.findRowContaining(sojaTable, ["santos"])),
        region: "SP/Santos",
        updatedAt: graosHtml ? S.extractUpdatedAt(graosHtml, "SOJA -") : null,
      },
      {
        key: "milho",
        name: "Milho",
        unit: "R$/sc 60kg",
        source: "Scot Consultoria",
        sourceUrl: S.SCOT_MILHO_URL,
        price: S.firstPositiveNumber(S.findRowContaining(milhoTable, ["são paulo"])),
        region: "SP/São Paulo",
        updatedAt: graosHtml ? S.extractUpdatedAt(graosHtml, "MILHO -") : null,
      },
      {
        key: "vaca_gorda",
        name: "Vaca Gorda",
        unit: "R$/@",
        source: "Scot Consultoria",
        sourceUrl: S.SCOT_VACA_URL,
        price: S.firstPositiveNumber(S.findRowContaining(vacaTable, ["sp barretos"])),
        region: "SP/Barretos",
        updatedAt: vacaHtml ? S.extractUpdatedAt(vacaHtml, "Mercado Físico") : null,
      },
      {
        key: "novilha",
        name: "Novilha Gorda",
        unit: "R$/@",
        source: "Scot Consultoria",
        sourceUrl: S.SCOT_NOVILHA_URL,
        price: S.firstPositiveNumber(S.findRowContaining(novilhaTable, ["sp barretos"])),
        region: "SP/Barretos",
        updatedAt: novilhaHtml ? S.extractUpdatedAt(novilhaHtml, "Mercado Físico") : null,
      },
    ];

    const items: QuoteItem[] = selected.map((quote) => {
      const previousPrice = quote.price != null ? H.previousPrice(quote.key) : null;
      const updatedAt = quote.price != null ? (quote.updatedAt ?? now) : null;
      if (quote.price != null) H.pushHistory(quote.key, quote.price, updatedAt ?? now);

      return {
        ...quote,
        previousPrice,
        change:
          previousPrice != null && quote.price != null ? quote.price - previousPrice : null,
        changePct:
          previousPrice != null && quote.price != null
            ? ((quote.price - previousPrice) / previousPrice) * 100
            : null,
        updatedAt,
        available: quote.price != null,
      };
    });

    const history: Record<string, number[]> = {};
    for (const item of items) history[item.key] = H.historyPoints(item.key);

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
        if (/\(kg\)/i.test(region)) continue; // preços em R$/kg não comparáveis a R$/@
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

    const [usd, boiHtml, vacaHtml, novilhaHtml, graosHtml] = await Promise.all([
      S.fetchDolarPrice(),
      S.fetchText(S.SCOT_BOI_URL),
      S.fetchText(S.SCOT_VACA_URL),
      S.fetchText(S.SCOT_NOVILHA_URL),
      S.fetchText(S.SCOT_SOJA_URL),
    ]);

    const now = new Date().toISOString();
    const boiTables = boiHtml ? S.parseTables(boiHtml) : [];
    const vacaTables = vacaHtml ? S.parseTables(vacaHtml) : [];
    const novilhaTables = novilhaHtml ? S.parseTables(novilhaHtml) : [];
    const graosTables = graosHtml ? S.parseTables(graosHtml) : [];

    const boiTable = S.findTableWithRow(boiTables, ["sp barretos"]);
    const chinaTable = S.findTableWithRow(boiTables, ["são paulo"]);
    const vacaTable = S.findTableWithRow(vacaTables, ["sp barretos"]);
    const novilhaTable = S.findTableWithRow(novilhaTables, ["sp barretos"]);
    const sojaTable = S.findTableWithRow(graosTables, ["santos"]);
    const milhoTable = S.findTableWithRow(graosTables, ["são paulo"]);

    const make = (
      key: string,
      name: string,
      unit: string,
      source: string,
      sourceUrl: string,
      price: number | null,
      region: string,
      updatedAt: string | null,
    ): SpQuote => ({
      key,
      name,
      unit,
      source,
      sourceUrl,
      price,
      region,
      updatedAt: price != null ? (updatedAt ?? now) : null,
      available: price != null,
    });

    const items: SpQuote[] = [
      make(
        "boi_gordo",
        "Boi Gordo",
        "R$/@",
        "Scot Consultoria",
        S.SCOT_BOI_URL,
        S.firstPositiveNumber(S.findRowContaining(boiTable, ["sp barretos"])),
        "SP/Barretos",
        boiHtml ? S.extractUpdatedAt(boiHtml, "Mercado Físico") : null,
      ),
      make(
        "boi_china",
        "Boi China",
        "R$/@",
        "Scot Consultoria",
        S.SCOT_BOI_URL,
        S.firstPositiveNumber(S.findRowContaining(chinaTable, ["são paulo"])),
        "SP/São Paulo",
        boiHtml ? S.extractUpdatedAt(boiHtml, "Boi China a Prazo") : null,
      ),
      make(
        "usd",
        "Dólar Comercial",
        "R$/US$",
        "melhorcambio",
        S.DOLAR_URL,
        usd,
        "Brasil",
        usd != null ? now : null,
      ),
      make(
        "soja",
        "Soja",
        "R$/sc 60kg",
        "Scot Consultoria",
        S.SCOT_SOJA_URL,
        S.firstPositiveNumber(S.findRowContaining(sojaTable, ["santos"])),
        "SP/Santos",
        graosHtml ? S.extractUpdatedAt(graosHtml, "SOJA -") : null,
      ),
      make(
        "milho",
        "Milho",
        "R$/sc 60kg",
        "Scot Consultoria",
        S.SCOT_MILHO_URL,
        S.firstPositiveNumber(S.findRowContaining(milhoTable, ["são paulo"])),
        "SP/São Paulo",
        graosHtml ? S.extractUpdatedAt(graosHtml, "MILHO -") : null,
      ),
      make(
        "vaca_gorda",
        "Vaca Gorda",
        "R$/@",
        "Scot Consultoria",
        S.SCOT_VACA_URL,
        S.firstPositiveNumber(S.findRowContaining(vacaTable, ["sp barretos"])),
        "SP/Barretos",
        vacaHtml ? S.extractUpdatedAt(vacaHtml, "Mercado Físico") : null,
      ),
      make(
        "novilha",
        "Novilha Gorda",
        "R$/@",
        "Scot Consultoria",
        S.SCOT_NOVILHA_URL,
        S.firstPositiveNumber(S.findRowContaining(novilhaTable, ["sp barretos"])),
        "SP/Barretos",
        novilhaHtml ? S.extractUpdatedAt(novilhaHtml, "Mercado Físico") : null,
      ),
    ];

    return { items, fetchedAt: now };
  },
);
