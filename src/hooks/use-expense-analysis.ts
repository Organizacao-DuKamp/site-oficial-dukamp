import { useState } from "react";
import type { ExpenseAnalysisSelection } from "@/lib/expense-analysis-period";

const key = "dukamp-expenses-analysis";
const initial: ExpenseAnalysisSelection = { mode: "month", year: 0, from: "", to: "" };
export function useExpenseAnalysis() {
  const [selection, setSelection] = useState<ExpenseAnalysisSelection>(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(key) || "null");
      return saved && ["month", "year", "custom"].includes(saved.mode) && Number.isInteger(saved.year) && typeof saved.from === "string" && typeof saved.to === "string" ? saved : initial;
    } catch { return initial; }
  });
  const update = (patch: Partial<ExpenseAnalysisSelection>) => {
    const next = { ...selection, ...patch };
    setSelection(next);
    try { window.sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  };
  return [selection, update] as const;
}
