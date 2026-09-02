import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, CheckCircle2, FileText, History, Loader2, RefreshCw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  parseSellerMarginPdf,
  type ParsedSellerMarginReport,
  type SellerMarginReportRow,
} from "@/lib/seller-margin-report";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vendas/atualizar-valores")({
  component: AtualizarValoresVendedores,
});

type ReportHistoryRow = {
  report_year: number;
  report_month: number;
  period_start: string;
  period_end: string;
  report_seller_code: string;
  report_seller_name: string;
  total_venda: number | string;
  margem_percentual: number | string;
  tonelagem: number | string;
  seller_user_id: string | null;
  source_file: string;
  updated_at: string;
};

type ImportResult = {
  periodStart: string;
  periodEnd: string;
  sourceFile: string;
  totalRows: number;
  linkedRows: number;
  unlinkedRows: Array<{ code: string; name: string }>;
  updatedRows: number;
  insertedRows: number;
  warnings: string[];
};

type HistoryGroup = {
  key: string;
  periodStart: string;
  periodEnd: string;
  sourceFile: string;
  rows: number;
  linkedRows: number;
  totalVenda: number;
  updatedAt: string;
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function money(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function percent(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "%";
}

function tons(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function dateBR(value: string): string {
  return new Date(value + "T12:00:00").toLocaleDateString("pt-BR");
}

function dateTimeBR(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", "Bearer " + token);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
}

async function loadHistory(): Promise<{ reports: ReportHistoryRow[] }> {
  return request<{ reports: ReportHistoryRow[] }>("/api/admin/seller-margin-reports");
}

async function importReport(
  file: File,
  report: ParsedSellerMarginReport,
): Promise<ImportResult> {
  return request<ImportResult>("/api/admin/seller-margin-reports", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      rows: report.rows,
    }),
  });
}

function groupHistory(reports: ReportHistoryRow[]): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>();

  for (const report of reports) {
    const key = [
      report.period_start,
      report.period_end,
      report.source_file,
    ].join("|");
    const current = groups.get(key);

    if (current) {
      current.rows += 1;
      current.linkedRows += report.seller_user_id ? 1 : 0;
      current.totalVenda += Number(report.total_venda || 0);
      if (new Date(report.updated_at).getTime() > new Date(current.updatedAt).getTime()) {
        current.updatedAt = report.updated_at;
      }
    } else {
      groups.set(key, {
        key,
        periodStart: report.period_start,
        periodEnd: report.period_end,
        sourceFile: report.source_file,
        rows: 1,
        linkedRows: report.seller_user_id ? 1 : 0,
        totalVenda: Number(report.total_venda || 0),
        updatedAt: report.updated_at,
      });
    }
  }

  return Array.from(groups.values())
    .sort((left, right) => {
      const dateOrder = right.periodStart.localeCompare(left.periodStart);
      return dateOrder || right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, 30);
}

function previewTotal(rows: SellerMarginReportRow[]): number {
  return rows.reduce((total, row) => total + row.totalVenda, 0);
}

function AtualizarValoresVendedores() {
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ["admin-seller-margin-reports"],
    queryFn: loadHistory,
  });

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSellerMarginReport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  async function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setParsed(null);
    setParseError(null);
    setResult(null);

    if (!nextFile) return;
    if (nextFile.size > 10 * 1024 * 1024) {
      setParseError("O PDF deve ter no máximo 10 MB.");
      return;
    }

    setParsing(true);
    try {
      setParsed(await parseSellerMarginPdf(nextFile));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Não foi possível ler o PDF.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!file || !parsed) return;
    if (totalDifference > 0.01) {
      toast.error("A soma dos vendedores não confere com o TOTAL do PDF. Confira o arquivo antes de atualizar.");
      return;
    }
    setImporting(true);
    setResult(null);

    try {
      const imported = await importReport(file, parsed);
      setResult(imported);
      await queryClient.invalidateQueries({ queryKey: ["admin-seller-margin-reports"] });
      toast.success(
        imported.updatedRows > 0
          ? imported.updatedRows + " vendedor(es) atualizado(s) no período."
          : imported.totalRows + " vendedor(es) importado(s) no período.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o relatório.");
    } finally {
      setImporting(false);
    }
  }

  const groups = groupHistory(history.data?.reports ?? []);
  const importedTotal = parsed ? previewTotal(parsed.rows) : 0;
  const totalDifference =
    parsed?.reportTotal === null || parsed?.reportTotal === undefined
      ? 0
      : Math.abs(parsed.reportTotal - importedTotal);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Atualizar valores dos vendedores</h1>
          <Badge variant="secondary">RELATÓRIO MARGEM VENDA</Badge>
        </div>
        <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
          Envie o PDF gerado pelo ERP para atualizar os valores dos vendedores no período
          informado no próprio relatório. O sistema lê o arquivo no navegador, mostra uma
          prévia e grava os dados no histórico do painel do vendedor.
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Importar relatório PDF</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O arquivo deve conter a tabela COD VEND e o período no título, como
              “RELATORIO MARGEM VENDA DE 01/08/26 ATE 31/08/26”.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
            disabled={parsing || importing}
          />
          <Button
            type="button"
            onClick={() => void handleImport()}
            disabled={!parsed || parsing || importing || totalDifference > 0.01}
            className="shrink-0"
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {importing ? "Atualizando..." : "Atualizar valores"}
          </Button>
        </div>

        {parsing && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lendo o PDF...
          </p>
        )}
        {parseError && (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {parseError}
          </p>
        )}
      </section>

      {parsed && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Prévia da importação</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Arquivo: {file?.name} · Período: {dateBR(parsed.periodStart)} a {dateBR(parsed.periodEnd)}
              </p>
            </div>
            <Badge variant="outline">{parsed.rows.length} vendedores encontrados</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total do PDF</div>
              <div className="mt-1 text-xl font-bold">{parsed.reportTotal === null ? "—" : money(parsed.reportTotal)}</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Soma dos vendedores</div>
              <div className="mt-1 text-xl font-bold">{money(importedTotal)}</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Período identificado</div>
              <div className="mt-1 text-xl font-bold">{MONTHS[Number(parsed.periodStart.slice(5, 7)) - 1]} {parsed.periodStart.slice(0, 4)}</div>
            </div>
          </div>

          {totalDifference > 0.01 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              A soma das linhas ({money(importedTotal)}) não confere com o TOTAL do PDF
              ({money(parsed.reportTotal ?? 0)}). Confira o arquivo antes de atualizar.
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Vendedor no PDF</th>
                  <th className="p-3 text-right">TOT_VENDA</th>
                  <th className="p-3 text-right">MARGEM</th>
                  <th className="p-3 text-right">TONELAG</th>
                  <th className="p-3 text-right">MR_BRUTA</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row) => (
                  <tr key={row.code} className="border-t">
                    <td className="p-3 font-mono">{row.code}</td>
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">{money(row.totalVenda)}</td>
                    <td className="p-3 text-right">{percent(row.margemPercentual)}</td>
                    <td className="p-3 text-right">{tons(row.tonelagem)}</td>
                    <td className="p-3 text-right">{money(row.margemBruta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Os campos completos do relatório também serão gravados, incluindo devoluções,
            custos, comissão e margens de aditivos, sacarias e balcão. Para o mesmo código
            e mês, a nova importação substitui os valores anteriores.
          </p>
        </section>
      )}

      {result && (
        <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-emerald-900">
            <CheckCircle2 className="h-5 w-5" /> Atualização concluída
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-background/80 p-3 text-sm">
              <div className="text-muted-foreground">Linhas processadas</div>
              <div className="text-xl font-bold">{result.totalRows}</div>
            </div>
            <div className="rounded-lg bg-background/80 p-3 text-sm">
              <div className="text-muted-foreground">Atualizadas</div>
              <div className="text-xl font-bold">{result.updatedRows}</div>
            </div>
            <div className="rounded-lg bg-background/80 p-3 text-sm">
              <div className="text-muted-foreground">Sem conta vinculada</div>
              <div className="text-xl font-bold">{result.unlinkedRows.length}</div>
            </div>
          </div>

          {result.unlinkedRows.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Linhas salvas sem conta de vendedor</p>
              <p className="mt-1">
                Elas continuam no histórico administrativo e serão vinculadas automaticamente
                quando uma conta for associada ao mesmo código.
              </p>
              <p className="mt-2 font-mono text-xs">
                {result.unlinkedRows.map((row) => row.code + " - " + row.name).join(" · ")}
              </p>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Avisos de conferência</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <History className="h-5 w-5 text-primary" /> Histórico de importações
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Últimos períodos registrados no histórico do relatório.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-seller-margin-reports"] })}
            disabled={history.isFetching}
          >
            <RefreshCw className={history.isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Atualizar histórico
          </Button>
        </div>

        {history.isError ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {history.error instanceof Error ? history.error.message : "Não foi possível carregar o histórico."}
          </div>
        ) : history.isPending ? (
          <div className="flex items-center justify-center rounded-xl border bg-card p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando histórico...
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma importação encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3">Período</th>
                  <th className="p-3">Arquivo</th>
                  <th className="p-3 text-right">Vendedores</th>
                  <th className="p-3 text-right">Vendas</th>
                  <th className="p-3">Atualizado em</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{dateBR(group.periodStart)} a {dateBR(group.periodEnd)}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.linkedRows} vinculados · {group.rows - group.linkedRows} sem conta
                      </div>
                    </td>
                    <td className="p-3 max-w-[240px] truncate" title={group.sourceFile}>{group.sourceFile}</td>
                    <td className="p-3 text-right">{group.rows}</td>
                    <td className="p-3 text-right font-semibold">{money(group.totalVenda)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{dateTimeBR(group.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
        <FileText className="mt-0.5 h-4 w-4 shrink-0" />
        O sistema ignora as linhas de subtotal das filiais e o bloco de bonificações; importa
        somente as linhas individuais de vendedores e mantém os campos completos da tabela principal.
      </div>
    </div>
  );
}
