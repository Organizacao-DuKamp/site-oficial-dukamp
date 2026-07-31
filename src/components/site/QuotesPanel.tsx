import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { Activity, RefreshCw, X } from "lucide-react";
import { getSpQuotes, type SpQuote } from "@/lib/quotes.functions";
import { useQuotesPanel } from "@/lib/quotes-panel";

const ROTATION_ORDER = [
  "boi_gordo",
  "boi_china",
  "usd",
  "soja",
  "milho",
  "vaca_gorda",
  "novilha",
];

function fmt(n: number | null, unit: string) {
  if (n == null) return "—";
  const isUsd = unit.includes("US$");
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: isUsd ? 4 : 2,
  }).format(n);
}

function QuoteRow({ item }: { item: SpQuote }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-1 px-2 py-1.5 border-b last:border-b-0 hover:bg-muted/40 transition-colors">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold leading-tight truncate text-foreground">
          {item.name}
        </div>
        <div className="text-[9px] text-muted-foreground truncate">
          {item.unit} · {item.region}
        </div>
      </div>
      <div className="w-[68px] text-right text-[11px] font-bold tabular-nums text-primary">
        {item.available ? fmt(item.price, item.unit) : "—"}
      </div>
    </div>
  );
}

export function QuotesPanel() {
  const { setExpanded } = useQuotesPanel();
  const fetchFn = useServerFn(getSpQuotes);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["sp-quotes"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
  });

  const ordered = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map(items.map((i) => [i.key, i]));
    const list: SpQuote[] = [];
    for (const k of ROTATION_ORDER) {
      const it = map.get(k);
      if (it) list.push(it);
    }
    for (const it of items) if (!ROTATION_ORDER.includes(it.key)) list.push(it);
    return list;
  }, [data]);

  return (
    <div className="rounded-xl border bg-card shadow-lg overflow-hidden w-[290px]">
      <div className="px-3 py-2 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-xs leading-tight truncate">
              Cotações SP
            </div>
            <div className="text-[9px] text-muted-foreground truncate">
              {ordered.length} indicadores
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar"
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            aria-label="Fechar"
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-2 space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : isError || ordered.length === 0 ? (
        <div className="p-4 text-[11px] text-muted-foreground text-center">
          Não foi possível carregar.{" "}
          <button className="text-primary hover:underline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-1 px-2 py-1 border-b bg-muted/30 text-[9px] uppercase tracking-wider text-muted-foreground">
            <div>Indicador</div>
            <div className="w-[68px] text-right">Preço</div>
          </div>
          <div className="max-h-[320px] overflow-y-auto overscroll-contain">
            {ordered.map((item) => (
              <QuoteRow key={item.key} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
