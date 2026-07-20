import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ArrowDownRight, ArrowUpRight, Maximize2, Beef, DollarSign, Minus, RefreshCw, Ship } from "lucide-react";
import { getMarketQuotes, type QuoteItem } from "@/lib/quotes.functions";
import { useQuotesPanel } from "@/lib/quotes-panel";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  usd: DollarSign,
  boi_china: Ship,
  boi_gordo: Beef,
  vaca_gorda: Beef,
  novilha: Beef,
};

function fmtBRL(n: number | null | undefined, max = 4) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: max,
  }).format(n);
}

function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "—";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `há ${days} d`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(d);
}

function Sparkline({ points, up }: { points: number[]; up: boolean | null }) {
  if (points.length < 2) {
    return <div className="h-6 w-14 rounded bg-muted/40" aria-hidden />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 56;
  const h = 22;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = up == null ? "hsl(var(--muted-foreground))" : up ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)";
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChangeBadge({ item }: { item: QuoteItem }) {
  if (!item.available || item.change == null || item.changePct == null) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />
        estável
      </span>
    );
  }
  const up = item.change > 0;
  const cls = up
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : "bg-red-500/10 text-red-600 dark:text-red-400";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {up ? "+" : ""}
      {item.changePct.toFixed(2)}%
    </span>
  );
}

export function QuotesWidget() {
  const { toggle } = useQuotesPanel();
  const fetchQuotes = useServerFn(getMarketQuotes);
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["market-quotes"],
    queryFn: () => fetchQuotes(),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const availableCount = data?.items.filter((i) => i.available).length ?? 0;

  return (
    <div className="rounded-xl border bg-gradient-to-b from-card to-card/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative px-3 py-2 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
              <Activity className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs leading-tight truncate">Cotações do Mercado</div>
              <div className="text-[9px] text-muted-foreground leading-tight">
                {isLoading ? "Carregando…" : `${availableCount}/${data?.items.length ?? 0} ao vivo`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggle}
              aria-label="Expandir painel de cotações"
              title="Expandir painel de cotações"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar cotações"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-1.5 max-h-[100px] overflow-y-auto">


        {isLoading ? (
          <ul className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-2 w-14 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
              </li>
            ))}
          </ul>
        ) : isError || !data ? (
          <div className="p-3 text-xs text-muted-foreground">
            Não foi possível carregar as cotações.{" "}
            <button onClick={() => refetch()} className="text-primary hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <ul className="space-y-1">
            {data.items.map((item) => {
              const Icon = ICONS[item.key] ?? Activity;
              const history = data.history[item.key] ?? [];
              const up = item.change == null ? null : item.change > 0;
              return (
                <li
                  key={item.key}
                  className="group flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                        item.available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                        <span className="text-[9px] text-muted-foreground shrink-0">{item.unit}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {item.region ?? item.source} · {fmtRelative(item.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Sparkline points={history} up={up} />
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold tabular-nums leading-tight ${
                          item.available ? "text-foreground" : "text-muted-foreground/60 italic font-normal text-[11px]"
                        }`}
                      >
                        {item.available ? fmtBRL(item.price) : "indisponível"}
                      </div>
                      <div className="mt-0.5">
                        <ChangeBadge item={item} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${isFetching ? "bg-amber-400 animate-ping" : "bg-emerald-500"} opacity-75`} />
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isFetching ? "bg-amber-500" : "bg-emerald-500"}`} />
          </span>
          {isFetching ? "atualizando…" : "ao vivo"}
        </span>
        <span>
          {dataUpdatedAt
            ? `atualizado ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dataUpdatedAt))}`
            : "—"}
        </span>
      </div>
    </div>
  );
}
