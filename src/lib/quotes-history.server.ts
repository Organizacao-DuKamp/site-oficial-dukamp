// In-memory price history used for change % and the mini sparkline.
type HistPoint = { price: number; at: string };

const HISTORY: Record<string, HistPoint[]> = {};
const MAX_HIST = 12;

export function previousPrice(key: string): number | null {
  const arr = HISTORY[key];
  if (!arr || !arr.length) return null;
  return arr[arr.length - 1].price;
}

export function pushHistory(key: string, price: number, at: string) {
  const arr = (HISTORY[key] ??= []);
  const last = arr[arr.length - 1];
  if (!last || last.price !== price) arr.push({ price, at });
  if (arr.length > MAX_HIST) arr.splice(0, arr.length - MAX_HIST);
}

export function historyPoints(key: string): number[] {
  return (HISTORY[key] ?? []).map((h) => h.price);
}
