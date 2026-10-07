import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { readFinancialReportFile } from "@/lib/financial-report-file";
import type { FinancialReportKind } from "@/lib/financial-report-import";
export const Route = createFileRoute("/admin/dukamp/atualizar-valores")({
  ssr: false,
  component: FinancialReportUpload,
});
type Preview = {
  year: number;
  month: number;
  total: number;
  credits: number;
  debits: number;
  codes: number;
};
function FinancialReportUpload() {
  const { user, isMasterAdmin, loading } = useAuth();
  const client = useQueryClient();
  const [kind, setKind] = useState<FinancialReportKind>("payables");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<Preview[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const reset = () => {
    setPreview([]);
    setSource("");
    setMessage("");
    setError("");
  };
  async function run(phase: "preview" | "import") {
    if (!file) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const text = phase === "preview" ? await readFinancialReportFile(file) : source;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");
      const response = await fetch("/api/admin/financial-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phase, kind, text, fileName: file.name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha na importação.");
      setSource(text);
      setPreview(result.months);
      if (phase === "import") {
        await client.invalidateQueries({ queryKey: ["admin"] });
        setPreview([]);
        setSource("");
        setMessage("Valores atualizados com sucesso.");
      }
    } catch (e) {
      setPreview([]);
      setSource("");
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setBusy(false);
    }
  }
  const money = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (loading) return <p role="status">Carregando...</p>;
  if (!isMasterAdmin || user?.email?.toLowerCase() !== PROTECTED_ADMIN_EMAIL)
    return <p role="alert">Área restrita à conta-mestre DuKamp.</p>;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">Atualizar valores · DuKamp</h1>
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <label className="block">
          Tipo de relatório
          <select
            disabled={busy}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as FinancialReportKind);
              reset();
            }}
            className="mt-2 block w-full rounded-lg border bg-background p-3"
          >
            <option value="payables">Contas a pagar</option>
            <option value="bank">Controle bancário</option>
          </select>
        </label>
        <p className="text-sm text-muted-foreground">
          {kind === "payables"
            ? "Envie o resumo financeiro por grupo de despesas de um mês completo. Atualiza o Total do período e as categorias. Estatísticas, evolução mensal e lucro líquido aplicam automaticamente as exclusões de fornecedores, frete, embalagens, não despesas, código 116 e os cinco códigos extras de 2025."
            : "Envie a consulta de conta corrente de meses completos. Créditos e débitos serão agrupados pela data do lançamento e atualizarão os cartões do Resultado dos registros bancários."}
        </p>
        <p className="text-sm text-muted-foreground">
          A importação substitui os valores dos meses identificados no relatório e preserva a outra
          fonte. Os totais são conferidos antes de gravar.
        </p>
        <label className="block">
          Arquivo PDF ou TXT
          <input
            type="file"
            accept=".pdf,.txt"
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              reset();
            }}
            className="mt-2 block w-full rounded-lg border p-3"
          />
        </label>
        <button
          disabled={busy || !file}
          onClick={() => void run("preview")}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Processando..." : "Validar relatório"}
        </button>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-emerald-600">
            {message}
          </p>
        )}
        {!!preview.length && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Mês</th>
                    <th className="p-2 text-right">
                      {kind === "payables" ? "Total do relatório" : "Entradas"}
                    </th>
                    {kind === "bank" && <th className="p-2 text-right">Saídas</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((m) => (
                    <tr key={`${m.year}-${m.month}`} className="border-t">
                      <td className="p-2">
                        {String(m.month).padStart(2, "0")}/{m.year}
                      </td>
                      <td className="p-2 text-right">
                        {money(kind === "payables" ? m.total : m.credits)}
                      </td>
                      {kind === "bank" && <td className="p-2 text-right">{money(m.debits)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              disabled={busy}
              onClick={() => void run("import")}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              Confirmar atualização dos valores
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
