import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileDown, FileUp, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  allowedStockName, downloadStockFile, parseStockCsv, stockToCsv, stockToPdf,
  type StockItem,
} from "@/lib/dukamp-stock-export";

const db = supabase as any;
const PAGE_SIZE = 50;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type NumericField =
  | "stock"
  | "cost"
  | "total_cost"
  | "sale_price"
  | "total_sale"
  | "avg_sales"
  | "avg_total"
  | "minimum";

const NUMERIC_FILTERS: Array<{ value: NumericField; label: string }> = [
  { value: "stock", label: "Saldo" },
  { value: "cost", label: "Custo" },
  { value: "total_cost", label: "TT custo" },
  { value: "sale_price", label: "Preço venda" },
  { value: "total_sale", label: "TT venda" },
  { value: "avg_sales", label: "Média VD" },
  { value: "avg_total", label: "TT média" },
  { value: "minimum", label: "Mínimo" },
];

function parseFilterNumber(value: string): number | null {
  const clean = value.trim().replace(/\s/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadStock(): Promise<StockItem[]> {
  const all: StockItem[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db.from("dukamp_stock_items")
      .select("code,name,unit,stock,cost,total_cost,sale_price,total_sale,avg_sales,avg_total,minimum,brand,supplier_code,updated_at")
      .order("name", { ascending: true })
      .order("code", { ascending: true })
      .range(start, start + 499);
    if (error) throw error;
    all.push(...(data ?? []));
    if ((data ?? []).length < 500) break;
  }
  return all.filter((item) => allowedStockName(item.name));
}

function searchKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function DukampStock() {
  const queryClient = useQueryClient();
  const stock = useQuery({ queryKey: ["admin", "dukamp-stock"], queryFn: loadStock });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [importRows, setImportRows] = useState<StockItem[] | null>(null);
  const [importFile, setImportFile] = useState("");
  const [importing, setImporting] = useState(false);
  const [alphabeticalOrder, setAlphabeticalOrder] = useState<"az" | "za">("az");
  const [numericField, setNumericField] = useState<NumericField>("stock");
  const [numericOperator, setNumericOperator] = useState<"gt" | "lt">("gt");
  const [numericValue, setNumericValue] = useState("");

  const rows = stock.data ?? [];
  const filtered = useMemo(() => {
    const term = searchKey(search.trim());
    const threshold = parseFilterNumber(numericValue);

    const result = rows.filter((row) => {
      if (term && !searchKey(`${row.code} ${row.name} ${row.brand ?? ""}`).includes(term)) {
        return false;
      }

      if (threshold !== null) {
        const current = row[numericField];
        if (current == null) return false;
        if (numericOperator === "gt" && !(current > threshold)) return false;
        if (numericOperator === "lt" && !(current < threshold)) return false;
      }

      return true;
    });

    return [...result].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, "pt-BR", {
        sensitivity: "base",
        numeric: true,
      });
      return alphabeticalOrder === "az" ? comparison : -comparison;
    });
  }, [rows, search, alphabeticalOrder, numericField, numericOperator, numericValue]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);
  const chosen = rows.filter((row) => selected.has(row.code));
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.code));

  function toggle(code: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function togglePage() {
    setSelected((previous) => {
      const next = new Set(previous);
      if (allPageSelected) pageRows.forEach((row) => next.delete(row.code));
      else pageRows.forEach((row) => next.add(row.code));
      return next;
    });
  }

  function exportFile(format: "csv" | "pdf") {
    if (chosen.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      downloadStockFile(stockToCsv(chosen), `estoque-dukamp-${date}.csv`, "text/csv;charset=utf-8");
    } else {
      downloadStockFile(stockToPdf(chosen), `estoque-dukamp-${date}.pdf`);
    }
  }

  async function readImport(file?: File) {
    setImportRows(null);
    setImportFile("");
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error("Selecione um arquivo CSV exportado desta página.");
      return;
    }
    try {
      const parsed = parseStockCsv(await file.text());
      if (parsed.length === 0) throw new Error("O arquivo não contém produtos.");
      setImportRows(parsed);
      setImportFile(file.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o CSV.");
    }
  }

  async function applyImport() {
    if (!importRows?.length || importing) return;
    setImporting(true);
    let processed = 0;
    try {
      for (let i = 0; i < importRows.length; i += 100) {
        const batch = importRows.slice(i, i + 100).map((row) => ({
          ...row, updated_at: new Date().toISOString(),
        }));
        const { error } = await db.from("dukamp_stock_items").upsert(batch, { onConflict: "code" });
        if (error) throw error;
        processed += batch.length;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "dukamp-stock"] });
      toast.success(`${processed} produtos atualizados no Estoque DuKamp.`);
      setImportRows(null);
      setImportFile("");
    } catch (error) {
      toast.error(`Importação interrompida após ${processed} produtos: ${error instanceof Error ? error.message : "erro desconhecido"}. Você pode importar o mesmo arquivo novamente.`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Estoque DuKamp</h2>
        <p className="text-sm text-muted-foreground">
          Relatório de custo e venda por código. Produtos com XX ou ZZ no nome são excluídos.
          Esta lista é separada dos produtos da loja.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[230px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Pesquisar no Estoque DuKamp"
              className="pl-9"
              placeholder="Pesquise por nome, código ou marca"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length} produtos · {chosen.length} selecionados
          </span>
          <Button variant="outline" size="sm" disabled={!chosen.length} onClick={() => exportFile("csv")}>
            <Download className="mr-2 h-4 w-4" /> Baixar CSV
          </Button>
          <Button variant="outline" size="sm" disabled={!chosen.length} onClick={() => exportFile("pdf")}>
            <FileDown className="mr-2 h-4 w-4" /> Baixar PDF
          </Button>
        </div>
        <div className="rounded-md border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros e ordenação
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Ordem alfabética</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={alphabeticalOrder}
                onChange={(event) => {
                  setAlphabeticalOrder(event.target.value as "az" | "za");
                  setPage(1);
                }}
              >
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Filtrar campo</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={numericField}
                onChange={(event) => {
                  setNumericField(event.target.value as NumericField);
                  setPage(1);
                }}
              >
                {NUMERIC_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Condição</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={numericOperator}
                onChange={(event) => {
                  setNumericOperator(event.target.value as "gt" | "lt");
                  setPage(1);
                }}
              >
                <option value="gt">Maior que</option>
                <option value="lt">Menor que</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Valor</span>
              <Input
                inputMode="decimal"
                placeholder="Ex.: 100 ou 100,50"
                value={numericValue}
                onChange={(event) => {
                  setNumericValue(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!numericValue && alphabeticalOrder === "az" && !search}
              onClick={() => {
                setSearch("");
                setAlphabeticalOrder("az");
                setNumericField("stock");
                setNumericOperator("gt");
                setNumericValue("");
                setPage(1);
              }}
            >
              <X className="mr-2 h-4 w-4" /> Limpar filtros
            </Button>
            {numericValue && parseFilterNumber(numericValue) === null && (
              <span className="text-xs text-destructive">Digite um valor numérico válido.</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!filtered.length} onClick={() => setSelected((prev) => new Set([...prev, ...filtered.map((item) => item.code)]))}>
            Selecionar todos os resultados
          </Button>
          <Button variant="ghost" size="sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>
            Limpar seleção
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[1250px] text-xs">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="p-3"><input aria-label="Selecionar página" type="checkbox" checked={allPageSelected} onChange={togglePage} /></th>
              {["Código", "Descrição", "UN", "Saldo", "Custo", "TT custo", "Preço venda", "TT venda", "Média VD", "TT média", "Mínimo", "Marca", "Fornec."].map((header) => (
                <th key={header} className="p-3 whitespace-nowrap">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((item) => (
              <tr key={item.code} className="border-t hover:bg-muted/40">
                <td className="p-3"><input aria-label={`Selecionar ${item.name}`} type="checkbox" checked={selected.has(item.code)} onChange={() => toggle(item.code)} /></td>
                <td className="p-3 font-mono">{item.code}</td>
                <td className="p-3 min-w-56 font-medium">{item.name}</td>
                <td className="p-3">{item.unit}</td>
                <td className="p-3 text-right">{number.format(item.stock)}</td>
                <td className="p-3 text-right">{item.cost == null ? "—" : money.format(item.cost)}</td>
                <td className="p-3 text-right">{item.total_cost == null ? "—" : money.format(item.total_cost)}</td>
                <td className="p-3 text-right">{item.sale_price == null ? "—" : money.format(item.sale_price)}</td>
                <td className="p-3 text-right">{item.total_sale == null ? "—" : money.format(item.total_sale)}</td>
                <td className="p-3 text-right">{item.avg_sales == null ? "—" : number.format(item.avg_sales)}</td>
                <td className="p-3 text-right">{item.avg_total == null ? "—" : money.format(item.avg_total)}</td>
                <td className="p-3 text-right">{item.minimum == null ? "—" : number.format(item.minimum)}</td>
                <td className="p-3">{item.brand || "—"}</td>
                <td className="p-3 font-mono">{item.supplier_code || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {stock.isPending && <p className="p-5 text-sm">Carregando estoque...</p>}
        {stock.isError && (
          <div className="p-5 text-sm" role="alert">
            Não foi possível carregar o Estoque DuKamp. <Button size="sm" variant="outline" onClick={() => void stock.refetch()}>Tentar novamente</Button>
          </div>
        )}
        {stock.isSuccess && filtered.length === 0 && <p className="p-5 text-sm">Nenhum produto encontrado.</p>}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Página {Math.min(page, pageCount)} de {pageCount}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((v) => v + 1)}>Próxima</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold"><FileUp className="h-5 w-5" /> Importar atualização</div>
        <p className="text-sm text-muted-foreground">
          Baixe o CSV dos itens selecionados, edite no Excel e importe o CSV aqui.
          O código identifica cada produto. Produtos ausentes do arquivo permanecem como estão.
        </p>
        <Input
          type="file" accept=".csv,text/csv" aria-label="Importar CSV do Estoque DuKamp"
          onChange={(event) => {
            void readImport(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {importRows && (
          <div className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm">
            <span><strong>{importFile}</strong> · {importRows.length} produtos · {importRows.filter((item) => !rows.some((old) => old.code === item.code)).length} novos</span>
            <Button size="sm" disabled={importing} onClick={() => void applyImport()}>
              {importing ? "Atualizando..." : "Aplicar atualização"}
            </Button>
            <Button size="sm" variant="ghost" disabled={importing} onClick={() => { setImportRows(null); setImportFile(""); }}>Cancelar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
