export const BANK_RECORDS_CODE = -9001;
export const BANK_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
// Monetary amounts are integer cents, matching the imported report precision.
export type BankGroup = {
  name: string;
  subtotal: number;
  items: { description: string; amount: number }[];
};
export type BankReport = {
  year: number;
  month: number;
  source_name: string;
  payload: {
    original: number;
    adjustment: number;
    total: number;
    detail_total: number;
    groups: BankGroup[];
    reconciliation: {
      reference: string;
      description: string;
      movement: string;
      amount: number;
      summary: boolean;
    }[];
    source_text: string;
  };
};
export function previousBankPeriod(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
export function bankComparison(current: number, previous: number | null) {
  return previous === null
    ? null
    : {
        difference: current - previous,
        percent: previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100,
      };
}
export function bankAnnualSeries(reports: BankReport[], year: number) {
  return BANK_MONTHS.map((name, index) => {
    const report = reports.find((r) => r.year === year && r.month === index + 1);
    return {
      name: name.slice(0, 3),
      total: report ? report.payload.total / 100 : null,
      original: report ? report.payload.original / 100 : null,
    };
  });
}
