import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Activity, RefreshCw, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMarketQuotesByState, type IndicatorRegions } from "@/lib/quotes.functions";
import { useQuotesPanel } from "@/lib/quotes-panel";

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(n);
}

function IndicatorCard({
  indicator,
  filterState,
}: {
  indicator: IndicatorRegions;
  filterState: string;
}) {
  const rows = useMemo(() => {
    if (filterState === "__all__") return indicator.rows;
    return indicator.rows.filter((r) => r.region === filterState);
  }, [indicator.rows, filterState]);

  const avg = rows.length ? rows.reduce((s, r) => s + r.price, 0) / rows.length : null;
  const max = rows.length ? Math.max(...rows.map((r) => r.price)) : null;
  const min = rows.length ? Math.min(...rows.map((r) => r.price)) : null;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{indicator.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {indicator.unit} · {indicator.source}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground shrink-0">
          {rows.length} {rows.length === 1 ? "praça" : "praças"}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-4 text-xs text-muted-foreground text-center">Sem dados.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1 p-2 border-b bg-background text-center">
            <div>
              <div className="text-[9px] uppercase text-muted-foreground">Mín</div>
              <div className="text-xs font-semibold tabular-nums">{fmtBRL(min)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-muted-foreground">Média</div>
              <div className="text-xs font-semibold tabular-nums text-primary">{fmtBRL(avg)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-muted-foreground">Máx</div>
              <div className="text-xs font-semibold tabular-nums">{fmtBRL(max)}</div>
            </div>
          </div>
          <div className="p-2" style={{ height: Math.max(160, rows.length * 24 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="region" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="price"
                  fill="#dc2626"
                  radius={[0, 4, 4, 0]}
                  label={{ position: "right", fontSize: 10, formatter: (v: number) => fmtBRL(v) }}
                >
                  {rows.map((r) => (
                    <Cell
                      key={r.region}
                      fill={avg != null && r.price >= avg ? "#16a34a" : "#dc2626"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

export function QuotesPanel() {
  const { setExpanded } = useQuotesPanel();
  const fetchFn = useServerFn(getMarketQuotesByState);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["quotes-by-state"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
  });
  const [state, setState] = useState("__all__");

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col max-h-[85vh]">

      <div className="px-3 py-2 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">Painel de Cotações</div>
            <div className="text-[10px] text-muted-foreground truncate">Preços por estado</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            aria-label="Fechar painel"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b bg-muted/20">
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os estados</SelectItem>
            {data?.states.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 rounded-xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="text-xs text-muted-foreground">
            Não foi possível carregar.{" "}
            <button className="text-primary hover:underline" onClick={() => refetch()}>Tentar novamente</button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.indicators.map((ind) => (
              <IndicatorCard key={ind.key} indicator={ind} filterState={state} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
