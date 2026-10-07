export type FinancialReportKind = "payables" | "bank";
export type FinancialMonth = {
  year: number;
  month: number;
  total: number;
  credits: number;
  debits: number;
  values: { code: number; name: string; cents: number }[];
};
const moneyPattern = "-?\\d[\\d.]*,\\d{2}";
function cents(value: string) {
  const result = Math.round(Number(value.replaceAll(".", "").replace(",", ".")) * 100);
  if (!Number.isSafeInteger(result)) throw new Error("Valor inválido.");
  return result;
}
function date(value: string) {
  const [d, m, y] = value.split("/").map(Number),
    year = y < 100 ? 2000 + y : y;
  const parsed = new Date(Date.UTC(year, m - 1, d));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  )
    throw new Error("Data inválida no relatório.");
  return { day: d, month: m, year, key: year * 12 + m - 1 };
}
export function parseFinancialReport(text: string, kind: FinancialReportKind): FinancialMonth[] {
  if (!text || text.length > 8_000_000) throw new Error("Relatório vazio ou muito grande.");
  const pattern =
    kind === "payables"
      ? /RESUMO FINANCEIRO POR GRUPO DESPESAS DE\s*(\d{2}\/\d{2}\/\d{2,4})\s*A(?:TE)?\s*(\d{2}\/\d{2}\/\d{2,4})/g
      : /CONSULTA CONTA CORRENTE DE\s*(\d{2}\/\d{2}\/\d{2,4})\s*A(?:TE)?\s*(\d{2}\/\d{2}\/\d{2,4})/g;
  const headers = [...text.matchAll(pattern)];
  if (!headers.length)
    throw new Error(
      "Formato incompatível com o tipo escolhido. Use o relatório financeiro por grupo ou a consulta de conta corrente.",
    );
  if (headers.some((h) => h[1] !== headers[0][1] || h[2] !== headers[0][2]))
    throw new Error("O arquivo contém períodos diferentes.");
  const from = date(headers[0][1]),
    to = date(headers[0][2]);
  if (
    from.day !== 1 ||
    to.day !== new Date(Date.UTC(to.year, to.month, 0)).getUTCDate() ||
    to.key < from.key ||
    to.key - from.key > 23
  )
    throw new Error("Envie períodos de meses completos (até 24 meses).");
  if (kind === "payables" && from.key !== to.key)
    throw new Error("Contas a pagar deve conter um relatório por mês.");
  const months = Array.from({ length: to.key - from.key + 1 }, (_, i): FinancialMonth => ({
    year: Math.floor((from.key + i) / 12),
    month: ((from.key + i) % 12) + 1,
    total: 0,
    credits: 0,
    debits: 0,
    values: [],
  }));
  const lines = text.replace(/\0/g, "").split(/\r?\n/);
  if (kind === "payables") {
    const rows = months[0].values;
    let group: typeof rows = [];
    let declared: number | null = null;
    for (const line of lines) {
      const total = line.match(new RegExp(`TOTAL GERAL.*?(${moneyPattern})\\s*$`));
      if (total) {
        declared = cents(total[1]);
        continue;
      }
      const row = line.match(new RegExp(`^\\s*(\\d+)\\s+(.+?)\\s+(${moneyPattern})\\s*$`));
      if (row) {
        const code = Number(row[1]);
        if (rows.some((r) => r.code === code))
          throw new Error(`Código ${code} repetido no relatório.`);
        const item = { code, name: row[2].trim(), cents: cents(row[3]) };
        rows.push(item);
        group.push(item);
        continue;
      }
      if (/RECEITAS\s*->/.test(line)) {
        const row = group.at(-1);
        if (row) row.cents = -Math.abs(row.cents);
        continue;
      }
      const subtotal = line.match(new RegExp(`^\\s+([^\\d].*?)\\s+(${moneyPattern})\\s*$`));
      if (subtotal && group.length && !/PAG\s*\d+|EMPRESA|GRUPO|VALOR|RESUMO/.test(line)) {
        if (group.reduce((sum, r) => sum + r.cents, 0) !== cents(subtotal[2]))
          throw new Error(`Subtotal divergente: ${subtotal[1].trim()}.`);
        group = [];
      }
    }
    months[0].total = rows.reduce((sum, r) => sum + r.cents, 0);
    if (!rows.length || declared === null || months[0].total !== declared)
      throw new Error(
        "A soma dos códigos não confere com o TOTAL GERAL. Nenhum valor foi gravado.",
      );
  } else {
    const accounts = new Set([...text.matchAll(/Cta Corrente:\s*([^\s]+)/g)].map((m) => m[1]));
    if (accounts.size > 1) throw new Error("Envie uma conta bancária por relatório.");
    let current: ReturnType<typeof date> | null = null,
      count = 0;
    let declaredCredits: number | null = null,
      declaredDebits: number | null = null;
    for (const line of lines) {
      const day = line.match(/<<<\s*(\d{2}\/\d{2}\/\d{2,4})\s*>>>/);
      if (day) {
        current = date(day[1]);
        if (current.key < from.key || current.key > to.key)
          throw new Error("Lançamento fora do período.");
        continue;
      }
      const total = line.match(
        new RegExp(`TOTAL\\s+(DEBITOS|CREDITOS)\\s*->\\s*(${moneyPattern})\\s*$`),
      );
      if (total) {
        if (total[1] === "DEBITOS") declaredDebits = cents(total[2]);
        else declaredCredits = cents(total[2]);
        continue;
      }
      const movement = line.match(
        new RegExp(
          `^\\s*(.+?)\\s+(${moneyPattern})\\s+([CD])\\s+\\d{2}/\\d{2}/\\d{2,4}\\s+[SN]\\s*$`,
        ),
      );
      if (movement) {
        if (!current) throw new Error("Lançamento sem data.");
        const value = cents(movement[2]);
        if (value < 0) throw new Error("Lançamento bancário negativo não suportado.");
        const month = months[current.key - from.key];
        if (movement[3] === "C") month.credits += value;
        else month.debits += value;
        count++;
      } else if (/\s[CD]\s+\d{2}\/\d{2}\/\d{2,4}\s+[SN]\s*$/.test(line))
        throw new Error("Não foi possível ler um lançamento bancário.");
    }
    const credits = months.reduce((s, m) => s + m.credits, 0),
      debits = months.reduce((s, m) => s + m.debits, 0);
    if (
      !count ||
      declaredCredits === null ||
      declaredDebits === null ||
      credits !== declaredCredits ||
      debits !== declaredDebits
    )
      throw new Error(
        "Os lançamentos não conferem com TOTAL DEBITOS / TOTAL CREDITOS. Nenhum valor foi gravado.",
      );
    for (const month of months) month.total = month.credits - month.debits;
  }
  return months;
}
