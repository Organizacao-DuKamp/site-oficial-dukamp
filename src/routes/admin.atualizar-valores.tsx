import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { consumerPriceFromProducer, isSupportedTaxCode, normalizeTaxCode } from "@/lib/tax";

export const Route = createFileRoute("/admin/atualizar-valores")({
  component: Page,
});

type ParsedRow = {
  line: number;
  code: string;
  name: string;
  saldo: number;
  preco1: number;
  preco2: number;
  group: string;
  erpIcmsRate: number;
  taxCode: string;
  points: number;
  barcode: string | null;
  fixedTable: boolean;
};

type ParseResult = {
  rows: ParsedRow[];
  errors: { line: number; message: string; raw: string }[];
};

type Ignored = {
  line: number;
  code: string;
  name: string;
  reason: string;
};

type Summary = {
  total: number;
  updated: number;
  ignored: Ignored[];
  errors: { line: number; code?: string; message: string }[];
};

function parseBRNumber(v: string): number {
  const s = (v ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Número inválido: "${v}"`);
  return n;
}

function parseFile(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: ParseResult["errors"] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const parts = trimmed.split(";").map((p) => p.trim());
    if (parts.length < 11) {
      errors.push({
        line,
        message: `Linha com ${parts.length} colunas (esperado ≥ 11)`,
        raw: trimmed,
      });
      return;
    }

    try {
      const code = parts[0];
      const name = parts[1];
      if (!code) throw new Error("Código vazio");
      if (!name) throw new Error("Nome vazio");
      if (seen.has(code)) throw new Error(`Código duplicado no arquivo: ${code}`);
      seen.add(code);

      rows.push({
        line,
        code,
        name,
        saldo: parseBRNumber(parts[2]),
        preco1: parseBRNumber(parts[3]),
        preco2: parseBRNumber(parts[4]),
        group: parts[5],
        erpIcmsRate: parseBRNumber(parts[6]),
        taxCode: normalizeTaxCode(parts[7]),
        points: parseBRNumber(parts[8]),
        barcode: parts[9] || null,
        fixedTable: parts[10].toUpperCase() === "S",
      });
    } catch (error: any) {
      errors.push({ line, message: error.message ?? String(error), raw: trimmed });
    }
  });

  return { rows, errors };
}

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

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
      const { rows, errors: parseErrors } = parseFile(text);
      const codes = rows.map((r) => r.code);
      const existing = new Map<string, { id: string; active: boolean; name: string }>();

      for (let i = 0; i < codes.length; i += 200) {
        const chunk = codes.slice(i, i + 200);
        const { data, error } = await supabase
          .from("products")
          .select("id,code,active,name")
          .in("code", chunk);
        if (error) throw error;
        (data ?? []).forEach((product: any) =>
          existing.set(product.code, {
            id: product.id,
            active: Boolean(product.active),
            name: product.name,
          }),
        );
      }

      const result: Summary = {
        total: rows.length + parseErrors.length,
        updated: 0,
        ignored: [],
        errors: parseErrors.map((e) => ({ line: e.line, message: e.message })),
      };

      for (const row of rows) {
        try {
          const found = existing.get(row.code);
          if (!found) {
            result.ignored.push({
              line: row.line,
              code: row.code,
              name: row.name,
              reason: "Código não existe no cadastro atual do site",
            });
            continue;
          }

          if (!found.active) {
            result.ignored.push({
              line: row.line,
              code: row.code,
              name: found.name || row.name,
              reason: "Produto inativo no site",
            });
            continue;
          }

          if (!isSupportedTaxCode(row.taxCode)) {
            result.ignored.push({
              line: row.line,
              code: row.code,
              name: found.name || row.name,
              reason: `Código tributário ${row.taxCode} não faz parte desta implantação (somente 000/040)`,
            });
            continue;
          }

          const producerPrice = row.preco2;
          if (!Number.isFinite(producerPrice) || producerPrice <= 0) {
            result.ignored.push({
              line: row.line,
              code: row.code,
              name: found.name || row.name,
              reason: "PRECO2 inválido ou zerado",
            });
            continue;
          }

          const consumerPrice = consumerPriceFromProducer(producerPrice);
          const patch = {
            producer_price: producerPrice,
            consumer_price: consumerPrice,
            price: consumerPrice,
            stock: Math.max(0, Math.round(row.saldo)),
            tax_code: row.taxCode,
            erp_group: row.group || null,
            erp_icms_rate: row.erpIcmsRate,
            points: row.points,
            barcode: row.barcode,
            fixed_table: row.fixedTable,
          };

          const { error } = await supabase.from("products").update(patch as any).eq("id", found.id);
          if (error) throw error;
          result.updated += 1;
        } catch (error: any) {
          result.errors.push({
            line: row.line,
            code: row.code,
            message: error.message ?? String(error),
          });
        }
      }

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
        `Importação concluída: ${result.updated} produto(s) ativo(s) atualizado(s), ${result.ignored.length} ignorado(s).`,
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
        O sistema usa somente o PRECO2 como preço do produtor e calcula o preço do consumidor com acréscimo de 22%.
        Apenas produtos já existentes e ativos são alterados; nenhum produto é criado, ativado ou desativado por esta importação.
      </p>

      <div className="mt-6 rounded-lg border bg-card p-4 space-y-3">
        <Input
          type="file"
          accept=".txt,text/plain"
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
          <h2 className="font-semibold mb-3">Resumo</h2>
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
