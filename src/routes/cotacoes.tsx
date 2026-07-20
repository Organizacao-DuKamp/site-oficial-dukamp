import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Activity } from "lucide-react";
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
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMarketQuotesByState, type IndicatorRegions } from "@/lib/quotes.functions";

export const Route = createFileRoute("/cotacoes")({
  head: () => ({
    meta: [
      { title: "Painel de Cotações — Dukamp" },
      {
        name: "description",
        content:
          "Painel de cotações do boi gordo, vaca gorda, novilha e boi China por estado, com gráficos e filtro.",
      },
    ],
  }),
  component: CotacoesPage,
});

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

  const avg =
    rows.length > 0 ? rows.reduce((s, r) => s + r.price, 0) / rows.length : null;
  const max = rows.length ? Math.max(...rows.map((r) => r.price)) : null;
  const min = rows.length ? Math.min(...rows.map((r) => r.price)) : null;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-sm">{indicator.name}</div>
          <div className="text-xs text-muted-foreground">
            {indicator.unit} · {indicator.source}
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "praça" : "praças"}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">
          Sem dados para esta seleção.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 p-3 border-b bg-background text-center">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Mínima</div>
              <div className="text-sm font-semibold tabular-nums">{fmtBRL(min)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Média</div>
              <div className="text-sm font-semibold tabular-nums text-primary">
                {fmtBRL(avg)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Máxima</div>
              <div className="text-sm font-semibold tabular-nums">{fmtBRL(max)}</div>
            </div>
          </div>

          <div className="p-3" style={{ height: Math.max(180, rows.length * 28 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="region"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="price" fill="#dc2626" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, formatter: (v: number) => fmtBRL(v) }}>
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

function CotacoesPage() {
  const fetchFn = useServerFn(getMarketQuotesByState);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["quotes-by-state"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
  });

  const [state, setState] = useState<string>("__all__");

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Painel de Cotações
              </h1>
              <p className="text-xs text-muted-foreground">
                Preços por estado · atualizado{" "}
                {data?.fetchedAt
                  ? new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    }).format(new Date(data.fetchedAt))
                  : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-[220px]">
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os estados</SelectItem>
                  {data?.states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar"
            >
              <RefreshCw className={isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="rounded-lg border p-6 text-sm text-muted-foreground">
            Não foi possível carregar as cotações.{" "}
            <button className="text-primary hover:underline" onClick={() => refetch()}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.indicators.map((ind) => (
              <IndicatorCard key={ind.key} indicator={ind} filterState={state} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
