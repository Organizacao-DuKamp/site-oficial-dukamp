import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { regularPriceForAccount } from "./pricing";
import { isSupportedTaxCode, normalizeTaxCode } from "./tax";

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

export type ImportSummary = {
  onlyActive: boolean;
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

export async function importProdWeb(
  supabase: SupabaseClient<Database>,
  text: string,
  onlyActive = true,
): Promise<ImportSummary> {
  const { rows, errors: parseErrors } = parseFile(text);
  const codes = rows.map((r) => r.code);
  const existing = new Map<string, { id: string; active: boolean; name: string; catalogs?: { name?: string | null; slug?: string | null } | null }>();

  for (let i = 0; i < codes.length; i += 200) {
    const chunk = codes.slice(i, i + 200);
    const { data, error } = await supabase
      .from("products")
      .select("id,code,active,name,catalogs(name,slug)")
      .in("code", chunk);
    if (error) throw error;
    (data ?? []).forEach((product) =>
      existing.set(product.code, {
        id: product.id,
        active: Boolean(product.active),
        name: product.name,
        catalogs: product.catalogs,
      }),
    );
  }

  const result: ImportSummary = {
    onlyActive,
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

      if (onlyActive && !found.active) {
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

      const consumerPrice = regularPriceForAccount({ producer_price: producerPrice, catalogs: found.catalogs }, "cliente");
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

      // ERP columns exist in the migrations but are missing from the generated client types.
      let update = supabase.from("products")
        .update(patch as Database["public"]["Tables"]["products"]["Update"])
        .eq("id", found.id);
      // Recheck at write time: the product may have been deactivated during the import.
      if (onlyActive) update = update.eq("active", true);
      const { data, error } = await update.select("id");
      if (error) throw error;
      if (!data?.length) {
        result.ignored.push({
          line: row.line,
          code: row.code,
          name: found.name || row.name,
          reason: "Produto não atualizado: deixou de estar disponível para esta importação",
        });
        continue;
      }
      result.updated += data.length;
    } catch (error: any) {
      result.errors.push({
        line: row.line,
        code: row.code,
        message: error.message ?? String(error),
      });
    }
  }
  return result;
}
