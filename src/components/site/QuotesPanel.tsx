import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, X, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: isUsd ? 4 : 2,
  }).format(n);
}

function QuoteCard({ item }: { item: SpQuote }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {item.unit}
          </div>
          <div className="text-sm font-bold text-foreground leading-tight truncate">
            {item.name}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" /> {item.region}
          </div>
        </div>
        {item.available && item.media != null && (
          <div className="text-right">
            <div className="text-[9px] uppercase text-muted-foreground">Média</div>
            <div className="text-lg font-extrabold tabular-nums text-primary leading-none">
              {fmt(item.media, item.unit)}
            </div>
          </div>
        )}
      </div>

      {item.available ? (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="rounded-md bg-red-500/10 px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase text-red-700 dark:text-red-400 font-semibold">
              Mínima
            </div>
            <div className="text-xs font-bold tabular-nums text-foreground">
              {fmt(item.min, item.unit)}
            </div>
          </div>
          <div className="rounded-md bg-emerald-500/10 px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase text-emerald-700 dark:text-emerald-400 font-semibold">
              Máxima
            </div>
            <div className="text-xs font-bold tabular-nums text-foreground">
              {fmt(item.max, item.unit)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-muted/50 px-2 py-2 text-center text-[11px] text-muted-foreground">
          Sem cotação no momento.
        </div>
      )}

      <div className="mt-2 text-[9px] text-muted-foreground truncate">
        {item.source}
        {item.samples > 1 ? ` · ${item.samples} praças` : ""}
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
    return list;
  }, [data]);

  const [selected, setSelected] = useState<string>("__auto__");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (selected !== "__auto__" || ordered.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ordered.length), 4000);
    return () => clearInterval(t);
  }, [selected, ordered.length]);

  useEffect(() => {
    if (idx >= ordered.length) setIdx(0);
  }, [ordered.length, idx]);

  const current =
    selected === "__auto__"
      ? ordered[idx]
      : ordered.find((i) => i.key === selected);

  return (
    <div className="rounded-xl border bg-card shadow-lg overflow-hidden w-[280px]">
      <div className="px-3 py-2 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-xs leading-tight truncate">
              Cotações SP
            </div>
            <div className="text-[9px] text-muted-foreground truncate">
              {selected === "__auto__" ? "rotação automática" : "fixado"}
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

      <div className="p-2 border-b bg-muted/20">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__auto__">Rotação automática (4s)</SelectItem>
            {ordered.map((i) => (
              <SelectItem key={i.key} value={i.key}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="h-32 rounded-lg bg-muted/40 animate-pulse" />
        ) : isError || !current ? (
          <div className="p-3 text-[11px] text-muted-foreground text-center">
            Não foi possível carregar.{" "}
            <button
              className="text-primary hover:underline"
              onClick={() => refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <QuoteCard item={current} />
        )}

        {selected === "__auto__" && ordered.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1">
            {ordered.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === idx ? "w-4 bg-primary" : "w-1 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
