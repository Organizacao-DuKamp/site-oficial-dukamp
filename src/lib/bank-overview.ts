export type BankOverviewReport = {
  year: number;
  month: number;
  payload: {
    // Independent bank summary, in cents. Expense report totals belong to the lower cards.
    bank_expense_total?: number;
    bank_credits_total?: number;
    bank_totals?: { credits: number };
  };
};

export function bankOverviewAmounts(report: BankOverviewReport | undefined) {
  const credits = report?.payload.bank_credits_total ?? report?.payload.bank_totals?.credits ?? null;
  const expenses = report?.payload.bank_expense_total ?? null;
  return {
    credits,
    expenses,
    result: credits !== null && expenses !== null ? credits - expenses : null,
  };
}

export function bankOverviewRangeAmounts(reports: BankOverviewReport[], periods: number[]) {
  const amounts = periods.map(key => bankOverviewAmounts(reports.find(r => r.year * 100 + r.month === key)));
  const sum = (field: "credits" | "expenses") => {
    const values = amounts.map(a => a[field]).filter((v): v is number => v !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  const credits = sum("credits"), expenses = sum("expenses");
  const availableMonths = amounts.filter(a => a.result !== null).length;
  // A result requires both sides for the same months; never subtract mismatched coverage.
  const matchingCoverage = amounts.every(a => (a.credits === null) === (a.expenses === null));
  return { credits, expenses, availableMonths, result: matchingCoverage && credits !== null && expenses !== null ? credits - expenses : null };
}
