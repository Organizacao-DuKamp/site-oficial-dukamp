export type MarginValues = {
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
export type MarginSnapshot = MarginValues & {
  report_year: number;
  report_month: number;
  period_start: string;
  period_end: string;
  report_seller_code: string;
  report_seller_name: string;
  updated_at: string;
};
export const marginKeys: (keyof MarginValues)[] = [
  "total_venda",
  "devolucao",
  "aditivos",
  "sacarias",
  "balcao",
  "total_custo",
  "comissao_representante",
  "tonelagem",
  "margem_bruta",
  "margem_aditivos",
  "margem_sacarias",
  "margem_balcao",
];
export function normalizeSellerCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^0+(?=\d)/, "");
}
function empty(): MarginValues {
  return Object.fromEntries(marginKeys.map((key) => [key, 0])) as MarginValues;
}
function number(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}
export function marginPercent(values: MarginValues) {
  return values.total_venda ? (values.margem_bruta / values.total_venda) * 100 : 0;
}
export function sumMargins(values: MarginValues[]): MarginValues {
  const total = empty();
  for (const value of values) for (const key of marginKeys) total[key] += value[key];
  return total;
}
// Relatórios importados são acumulados desde o começo do mês. Subtrair um
// snapshot anterior é obrigatório para consultar apenas parte do mês.
export function aggregateSeller(rows: MarginSnapshot[], from: string, to: string) {
  const groups = new Map<string, MarginSnapshot[]>();
  for (const row of rows) {
    const month = `${row.report_year}-${String(row.report_month).padStart(2, "0")}`;
    groups.set(month, [...(groups.get(month) ?? []), row]);
  }
  const total = empty();
  const missingBaseline: string[] = [];
  const covered: string[] = [];
  for (const [month, snapshots] of groups) {
    const start = `${month}-01`;
    const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0))
      .toISOString()
      .slice(0, 10);
    if (end < from || start > to) continue;
    const relevant = snapshots.sort(
      (a, b) =>
        a.period_end.localeCompare(b.period_end) || a.updated_at.localeCompare(b.updated_at),
    );
    const current = [...relevant]
      .reverse()
      .find((row) => row.period_end <= to && row.period_end >= from);
    if (!current) continue;
    const baseline =
      from > current.period_start
        ? [...relevant]
            .reverse()
            .find((row) => row.period_start === current.period_start && row.period_end < from)
        : undefined;
    if (from > current.period_start && !baseline) {
      missingBaseline.push(month);
      continue;
    }
    for (const key of marginKeys) total[key] += number(current[key]) - number(baseline?.[key]);
    covered.push(month);
  }
  return { totals: total, covered, missingBaseline };
}
export function weekdays(from: string, to: string) {
  let count = 0;
  const day = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1))
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) count++;
  return count;
}
