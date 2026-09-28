import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { marginPercent, sumMargins, type MarginValues } from "@/lib/erp-margin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Location = "monte-aprazivel" | "sao-jose-do-rio-preto";
type SellerMargin = {
  code: string;
  name: string;
  region: string | null;
  location: Location | null;
  locationName: string | null;
  active: boolean;
  totals: MarginValues;
  covered: string[];
  missingBaseline: string[];
  lastReport: string | null;
};
type Result = { from: string; to: string; weekdays: number; sellers: SellerMargin[] };
const cities: Record<Location, string> = {
  "monte-aprazivel": "Monte Aprazível",
  "sao-jose-do-rio-preto": "São José do Rio Preto",
};
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const numeric = (value: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
async function api(path: string, options?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Falha ao consultar margem de venda.");
  return payload;
}
function exportCsv(rows: SellerMargin[], totals: MarginValues, days: number) {
  const columns = [
    "Código",
    "Vendedor",
    "Local",
    "Região",
    "Venda",
    "Devolução",
    "Custo",
    "Margem bruta",
    "Margem %",
    "Comissão",
    "Sacarias",
    "Balcão",
    "Tonelagem",
    "Média venda/dia útil",
  ];
  const cell = (value: string | number) =>
    `"${(typeof value === "number" ? value.toFixed(2).replace(".", ",") : value).toString().replace(/"/g, '""')}"`;
  const line = (label: string, values: MarginValues, code = "", location = "", region = "") =>
    [
      code,
      label,
      location,
      region,
      values.total_venda,
      values.devolucao,
      values.total_custo,
      values.margem_bruta,
      marginPercent(values),
      values.comissao_representante,
      values.sacarias,
      values.balcao,
      values.tonelagem,
      days ? values.total_venda / days : 0,
    ]
      .map(cell)
      .join(";");
  const csv = [
    columns.map(cell).join(";"),
    ...rows.map((row) =>
      line(row.name, row.totals, row.code, row.locationName ?? "Sem local", row.region ?? ""),
    ),
    line("TOTAL", totals),
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "margem-venda-dukamp.csv";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ErpSalesMargin({ onBack }: { onBack: () => void }) {
  const today = localToday();
  const [draftFrom, setDraftFrom] = useState(`${today.slice(0, 7)}-01`);
  const [draftTo, setDraftTo] = useState(today);
  const [period, setPeriod] = useState({ from: draftFrom, to: draftTo });
  const [location, setLocation] = useState<Location | "todos">("todos");
  const [search, setSearch] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [customDays, setCustomDays] = useState<string>("");
  const queryClient = useQueryClient();
  const query = useQuery<Result>({
    queryKey: ["erp-margin-venda", period],
    queryFn: () => api(`/api/admin/erp-margin-venda?${new URLSearchParams(period)}`),
  });
  const saveLocation = useMutation({
    mutationFn: ({ sellerCode, city }: { sellerCode: string; city: Location | null }) =>
      api("/api/admin/erp-margin-venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerCode, location: city }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-margin-venda"] });
      toast.success("Local do vendedor atualizado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Falha ao salvar o local."),
  });
  const days = customDays === "" ? (query.data?.weekdays ?? 0) : Number(customDays);
  const sellers = useMemo(
    () =>
      (query.data?.sellers ?? []).filter(
        (seller) =>
          (location === "todos" || seller.location === location) &&
          `${seller.code} ${seller.name} ${seller.region ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")),
      ),
    [query.data, location, search],
  );
  const included = sellers.filter(
    (seller) =>
      !excluded.includes(seller.code) && seller.covered.length && !seller.missingBaseline.length,
  );
  const totals = sumMargins(included.map((seller) => seller.totals));
  const incomplete = sellers.filter((seller) => seller.missingBaseline.length);
  const unassigned = (query.data?.sellers ?? []).filter((seller) => !seller.location);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Consulta de margem e venda</h3>
          <p className="text-sm text-muted-foreground">
            Relatórios importados do ERP, agrupados pelo código do vendedor.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (draftTo < draftFrom)
            return toast.error("A data final deve ser igual ou posterior à inicial.");
          setPeriod({ from: draftFrom, to: draftTo });
          setCustomDays("");
        }}
      >
        <label className="text-sm font-medium">
          Data inicial
          <Input
            className="mt-1"
            type="date"
            required
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Data final
          <Input
            className="mt-1"
            type="date"
            required
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Local
          <select
            className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={location}
            onChange={(event) => setLocation(event.target.value as Location | "todos")}
          >
            <option value="todos">Todos os locais</option>
            <option value="monte-aprazivel">Monte Aprazível</option>
            <option value="sao-jose-do-rio-preto">São José do Rio Preto</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Dias úteis no período
          <Input
            className="mt-1"
            type="number"
            min="1"
            max="367"
            value={customDays === "" ? (query.data?.weekdays ?? "") : customDays}
            onChange={(event) => setCustomDays(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit">Consultar período</Button>
          <Button
            type="button"
            variant="outline"
            disabled={!included.length}
            onClick={() => exportCsv(included, totals, days)}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <span className="text-xs text-muted-foreground">
            Dias úteis estimados de segunda a sexta; ajuste para feriados. A mudança afeta só a
            média diária.
          </span>
        </div>
      </form>
      {query.isPending ? (
        <p className="rounded-xl border p-5">Carregando relatórios...</p>
      ) : query.isError ? (
        <p role="alert" className="rounded-xl border border-destructive p-5 text-destructive">
          {query.error.message}
        </p>
      ) : (
        <>
          {unassigned.length > 0 && (
            <p className="rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              {unassigned.length} vendedor(es) sem local confirmado aparecem em “Todos os locais”.
              Defina o local na tabela para incluí-los no filtro da cidade. A região de atuação
              continua independente.
            </p>
          )}
          {incomplete.length > 0 && (
            <p className="rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              {incomplete.length} vendedor(es) têm relatório acumulado sem base anterior para o
              início escolhido. Esses valores não entram nos totais; consulte desde o primeiro dia
              do mês ou importe um relatório anterior.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Vendas", money(totals.total_venda)],
              ["Margem bruta", money(totals.margem_bruta)],
              ["Margem", `${numeric(marginPercent(totals))}%`],
              ["Média por dia útil", money(days > 0 ? totals.total_venda / days : 0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <strong className="mt-1 block text-xl">{value}</strong>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-56 flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar vendedor ou código"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {included.length} vendedor(es) incluídos · {days} dias úteis
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Incluir</th>
                  <th className="p-3">Código / vendedor</th>
                  <th className="p-3">Local da DuKamp</th>
                  <th className="p-3">Região</th>
                  <th className="p-3 text-right">Vendas</th>
                  <th className="p-3 text-right">Devoluções</th>
                  <th className="p-3 text-right">Custo</th>
                  <th className="p-3 text-right">Margem bruta</th>
                  <th className="p-3 text-right">Margem %</th>
                  <th className="p-3 text-right">Ton.</th>
                  <th className="p-3">Último relatório</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sellers.map((seller) => (
                  <tr key={seller.code} className="hover:bg-muted/30">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={`Incluir ${seller.name}`}
                        checked={!excluded.includes(seller.code)}
                        onChange={(event) =>
                          setExcluded((list) =>
                            event.target.checked
                              ? list.filter((code) => code !== seller.code)
                              : [...list, seller.code],
                          )
                        }
                      />
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-muted-foreground">{seller.code}</span>
                      <br />
                      <strong>{seller.name}</strong>
                      {!seller.active && (
                        <span className="ml-2 text-xs text-muted-foreground">Inativo</span>
                      )}
                    </td>
                    <td className="p-3">
                      <select
                        aria-label={`Local de ${seller.name}`}
                        className="max-w-48 rounded-md border bg-background p-1 text-xs"
                        value={seller.location ?? ""}
                        disabled={saveLocation.isPending}
                        onChange={(event) =>
                          saveLocation.mutate({
                            sellerCode: seller.code,
                            city: (event.target.value || null) as Location | null,
                          })
                        }
                      >
                        <option value="">Sem local</option>
                        {Object.entries(cities).map(([key, city]) => (
                          <option key={key} value={key}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-muted-foreground">{seller.region || "—"}</td>
                    <td className="p-3 text-right font-medium">
                      {seller.covered.length && !seller.missingBaseline.length
                        ? money(seller.totals.total_venda)
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {seller.covered.length && !seller.missingBaseline.length
                        ? money(seller.totals.devolucao)
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {seller.covered.length && !seller.missingBaseline.length
                        ? money(seller.totals.total_custo)
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {seller.covered.length && !seller.missingBaseline.length
                        ? money(seller.totals.margem_bruta)
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {seller.covered.length && !seller.missingBaseline.length
                        ? `${numeric(marginPercent(seller.totals))}%`
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {seller.covered.length && !seller.missingBaseline.length
                        ? numeric(seller.totals.tonelagem, 3)
                        : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                      {seller.missingBaseline.length
                        ? "Falta base anterior"
                        : seller.lastReport
                          ? seller.lastReport.split("-").reverse().join("/")
                          : "Sem dados"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!sellers.length && (
              <p className="p-5 text-sm text-muted-foreground">
                Nenhum vendedor encontrado neste filtro.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Fonte: relatórios de margem importados. Os valores seguem a data de fechamento
            disponível; relatórios acumulados não são somados entre si. A margem percentual usa
            margem bruta ÷ venda total.
          </p>
        </>
      )}
    </div>
  );
}
