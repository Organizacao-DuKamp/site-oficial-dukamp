import { loadAllExpenseValues } from "@/lib/expense-values";

type ExpenseValue = { year: number; month: number; subcategory_code: number; amount: number | string };
type ExpenseSubcategory = { code: number; category_code: number };
export type StatisticsExpensesData = { values: ExpenseValue[]; subcategories: ExpenseSubcategory[] };

export async function loadStatisticsExpenses(db: any): Promise<StatisticsExpensesData> {
  const [values, subcategories] = await Promise.all([
    loadAllExpenseValues(db),
    db.from("dukamp_expense_subcategories").select("code,category_code").order("code"),
  ]);
  if (subcategories.error) throw subcategories.error;
  const data = { values: values.data, subcategories: subcategories.data ?? [] };
  const knownCodes = new Set(data.subcategories.map((row: ExpenseSubcategory) => Number(row.code)));
  if (data.values.some(row => !knownCodes.has(Number(row.subcategory_code)) || !Number.isFinite(Number(row.amount)))) {
    throw new Error("Não foi possível validar os valores de despesas.");
  }
  return data;
}

export function statisticsExpensesInRange(data: StatisticsExpensesData, from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    return { amount: null, availableMonths: 0, expectedMonths: 0, complete: false };
  }
  const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
  const first = monthIndex(from), last = monthIndex(to);
  const categories = new Map(data.subcategories.map(row => [Number(row.code), Number(row.category_code)]));
  const available = new Set<number>();
  let cents = 0;
  for (const row of data.values) {
    const key = Number(row.year) * 12 + Number(row.month) - 1;
    if (key < first || key > last) continue;
    available.add(key);
    const code = Number(row.subcategory_code);
    const category = categories.get(code);
    if (category === undefined) throw new Error("Categoria de despesa não encontrada.");
    // Exclude the entire supplier group plus the explicitly named fields.
    if (category === 9010 || [1, 8, 111, 79].includes(code)) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) throw new Error("Valor de despesa inválido.");
    cents += Math.round(amount * 100);
  }
  const expectedMonths = last - first + 1;
  return {
    amount: available.size ? cents / 100 : null,
    availableMonths: available.size,
    expectedMonths,
    complete: expectedMonths > 0 && available.size === expectedMonths,
  };
}
