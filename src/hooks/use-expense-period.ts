import { useCallback, useState } from "react";

function isPeriod(value: number) {
  const year = Math.floor(value / 100);
  const month = value % 100;
  return Number.isInteger(value) && year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

export function useExpensePeriod(key: string) {
  const [period, setPeriod] = useState<number | null>(() => {
    try {
      const saved = window.sessionStorage.getItem(key);
      const value = Number(saved);
      return saved && isPeriod(value) ? value : null;
    } catch {
      return null;
    }
  });

  const selectPeriod = useCallback((value: number) => {
    if (!isPeriod(value)) return;
    setPeriod(value);
    try {
      window.sessionStorage.setItem(key, String(value));
    } catch {
      // Keep the selector usable when browser storage is unavailable.
    }
  }, [key]);

  return [period, selectPeriod] as const;
}
