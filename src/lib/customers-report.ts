export type ImportedCustomer = {
  cliente: string;
  codigo: string;
  cnpj_cpf: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  telefone_2: string | null;
  repr: string | null;
  classificacao_l: string | null;
  conceito: string | null;
  marcador_relatorio: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  contato: string | null;
  data_cadastro: string | null;
  endereco_pagamento: string | null;
  numero_pagamento: string | null;
  bairro_pagamento: string | null;
  cidade_pagamento: string | null;
  uf_pagamento: string | null;
  cep_pagamento: string | null;
  data_maior_compra: string | null;
  valor_maior_compra: number | null;
  maior_atraso_dias: number | null;
  compra_ano: number | null;
  ultima_compra: string | null;
  valor_ultima_compra: number | null;
  media_atraso_dias: number | null;
  compra_ano_anterior: number | null;
};

export type CustomerReportError = {
  line: number;
  codigo: string;
  reason: string;
};

const clean = (value: unknown): string | null => {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized && normalized !== "@" && normalized !== "@@" ? normalized : null;
};

function cleanPhone(value: unknown): string | null {
  const normalized = clean(value);
  return normalized?.replace(/-\s+/g, "-") ?? null;
}

function parseDate(value: unknown): string | null {
  const match = String(value ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const [, day, month, shortYear] = match;
  const yearNumber = Number(shortYear);
  const year = yearNumber >= 70 ? 1900 + yearNumber : 2000 + yearNumber;
  return `${year}-${month}-${day}`;
}

function parseMoney(value: unknown): number | null {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function splitAddressNumber(value: unknown) {
  const fullAddress = clean(value);
  if (!fullAddress) return { address: null, number: null };

  const match = fullAddress.match(/^(.*?)(?:,\s*|\s+)(S\/?N|SN|SNR|\d+[A-Z]?(?:[-/]\d+)?)$/i);
  if (!match || !clean(match[1])) return { address: fullAddress, number: null };
  return { address: clean(match[1]), number: clean(match[2]) };
}

function parseMainAddress(lines: string[], startIndex: number) {
  const first = (lines[startIndex] ?? "").padEnd(127, " ");
  const firstDate = parseDate(first.slice(119, 127));
  let dataLine = first;
  let consumed = 1;
  let fullAddress = clean(first.slice(2, 44));

  if (!firstDate) {
    const continuation = (lines[startIndex + 1] ?? "").padEnd(127, " ");
    if (parseDate(continuation.slice(119, 127))) {
      dataLine = continuation;
      consumed = 2;
      fullAddress = clean(
        [clean(first.slice(2)), clean(continuation.slice(2, 44))].filter(Boolean).join(" "),
      );
    }
  }

  const { address, number } = splitAddressNumber(fullAddress);
  return {
    consumed,
    values: {
      endereco: address,
      numero: number,
      bairro: clean(dataLine.slice(44, 66)),
      cidade: clean(dataLine.slice(66, 88)),
      uf: clean(dataLine.slice(88, 92)),
      cep: clean(dataLine.slice(92, 103)),
      contato: clean(dataLine.slice(103, 119)),
      data_cadastro: parseDate(dataLine.slice(119, 127)),
    },
  };
}

function parsePaymentAddress(line: string) {
  const parts = line.trim().split(/\s{2,}/).map(clean).filter((part): part is string => Boolean(part));
  let fullAddress: string | null = null;
  let neighborhood: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zipCode: string | null = null;

  if (parts.length >= 5) {
    zipCode = parts.at(-1) ?? null;
    state = parts.at(-2) ?? null;
    city = parts.at(-3) ?? null;
    neighborhood = parts.at(-4) ?? null;
    fullAddress = clean(parts.slice(0, -4).join(" "));
  } else if (parts.length === 4) {
    [fullAddress, city, state, zipCode] = parts;
  } else {
    fullAddress = clean(line);
  }

  const { address, number } = splitAddressNumber(fullAddress);
  return {
    endereco_pagamento: address,
    numero_pagamento: number,
    bairro_pagamento: neighborhood,
    cidade_pagamento: city,
    uf_pagamento: state,
    cep_pagamento: zipCode,
  };
}

function parseLargestPurchase(line: string) {
  const match = line.match(
    /^\s*MAIOR COMPRA\s+((?:\d{2}\/\d{2}\/\d{2})|(?:\s*\/\s*\/\s*))\s+==>\s*([\d.,-]+)\s+MAIOR ATRASO\s+==>\s*(\d+)\s+DIAS\s+COMPRA NO ANO\s*\.\s*\.\s*\.\s*==>\s*([\d.,-]+)/i,
  );
  if (!match) return null;
  return {
    data_maior_compra: parseDate(match[1]),
    valor_maior_compra: parseMoney(match[2]),
    maior_atraso_dias: Number(match[3]),
    compra_ano: parseMoney(match[4]),
  };
}

function parseLatestPurchase(line: string) {
  const match = line.match(
    /^\s*ULTIMA COMP\.\s+(\d{2}\/\d{2}\/\d{2})\s+==>\s*([\d.,-]+)\s+MEDIA ATRASO\s+==>\s*(\d+)\s+DIAS\s+COMPRA ANO ANTERIOR\s+==>\s*([\d.,-]+)/i,
  );
  if (!match) return null;
  return {
    ultima_compra: parseDate(match[1]),
    valor_ultima_compra: parseMoney(match[2]),
    media_atraso_dias: Number(match[3]),
    compra_ano_anterior: parseMoney(match[4]),
  };
}

export function parseCustomerReport(text: string): {
  customers: ImportedCustomer[];
  errors: CustomerReportError[];
} {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/[\u0000\u000c]/g, ""));
  const customers: ImportedCustomer[] = [];
  const errors: CustomerReportError[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const first = lines[i];
    const codigo = first.slice(44, 52).trim();
    if (!/^\d{6}$/.test(codigo) || first.length < 120) continue;

    const rawName = first.slice(1, 44).trim();
    const markerMatch = rawName.match(/^([^\p{L}\p{N}]+)\s*/u);
    const marcador = markerMatch ? markerMatch[1].trim() : null;
    const cliente = clean(markerMatch ? rawName.slice(markerMatch[0].length) : rawName);
    if (!cliente) {
      errors.push({ line: i + 1, codigo, reason: "nome vazio" });
      continue;
    }

    const main = parseMainAddress(lines, i + 1);
    let cursor = i + 1 + main.consumed;
    let payment = {
      endereco_pagamento: null as string | null,
      numero_pagamento: null as string | null,
      bairro_pagamento: null as string | null,
      cidade_pagamento: null as string | null,
      uf_pagamento: null as string | null,
      cep_pagamento: null as string | null,
    };

    if (!/^\s*MAIOR COMPRA/i.test(lines[cursor] ?? "")) {
      payment = parsePaymentAddress(lines[cursor] ?? "");
      cursor += 1;
    }

    const largest = parseLargestPurchase(lines[cursor] ?? "");
    const latest = parseLatestPurchase(lines[cursor + 1] ?? "");
    if (!largest || !latest) {
      errors.push({ line: i + 1, codigo, reason: "linhas de compra não reconhecidas" });
      continue;
    }

    const cnpjCpfFormatted = clean(first.slice(53, 72));
    customers.push({
      cliente,
      codigo,
      cnpj_cpf: cnpjCpfFormatted?.replace(/\D/g, "") || null,
      inscricao_estadual: clean(first.slice(73, 90)),
      telefone: cleanPhone(first.slice(91, 108)),
      telefone_2: cleanPhone(first.slice(109, 117)),
      repr: clean(first.slice(117, 123)),
      classificacao_l: clean(first.slice(123, 126)),
      conceito: clean(first.slice(126, 127)),
      marcador_relatorio: marcador,
      ...main.values,
      ...payment,
      ...largest,
      ...latest,
    });
  }

  return { customers, errors };
}
