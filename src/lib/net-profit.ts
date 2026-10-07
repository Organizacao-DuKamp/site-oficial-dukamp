export function netProfit(grossMargin: number | null | undefined, expenses: number | null | undefined): number | null {
  if (grossMargin == null || expenses == null || !Number.isFinite(grossMargin) || !Number.isFinite(expenses)) return null;
  return (Math.round(grossMargin * 100) - Math.round(expenses * 100)) / 100;
}
