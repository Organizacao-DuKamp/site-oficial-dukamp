import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getMarketQuotes, type QuoteItem } from "@/lib/quotes.functions";
import { QuotesPanel } from "./QuotesPanel";

function fmtBRL(n: number | null | undefined, max = 2) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: max,
  }).format(n);
}

function useRotatingIndex(length: number, intervalMs: number) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(t);
  }, [length, intervalMs]);
  return idx;
}

function ItemPill({ item }: { item: QuoteItem }) {
  const up = item.change != null && item.change > 0;
  const down = item.change != null && item.change < 0;
  const color = up
    ? "text-emerald-300"
    : down
      ? "text-red-300"
      : "text-white/85";
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  return (
    <div key={item.key} className="flex items-center gap-2 animate-fade-in">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/70 truncate max-w-[140px]">
        {item.name}
      </span>
      <span className={`inline-flex items-center gap-1 font-bold tabular-nums text-sm ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {item.available ? fmtBRL(item.price) : "—"}
        {item.changePct != null && item.available && (
          <span className="text-[10px] font-semibold opacity-90">
            ({up ? "+" : ""}
            {item.changePct.toFixed(2)}%)
          </span>
        )}
      </span>
    </div>
  );
}

export function NavbarQuoteTicker() {
  const [open, setOpen] = useState(false);
  const fetchQuotes = useServerFn(getMarketQuotes);
  const { data, isLoading } = useQuery({
    queryKey: ["market-quotes"],
    queryFn: () => fetchQuotes(),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const items = (data?.items ?? []).filter((i) => i.available && i.price != null);
  const idx = useRotatingIndex(items.length, 4000);
  const current = items[idx];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/15 px-3 py-1.5 transition-colors"
          aria-label="Abrir painel de cotações"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white shrink-0">
            <Activity className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-[180px] max-w-[260px] overflow-hidden">
            {isLoading || !current ? (
              <span className="text-xs text-white/70">Carregando cotações…</span>
            ) : (
              <ItemPill item={current} />
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-white/70 group-hover:text-white transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 w-auto border-0 bg-transparent shadow-none"
      >
        <QuotesPanel />
      </PopoverContent>
    </Popover>
  );
}
