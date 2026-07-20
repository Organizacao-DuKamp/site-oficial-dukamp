import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = {
  expanded: boolean;
  toggle: () => void;
  setExpanded: (v: boolean) => void;
};

const QuotesPanelCtx = createContext<Ctx | null>(null);

export function QuotesPanelProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <QuotesPanelCtx.Provider
      value={{ expanded, setExpanded, toggle: () => setExpanded((v) => !v) }}
    >
      {children}
    </QuotesPanelCtx.Provider>
  );
}

export function useQuotesPanel() {
  const ctx = useContext(QuotesPanelCtx);
  if (!ctx) return { expanded: false, toggle: () => {}, setExpanded: () => {} };
  return ctx;
}
