import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ChevronLeft, Eye, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type SellerMarginReport = {
  report_year: number;
  report_month: number;
  period_start: string;
  period_end: string;
  report_seller_code: string;
  report_seller_name: string;
  total_venda: number;
  devolucao: number;
  aditivos: number;
  sacarias: number;
  balcao: number;
  total_custo: number;
  margem_percentual: number;
  comissao_representante: number;
  tonelagem: number;
  margem_bruta: number;
  margem_aditivos: number;
  margem_aditivos_percentual: number;
  margem_sacarias: number;
  margem_sacarias_percentual: number;
  margem_balcao: number;
  margem_balcao_percentual: number;
  source_file: string;
};

type ReportResponse = {
  report?: SellerMarginReport | null;
  error?: string;
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

function money(value: number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value: number) {
  return `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function tonnage(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function dateBR(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

async function loadReport(
  userId: string,
  year: number,
  month: number,
): Promise<SellerMarginReport | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const params = new URLSearchParams({ userId, year: String(year), month: String(month) });
  const response = await fetch(`/api/admin/seller-margin-report?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as ReportResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o relatório.");
  return payload.report ?? null;
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold">{value}</dd>
    </div>
  );
}

export function SellerMarginReportDialog({
  userId,
  sellerName,
}: {
  userId: string;
  sellerName: string;
}) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const years = Array.from(
    { length: Math.max(1, today.getFullYear() - 2025 + 1) },
    (_, index) => today.getFullYear() - index,
  );

  const reportQuery = useQuery({
    queryKey: ["admin-seller-margin-report", userId, year, month],
    enabled: open && showReport,
    queryFn: () => loadReport(userId, year, month),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setShowReport(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="mr-2 h-4 w-4" /> Visualizar dados completos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Dados completos do vendedor</DialogTitle>
          <DialogDescription>{sellerName}</DialogDescription>
        </DialogHeader>

        {!showReport ? (
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="flex w-full items-center gap-4 rounded-xl border p-5 text-left transition-colors hover:bg-accent"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">RELATÓRIO MARGEM VENDA</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Consulte todos os campos do relatório mensal importado do ERP.
              </span>
            </span>
          </button>
        ) : (
          <div className="space-y-5">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => setShowReport(false)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>

            <div className="rounded-xl border p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">RELATÓRIO MARGEM VENDA</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Ano</span>
                  <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((item) => (
                        <SelectItem key={item} value={String(item)}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Mês</span>
                  <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((label, index) => (
                        <SelectItem key={label} value={String(index + 1)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {reportQuery.isPending ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Consultando relatório...
              </div>
            ) : reportQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível consultar</AlertTitle>
                <AlertDescription>
                  {reportQuery.error instanceof Error
                    ? reportQuery.error.message
                    : "Tente novamente."}
                </AlertDescription>
              </Alert>
            ) : !reportQuery.data ? (
              <Alert>
                <AlertTitle>Nenhum relatório encontrado</AlertTitle>
                <AlertDescription>
                  Não há dados importados para {MONTHS[month - 1].toLowerCase()} de {year} nesta
                  conta.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-primary/5 p-4 text-sm">
                  <p className="font-semibold">
                    {MONTHS[month - 1]} de {year}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Período: {dateBR(reportQuery.data.period_start)} a{" "}
                    {dateBR(reportQuery.data.period_end)}
                  </p>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ReportField label="COD" value={reportQuery.data.report_seller_code} />
                  <ReportField label="VEND" value={reportQuery.data.report_seller_name} />
                  <ReportField label="TOT_VENDA" value={money(reportQuery.data.total_venda)} />
                  <ReportField label="DEVOLUCAO" value={money(reportQuery.data.devolucao)} />
                  <ReportField label="ADITIVOS" value={money(reportQuery.data.aditivos)} />
                  <ReportField label="SACARIAS" value={money(reportQuery.data.sacarias)} />
                  <ReportField label="BALCAO" value={money(reportQuery.data.balcao)} />
                  <ReportField label="TT_CUSTO" value={money(reportQuery.data.total_custo)} />
                  <ReportField label="MARGEM" value={percent(reportQuery.data.margem_percentual)} />
                  <ReportField
                    label="CMS_REP"
                    value={money(reportQuery.data.comissao_representante)}
                  />
                  <ReportField label="TONELAG" value={tonnage(reportQuery.data.tonelagem)} />
                  <ReportField label="MR_BRUTA" value={money(reportQuery.data.margem_bruta)} />
                  <ReportField label="MR_ADITI" value={money(reportQuery.data.margem_aditivos)} />
                  <ReportField
                    label="%_MRG ADITIVOS"
                    value={percent(reportQuery.data.margem_aditivos_percentual)}
                  />
                  <ReportField label="MR_SACAR" value={money(reportQuery.data.margem_sacarias)} />
                  <ReportField
                    label="%_MRG SACARIAS"
                    value={percent(reportQuery.data.margem_sacarias_percentual)}
                  />
                  <ReportField label="MR_BALCA" value={money(reportQuery.data.margem_balcao)} />
                  <ReportField
                    label="%_MRG BALCAO"
                    value={percent(reportQuery.data.margem_balcao_percentual)}
                  />
                </dl>
                <p className="text-xs text-muted-foreground">
                  Fonte: {reportQuery.data.source_file}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
