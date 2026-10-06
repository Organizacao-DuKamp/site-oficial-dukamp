export type ExpenseAnalysisSelection = { mode: "month" | "year" | "custom"; year: number; from: string; to: string };

export function expenseAnalysisRange(selection: ExpenseAnalysisSelection, month: number) {
  const year = Math.floor(month / 100);
  const date = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const from = selection.mode === "custom" ? selection.from : selection.mode === "year" ? date(selection.year || year, 1, 1) : date(year, month % 100, 1);
  const to = selection.mode === "custom" ? selection.to : selection.mode === "year" ? date(selection.year || year, 12, 31) : date(year, month % 100, new Date(Date.UTC(year, month % 100, 0)).getUTCDate());
  const validDate = (s: string) => {
    const parsed = new Date(`${s}T12:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number(s.slice(0, 4)) >= 2000 && Number(s.slice(0, 4)) <= 2100 && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s;
  };
  if (!from || !to || !validDate(from) || !validDate(to) || from > to) return null;
  const first = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1;
  const last = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7)) - 1;
  const key = (index: number) => Math.floor(index / 12) * 100 + index % 12 + 1;
  const length = last - first + 1;
  return { from, to, periods: Array.from({ length }, (_, i) => key(first + i)), previousPeriods: Array.from({ length }, (_, i) => key(first - length + i)) };
}
