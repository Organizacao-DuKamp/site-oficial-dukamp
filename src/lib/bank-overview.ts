export type BankOverviewReport = {
  year: number;
  month: number;
  payload: {
    // Independent bank summary, in cents. Expense report totals belong to the lower cards.
    bank_expense_total?: number;
    bank_totals?: { credits: number };
  };
};

export function bankOverviewAmounts(report: BankOverviewReport | undefined) {
  const credits = report?.payload.bank_totals?.credits ?? null;
  const expenses = report?.payload.bank_expense_total ?? null;
  return {
    credits,
    expenses,
    result: credits !== null && expenses !== null ? credits - expenses : null,
  };
}
