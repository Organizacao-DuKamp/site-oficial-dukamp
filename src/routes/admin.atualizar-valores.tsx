import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { CONSUMER_MARKUP } from "@/lib/tax";
import { importProdWeb, type ImportSummary } from "@/lib/prod-web-import";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/atualizar-valores")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [onlyActive, setOnlyActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const logs = useQuery({
    queryKey: ["import_logs"],
    queryFn: async () =>
      (await supabase.from("import_logs").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    setSummary(null);

    try {
      const text = await file.text();
      const result = await importProdWeb(supabase, text, onlyActive);

      await supabase.from("import_logs").insert({
        admin_id: user!.id,
        filename: file.name,
        total: result.total,
        created_count: 0,
        updated_count: result.updated,
        activated_count: 0,
        deactivated_count: 0,
        error_count: result.errors.length,
        error_details: result.errors.slice(0, 200),
      });

      setSummary(result);
      qc.invalidateQueries({ queryKey: ["import_logs"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        `Importação concluída: ${result.updated} produto(s)${result.onlyActive ? " ativo(s)" : ""} atualizado(s), ${result.ignored.length} ignorado(s).`,
      );
    } catch (error: any) {
      toast.error(error.message ?? "Falha na importação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Atualizar Valores</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Formato: CODIGO · DESCRICAO · SALDO · PRECO1 · PRECO2 · GRUPO · %ICMS · COD TRIBUTARIO · PONTOS · CODIGO_BARRAS · TABELA FIXA.
        O sistema usa somente o PRECO2 como preço do produtor e calcula o preço do consumidor com acréscimo de {CONSUMER_MARKUP * 100}%, exceto Pets, Utensílios Gerais, Lonas e Coberturas e Arames e Ferragens. Produtor rural paga o preço-base sem acréscimo.
        A importação atualiza preços, estoque e demais dados do PROD.web nos produtos já cadastrados, conforme a opção abaixo. Nenhum produto é criado, ativado ou desativado.
      </p>

      <div className="mt-6 rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="only-active-products" className="cursor-pointer font-semibold">
              Atualizar apenas produtos ativos
            </Label>
            <p id="only-active-description" className="text-sm text-muted-foreground">
              {onlyActive
                ? "Recomendado para atualizar preços e estoque do dia a dia. Produtos inativos serão ignorados."
                : "Todos os produtos já cadastrados poderão ser atualizados, incluindo os inativos. Eles continuarão inativos."}
            </p>
          </div>
          <Switch
            id="only-active-products"
            aria-describedby="only-active-description"
            checked={onlyActive}
            onCheckedChange={setOnlyActive}
            disabled={busy}
          />
        </div>
        <Input
          aria-label="Arquivo PROD.web ou TXT"
          type="file"
          accept=".web,.txt,text/plain"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setSummary(null);
          }}
          disabled={busy}
        />
        <Button onClick={handleImport} disabled={!file || busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {busy ? "Processando..." : "Importar Arquivo"}
        </Button>
      </div>

      {summary && (
        <div className="mt-6 rounded-lg border bg-card p-4">
          <h2 className="font-semibold mb-1">Resumo</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {summary.onlyActive ? "Atualização apenas de produtos ativos." : "Atualização de produtos ativos e inativos já cadastrados."}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Total lido" value={summary.total} />
            <Stat label="Atualizados" value={summary.updated} />
            <Stat label="Ignorados" value={summary.ignored.length} />
            <Stat label="Erros" value={summary.errors.length} />
          </div>

          {summary.ignored.length > 0 && (
            <div className="mt-4">
              <div className="font-medium text-sm mb-2">Produtos ignorados</div>
              <div className="max-h-80 overflow-auto text-xs border rounded divide-y">
                {summary.ignored.map((item, index) => (
                  <div key={`${item.code}-${index}`} className="p-2">
                    <span className="font-medium">{item.code} · {item.name}</span>
                    <span className="text-muted-foreground"> — {item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.errors.length > 0 && (
            <div className="mt-4">
              <div className="font-medium text-sm mb-2">Erros</div>
              <div className="max-h-64 overflow-auto text-xs border rounded divide-y">
                {summary.errors.map((error, index) => (
                  <div key={index} className="p-2">
                    <span className="text-muted-foreground">
                      Linha {error.line}{error.code ? ` · ${error.code}` : ""}:
                    </span>{" "}
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-semibold mb-2">Histórico de importações</h2>
        <div className="rounded-lg border bg-card divide-y text-sm">
          {(logs.data ?? []).map((log: any) => (
            <div key={log.id} className="p-3 flex flex-wrap gap-x-4 gap-y-1">
              <div className="font-medium">{log.filename}</div>
              <div className="text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</div>
              <div>Total: {log.total}</div>
              <div>Atualizados: {log.updated_count}</div>
              <div className={log.error_count > 0 ? "text-destructive" : ""}>Erros: {log.error_count}</div>
            </div>
          ))}
          {logs.data && logs.data.length === 0 && (
            <div className="p-3 text-muted-foreground">Nenhuma importação registrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
