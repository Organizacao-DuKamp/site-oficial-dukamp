import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { getDimensionsFromName } from "@/lib/product-dimensions";

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
};

type ParseResult = {
  rows: ParsedRow[];
  errors: { line: number; message: string; raw: string }[];
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
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const parts = trimmed.split(";").map((p) => p.trim());
    if (parts.length < 5) {
      errors.push({ line, message: `Linha com ${parts.length} colunas (esperado ≥ 5)`, raw: trimmed });
      return;
    }
    try {
      const code = parts[0];
      const name = parts[1];
      if (!code) throw new Error("Código vazio");
      if (!name) throw new Error("Nome vazio");
      if (seen.has(code)) throw new Error(`Código duplicado no arquivo: ${code}`);
      seen.add(code);
      const saldo = parseBRNumber(parts[2]);
      const preco1 = parseBRNumber(parts[3]);
      const preco2 = parseBRNumber(parts[4]);
      rows.push({ line, code, name, saldo, preco1, preco2 });
    } catch (e: any) {
      errors.push({ line, message: e.message ?? String(e), raw: trimmed });
    }
  });
  return { rows, errors };
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "produto";
}

type Summary = {
  total: number;
  created: number;
  updated: number;
  activated: number;
  deactivated: number;
  errors: { line: number; code?: string; message: string }[];
};

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const logs = useQuery({
    queryKey: ["import_logs"],
    queryFn: async () => (await supabase.from("import_logs").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    setSummary(null);
    try {
      const text = await file.text();
      const { rows, errors: parseErrors } = parseFile(text);

      const codes = rows.map((r) => r.code);
      const existing = new Map<string, { id: string; active: boolean }>();
      // Fetch in chunks to avoid huge URL
      for (let i = 0; i < codes.length; i += 200) {
        const chunk = codes.slice(i, i + 200);
        const { data, error } = await supabase.from("products").select("id, code, active").in("code", chunk);
        if (error) throw error;
        (data ?? []).forEach((p: any) => existing.set(p.code, { id: p.id, active: p.active }));
      }

      const result: Summary = {
        total: rows.length + parseErrors.length,
        created: 0,
        updated: 0,
        activated: 0,
        deactivated: 0,
        errors: parseErrors.map((e) => ({ line: e.line, message: e.message })),
      };

      for (const r of rows) {
        try {
          const shouldBeActive = r.saldo > 0;
          const stockInt = Math.max(0, Math.round(r.saldo));
          const found = existing.get(r.code);
          if (found) {
            const patch: { consumer_price: number; producer_price: number; price: number; stock: number; active?: boolean } = {
              consumer_price: r.preco1,
              producer_price: r.preco2,
              price: r.preco1,
              stock: stockInt,
            };
            if (found.active !== shouldBeActive) {
              patch.active = shouldBeActive;
              if (shouldBeActive) result.activated++; else result.deactivated++;
            }
            const { error } = await supabase.from("products").update(patch).eq("id", found.id);
            if (error) throw error;
            result.updated++;
          } else {
            const dims = getDimensionsFromName(r.name);
            const { error } = await supabase.from("products").insert({
              code: r.code,
              name: r.name,
              slug: `${slugify(r.name)}-${r.code}`,
              consumer_price: r.preco1,
              producer_price: r.preco2,
              price: r.preco1,
              stock: stockInt,
              active: shouldBeActive,
              ...dims,
              weight: dims.peso ?? 0,
            });
            if (error) throw error;
            result.created++;
            if (shouldBeActive) result.activated++;
          }
        } catch (e: any) {
          result.errors.push({ line: r.line, code: r.code, message: e.message ?? String(e) });
        }
      }

      await supabase.from("import_logs").insert({
        admin_id: user!.id,
        filename: file.name,
        total: result.total,
        created_count: result.created,
        updated_count: result.updated,
        activated_count: result.activated,
        deactivated_count: result.deactivated,
        error_count: result.errors.length,
        error_details: result.errors.slice(0, 200),
      });

      setSummary(result);
      qc.invalidateQueries({ queryKey: ["import_logs"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Importação concluída");
    } catch (e: any) {
      toast.error(e.message ?? "Falha na importação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Atualizar Valores</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Importe um arquivo <code>.txt</code> no formato Dukamp. Produtos existentes têm apenas os preços atualizados;
        novos códigos são criados. Saldo &gt; 0 ativa o produto; saldo = 0 desativa.
      </p>

      <div className="mt-6 rounded-lg border bg-card p-4 space-y-3">
        <Input
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setSummary(null); }}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Stat label="Total processado" value={summary.total} />
            <Stat label="Criados" value={summary.created} />
            <Stat label="Atualizados" value={summary.updated} />
            <Stat label="Ativados" value={summary.activated} />
            <Stat label="Desativados" value={summary.deactivated} />
            <Stat label="Erros" value={summary.errors.length} />
          </div>
          {summary.errors.length > 0 && (
            <div className="mt-4">
              <div className="font-medium text-sm mb-2">Erros</div>
              <div className="max-h-64 overflow-auto text-xs border rounded divide-y">
                {summary.errors.map((e, i) => (
                  <div key={i} className="p-2">
                    <span className="text-muted-foreground">Linha {e.line}{e.code ? ` · ${e.code}` : ""}:</span> {e.message}
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
          {(logs.data ?? []).map((l: any) => (
            <div key={l.id} className="p-3 flex flex-wrap gap-x-4 gap-y-1">
              <div className="font-medium">{l.filename}</div>
              <div className="text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</div>
              <div>Total: {l.total}</div>
              <div>Criados: {l.created_count}</div>
              <div>Atualizados: {l.updated_count}</div>
              <div>Ativados: {l.activated_count}</div>
              <div>Desativados: {l.deactivated_count}</div>
              <div className={l.error_count > 0 ? "text-destructive" : ""}>Erros: {l.error_count}</div>
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
