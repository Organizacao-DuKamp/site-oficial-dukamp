export type SellerMarginReportRow = {
  code: string;
  name: string;
  totalVenda: number;
  devolucao: number;
  aditivos: number;
  sacarias: number;
  balcao: number;
  totalCusto: number;
  margemPercentual: number;
  comissaoRepresentante: number;
  tonelagem: number;
  margemBruta: number;
  margemAditivos: number;
  margemAditivosPercentual: number;
  margemSacarias: number;
  margemSacariasPercentual: number;
  margemBalcao: number;
  margemBalcaoPercentual: number;
};

export type ParsedSellerMarginReport = {
  periodStart: string;
  periodEnd: string;
  reportTotal: number | null;
  rows: SellerMarginReportRow[];
};

const NUMERIC_FIELD_COUNT = 16;
const numberToken = /^-?[\d.,]+$/;

function decodePdfString(value: string): string {
  const escapes: Record<string, string> = {
    "\\": "\\",
    "(": "(",
    ")": ")",
    n: "\n",
    r: "\r",
    t: "\t",
    b: "\b",
    f: "\f",
  };

  return value
    .replace(/\\([\\()nrtbf])/g, (_match, code: string) => escapes[code] ?? code)
    .replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\\r?\n/g, "");
}

async function inflatePdfStream(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Este navegador não consegue ler o PDF compactado.");
  }

  const stream = new Blob([data as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractPdfText(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = new TextDecoder("windows-1252").decode(bytes);
  const textStreams: string[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const streamIndex = source.indexOf("stream", cursor);
    if (streamIndex < 0) break;

    const afterStream = streamIndex + "stream".length;
    const lineBreakLength = source.startsWith("\r\n", afterStream)
      ? 2
      : source[afterStream] === "\n" || source[afterStream] === "\r"
        ? 1
        : 0;

    if (!lineBreakLength) {
      cursor = afterStream;
      continue;
    }

    const bodyStart = afterStream + lineBreakLength;
    const endIndex = source.indexOf("endstream", bodyStart);
    if (endIndex < 0) break;

    const dictionaryStart = source.lastIndexOf("<<", streamIndex);
    const dictionary = dictionaryStart >= 0 ? source.slice(dictionaryStart, streamIndex) : "";
    let body = bytes.slice(bodyStart, endIndex);

    while (body.length && (body[body.length - 1] === 10 || body[body.length - 1] === 13)) {
      body = body.slice(0, -1);
    }

    const decodedBytes = /FlateDecode/i.test(dictionary) ? await inflatePdfStream(body) : body;
    const content = new TextDecoder("windows-1252").decode(decodedBytes);
    if (/\bTj\b/.test(content)) {
      const parts: string[] = [];
      const regex = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
      for (const match of content.matchAll(regex)) {
        parts.push(decodePdfString(match[1]));
      }
      if (parts.length) textStreams.push(parts.join("\n"));
    }

    cursor = endIndex + "endstream".length;
  }

  if (!textStreams.length) {
    throw new Error("Não foi possível extrair texto deste PDF.");
  }

  return textStreams.join("\n");
}

function parseDate(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) throw new Error("Data inválida no relatório: " + value);

  const [, day, month, shortYear] = match;
  const yearNumber = Number(shortYear);
  const year = yearNumber >= 70 ? 1900 + yearNumber : 2000 + yearNumber;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(Date.UTC(year, monthNumber - 1, dayNumber));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthNumber - 1 ||
    date.getUTCDate() !== dayNumber
  ) {
    throw new Error("Data inválida no relatório: " + value);
  }

  return date.toISOString().slice(0, 10);
}

function parseNumber(value: string, kind: "amount" | "tonnage"): number {
  const normalized = value.trim();
  const parsed =
    kind === "tonnage"
      ? Number(
          normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized,
        )
      : Number(
          normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized,
        );

  if (!Number.isFinite(parsed)) {
    throw new Error("Número inválido no relatório: " + value);
  }

  return Number(parsed.toFixed(kind === "tonnage" ? 3 : 2));
}

function normalizeSellerCode(value: string): string {
  const code = value.trim();
  return code.replace(/^0+(?=\d)/, "") || "0";
}

function nextNonEmptyLine(lines: string[], index: number): string {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const value = lines[cursor].trim();
    if (value) return value;
  }
  return "";
}

function isAggregateRow(name: string, nextLine: string): boolean {
  return /^-+$/.test(nextLine) || /^(FILIA|EXTER|MATRI)$/i.test(name) || /^TOTAL/i.test(name);
}

export async function parseSellerMarginPdf(file: Blob): Promise<ParsedSellerMarginReport> {
  const text = await extractPdfText(file);
  const periodMatch = text.match(
    /RELATORIO\s+MARGEM\s+VENDA\s+DE\s+(\d{2}\/\d{2}\/\d{2})\s+ATE\s+(\d{2}\/\d{2}\/\d{2})/i,
  );

  if (!periodMatch) {
    throw new Error("O período do relatório não foi encontrado no PDF.");
  }

  const periodStart = parseDate(periodMatch[1]);
  const periodEnd = parseDate(periodMatch[2]);
  if (periodEnd < periodStart) {
    throw new Error("O período do relatório é inválido.");
  }

  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\s*COD\s+VEND\b/i.test(line));
  if (headerIndex < 0) {
    throw new Error("A tabela de vendedores não foi encontrada no PDF.");
  }

  const totalIndex = lines.findIndex(
    (line, index) => index > headerIndex && /^\s*TOTAL\b/i.test(line),
  );
  if (totalIndex < 0) {
    throw new Error("O total do relatório não foi encontrado no PDF.");
  }

  const rows: SellerMarginReportRow[] = [];
  const seenCodes = new Set<string>();

  for (let index = headerIndex + 1; index < totalIndex; index += 1) {
    const tokens = lines[index].trim().split(/\s+/).filter(Boolean);
    if (tokens.length < NUMERIC_FIELD_COUNT + 2 || !/^\d+$/.test(tokens[0])) continue;

    const values = tokens.slice(-NUMERIC_FIELD_COUNT);
    if (values.some((value) => !numberToken.test(value))) continue;

    const name = tokens.slice(1, -NUMERIC_FIELD_COUNT).join(" ");
    if (!name || isAggregateRow(name, nextNonEmptyLine(lines, index))) continue;

    const code = normalizeSellerCode(tokens[0]);
    if (seenCodes.has(code)) {
      throw new Error("O código de vendedor " + code + " aparece mais de uma vez no PDF.");
    }
    seenCodes.add(code);

    const parsed = values.map((value, valueIndex) =>
      parseNumber(value, valueIndex === 8 ? "tonnage" : "amount"),
    );

    rows.push({
      code,
      name,
      totalVenda: parsed[0],
      devolucao: parsed[1],
      aditivos: parsed[2],
      sacarias: parsed[3],
      balcao: parsed[4],
      totalCusto: parsed[5],
      margemPercentual: parsed[6],
      comissaoRepresentante: parsed[7],
      tonelagem: parsed[8],
      margemBruta: parsed[9],
      margemAditivos: parsed[10],
      margemAditivosPercentual: parsed[11],
      margemSacarias: parsed[12],
      margemSacariasPercentual: parsed[13],
      margemBalcao: parsed[14],
      margemBalcaoPercentual: parsed[15],
    });
  }

  if (!rows.length) {
    throw new Error("Nenhum vendedor foi encontrado na tabela do PDF.");
  }

  const totalTokens = lines[totalIndex].trim().split(/\s+/);
  const reportTotal =
    totalTokens[1] && numberToken.test(totalTokens[1])
      ? parseNumber(totalTokens[1], "amount")
      : null;

  return { periodStart, periodEnd, reportTotal, rows };
}
