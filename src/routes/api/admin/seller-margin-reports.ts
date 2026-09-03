import { createFileRoute } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";

type IncomingReportRow = Record<string, unknown>;
type ValidatedReportRow = {
  code: string; name: string; totalVenda: number; devolucao: number; aditivos: number;
  sacarias: number; balcao: number; totalCusto: number; margemPercentual: number;
  comissaoRepresentante: number; tonelagem: number; margemBruta: number;
  margemAditivos: number; margemAditivosPercentual: number; margemSacarias: number;
  margemSacariasPercentual: number; margemBalcao: number; margemBalcaoPercentual: number;
};
type SellerMapping = { userId: string; accountName: string; source: "account_code" | "previous_report" };
const NUMERIC_FIELDS = ["totalVenda","devolucao","aditivos","sacarias","balcao","totalCusto","margemPercentual","comissaoRepresentante","tonelagem","margemBruta","margemAditivos","margemAditivosPercentual","margemSacarias","margemSacariasPercentual","margemBalcao","margemBalcaoPercentual"] as const;

function response(data: unknown, init?: ResponseInit) {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}
function normalizeSellerCode(value: string) { const code = value.trim(); return code.replace(/^0+(?=\d)/, "") || "0"; }
function readText(value: unknown, label: string, max: number) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  if (!text || text.length > max) throw new Error(`${label} inválido.`);
  return text;
}
function readNumber(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") throw new Error(`${label} não informado.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > 100000000000000) throw new Error(`${label} inválido.`);
  return Number(parsed.toFixed(3));
}
function readIsoDate(value: unknown, label: string) {
  const date = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${label} inválida.`);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error(`${label} inválida.`);
  return date;
}
function safeSourceFile(value: unknown) {
  const fileName = String(value ?? "").replace(/[\\/\r\n]+/g, " ").trim();
  if (!fileName || fileName.length > 255) throw new Error("Nome do arquivo inválido.");
  return fileName;
}
function normalizeName(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function namesLookCompatible(reportName: string, accountName: string) {
  const report = normalizeName(reportName), account = normalizeName(accountName);
  if (!report || !account) return true;
  return account.startsWith(report) || report.startsWith(account.slice(0, Math.min(4, account.length)));
}
async function authorizeAdmin(request: Request) {
  const { authenticateRequest, errorResponse } = await import("@/lib/seller-system.server");
  const authorization = await authenticateRequest(request);
  if ("response" in authorization) return authorization;
  const { data: role, error } = await authorization.supabaseAdmin.from("user_roles").select("id").eq("user_id", authorization.user.id).eq("role", "admin").limit(1).maybeSingle();
  if (error || !role) return { response: errorResponse("Acesso restrito ao administrativo.", 403) } as const;
  return authorization;
}
function validateRows(value: unknown): ValidatedReportRow[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) throw new Error("O relatório precisa conter entre 1 e 500 vendedores.");
  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`Linha ${index + 1} inválida.`);
    const row = entry as IncomingReportRow;
    const rawCode = readText(row.code, `Código da linha ${index + 1}`, 20);
    if (!/^\d{1,10}$/.test(rawCode)) throw new Error(`Código inválido na linha ${index + 1}.`);
    const code = normalizeSellerCode(rawCode);
    if (seen.has(code)) throw new Error(`O código ${code} aparece mais de uma vez.`);
    seen.add(code);
    const result = { code, name: readText(row.name, `Vendedor da linha ${index + 1}`, 120) } as ValidatedReportRow;
    for (const field of NUMERIC_FIELDS) (result as Record<string, unknown>)[field] = readNumber(row[field], `${field} da linha ${index + 1}`);
    return result;
  });
}
function accountName(user: User, fallback: string) { const metadata = user.user_metadata ?? {}; return String(metadata.full_name ?? user.email ?? fallback).trim() || fallback; }
function accountSellerCode(user: User) { const value = user.app_metadata?.seller_code; return typeof value === "string" && value.trim() ? value.trim() : null; }

export const Route = createFileRoute("/api/admin/seller-margin-reports")({
  server: { handlers: {
    GET: async ({ request }) => {
      const authorization = await authorizeAdmin(request);
      if ("response" in authorization) return authorization.response;
      if (new URL(request.url).searchParams.get("view") === "statistics") {
        try {
          const { buildAdminSalesStatistics } = await import("@/lib/admin-sales-statistics.server");
          return response(await buildAdminSalesStatistics(authorization.supabaseAdmin, request));
        } catch (error) {
          console.error("[admin-sales-statistics] Falha ao consolidar estatísticas:", error);
          return response({ error: error instanceof Error ? error.message : "Não foi possível carregar as estatísticas." }, { status: 500 });
        }
      }
      const { data, error } = await authorization.supabaseAdmin.from("seller_monthly_margin_reports")
        .select("report_year,report_month,period_start,period_end,report_seller_code,report_seller_name,total_venda,margem_percentual,tonelagem,seller_user_id,source_file,updated_at")
        .order("period_end", { ascending: false }).order("report_seller_code", { ascending: true }).limit(5000);
      if (error) return response({ error: "Não foi possível consultar o histórico de relatórios." }, { status: 500 });
      return response({ reports: data ?? [] });
    },

    POST: async ({ request }) => {
      const authorization = await authorizeAdmin(request);
      if ("response" in authorization) return authorization.response;
      let payload: Record<string, unknown>;
      try { payload = (await request.json()) as Record<string, unknown>; }
      catch { return response({ error: "Dados da importação inválidos." }, { status: 400 }); }

      let periodStart: string, periodEnd: string, rows: ValidatedReportRow[], sourceFile: string;
      try {
        periodStart = readIsoDate(payload.periodStart, "Data inicial");
        periodEnd = readIsoDate(payload.periodEnd, "Data final");
        if (periodEnd < periodStart) throw new Error("O período final não pode ser anterior ao inicial.");
        rows = validateRows(payload.rows);
        sourceFile = safeSourceFile(payload.fileName);
      } catch (error) {
        return response({ error: error instanceof Error ? error.message : "Dados da importação inválidos." }, { status: 400 });
      }

      const reportYear = Number(periodStart.slice(0, 4)), reportMonth = Number(periodStart.slice(5, 7));
      const { listAllAuthUsers, resolveSellerIdentity } = await import("@/lib/seller-system.server");
      let users: User[];
      try { users = await listAllAuthUsers(authorization.supabaseAdmin); }
      catch { return response({ error: "Não foi possível consultar as contas de vendedores." }, { status: 500 }); }

      const sellerByCode = new Map<string, SellerMapping>();
      for (const user of users) {
        if (user.app_metadata?.account_type_override !== "vendedor") continue;
        const codeValue = accountSellerCode(user);
        if (!codeValue) continue;
        const identity = await resolveSellerIdentity(authorization.supabaseAdmin, user);
        if (!identity) continue;
        const code = normalizeSellerCode(codeValue), current = sellerByCode.get(code);
        if (current && current.userId !== identity.userId) return response({ error: `O código de vendedor ${code} está vinculado a mais de uma conta.` }, { status: 409 });
        sellerByCode.set(code, { userId: identity.userId, accountName: identity.name || accountName(user, "Vendedor"), source: "account_code" });
      }

      const { data: existingReports, error: existingError } = await authorization.supabaseAdmin.from("seller_monthly_margin_reports")
        .select("report_seller_code,seller_user_id,period_end").eq("report_year", reportYear).eq("report_month", reportMonth).order("period_end", { ascending: false });
      if (existingError) return response({ error: "Não foi possível preparar a atualização." }, { status: 500 });
      const previousByCode = new Map<string, string>();
      for (const report of existingReports ?? []) {
        const code = normalizeSellerCode(String(report.report_seller_code ?? ""));
        if (code && report.seller_user_id && !previousByCode.has(code)) previousByCode.set(code, report.seller_user_id);
      }

      const warnings: string[] = [], unlinkedRows: Array<{ code: string; name: string }> = [];
      let linked = 0;
      const records = rows.map((row) => {
        const current = sellerByCode.get(row.code), previousUserId = previousByCode.get(row.code);
        const seller = current ?? (previousUserId ? { userId: previousUserId, accountName: "", source: "previous_report" as const } : null);
        if (seller) {
          linked += 1;
          if (current && !namesLookCompatible(row.name, current.accountName)) warnings.push(`Código ${row.code}: o PDF traz "${row.name}" e a conta está como "${current.accountName}". A vinculação foi feita pelo código.`);
        } else unlinkedRows.push({ code: row.code, name: row.name });
        return {
          seller_user_id: seller?.userId ?? null, report_year: reportYear, report_month: reportMonth,
          period_start: periodStart, period_end: periodEnd, report_seller_code: row.code, report_seller_name: row.name,
          total_venda: row.totalVenda, devolucao: row.devolucao, aditivos: row.aditivos, sacarias: row.sacarias,
          balcao: row.balcao, total_custo: row.totalCusto, margem_percentual: row.margemPercentual,
          comissao_representante: row.comissaoRepresentante, tonelagem: row.tonelagem, margem_bruta: row.margemBruta,
          margem_aditivos: row.margemAditivos, margem_aditivos_percentual: row.margemAditivosPercentual,
          margem_sacarias: row.margemSacarias, margem_sacarias_percentual: row.margemSacariasPercentual,
          margem_balcao: row.margemBalcao, margem_balcao_percentual: row.margemBalcaoPercentual,
          source_file: sourceFile, updated_at: new Date().toISOString(),
        };
      });

      const admin = authorization.supabaseAdmin as any;
      const { error: snapshotError } = await admin.from("seller_margin_report_snapshots")
        .upsert(records, { onConflict: "period_start,period_end,report_seller_code" });
      if (snapshotError) {
        console.error("[admin-seller-margin-reports] Falha ao preservar snapshot:", snapshotError);
        return response({ error: "Não foi possível preservar o histórico do relatório." }, { status: 500 });
      }
      const { error: monthlyError } = await authorization.supabaseAdmin.from("seller_monthly_margin_reports")
        .upsert(records, { onConflict: "report_year,report_month,report_seller_code" });
      if (monthlyError) {
        console.error("[admin-seller-margin-reports] Falha ao atualizar visão mensal:", monthlyError);
        return response({ error: "O histórico foi preservado, mas não foi possível atualizar os valores mensais." }, { status: 500 });
      }

      return response({
        ok: true, periodStart, periodEnd, sourceFile, totalRows: rows.length, linkedRows: linked, unlinkedRows,
        updatedRows: (existingReports ?? []).length ? rows.filter((row) => previousByCode.has(row.code)).length : 0,
        insertedRows: rows.filter((row) => !previousByCode.has(row.code)).length, warnings,
        mappings: rows.map((row) => {
          const current = sellerByCode.get(row.code), previousUserId = previousByCode.get(row.code);
          return { code: row.code, name: row.name, linked: Boolean(current || previousUserId), accountName: current?.accountName ?? null, source: current?.source ?? (previousUserId ? "previous_report" : null) };
        }),
      });
    },
  }},
});
