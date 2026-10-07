import { createFileRoute } from "@tanstack/react-router";
import { parseFinancialReport } from "@/lib/financial-report-import";
import { isMasterAdminUserId, PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/api/admin/financial-reports")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateRequest } = await import("@/lib/seller-system.server");
        const auth = await authenticateRequest(request);
        if ("response" in auth) return auth.response;
        const reply = (data: unknown, status = 200) =>
          Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
        if (
          !isMasterAdminUserId(auth.user.id) ||
          auth.user.email?.toLowerCase() !== PROTECTED_ADMIN_EMAIL
        )
          return reply({ error: "Acesso restrito à conta-mestre DuKamp." }, 403);
        try {
          if (Number(request.headers.get("content-length")) > 16_000_000)
            throw new Error("Arquivo muito grande.");
          const body = await request.json();
          if (
            !["payables", "bank"].includes(body.kind) ||
            !["preview", "import"].includes(body.phase) ||
            typeof body.text !== "string" ||
            typeof body.fileName !== "string" ||
            !body.fileName.trim() ||
            body.fileName.length > 255
          )
            throw new Error("Solicitação inválida.");
          const months = parseFinancialReport(body.text, body.kind);
          const db = auth.supabaseAdmin;
          let codes: { code: number }[] = [];
          if (body.kind === "payables") {
            const categories = await db.from("dukamp_expense_subcategories").select("code");
            if (categories.error) throw categories.error;
            codes = categories.data ?? [];
            const unknown = months[0].values.filter((r) => !codes.some((c) => c.code === r.code));
            if (unknown.length)
              throw new Error(
                `Códigos não cadastrados: ${unknown.map((r) => `${r.code} - ${r.name}`).join(", ")}.`,
              );
            if (!codes.length) throw new Error("Cadastro de despesas indisponível.");
          }
          if (body.phase === "import") {
            const { createHash } = await import("node:crypto");
            const hash = createHash("sha256").update(body.text).digest("hex");
            const now = new Date().toISOString();
            if (body.kind === "payables") {
              const month = months[0];
              const rows = codes.map(({ code }) => ({
                year: month.year,
                month: month.month,
                subcategory_code: code,
                amount: (month.values.find((r) => r.code === code)?.cents ?? 0) / 100,
                source: `${body.fileName} | sha256:${hash}`,
                updated_at: now,
              }));
              const result = await db
                .from("dukamp_expense_monthly_values")
                .upsert(rows, { onConflict: "year,month,subcategory_code" });
              if (result.error) throw result.error;
            } else {
              const existing = await db
                .from("dukamp_bank_reports")
                .select("year,month,payload")
                .in("year", [...new Set(months.map((m) => m.year))]);
              if (existing.error) throw existing.error;
              const rows = months.map((month) => {
                const previous = existing.data?.find(
                  (r) => r.year === month.year && r.month === month.month,
                )?.payload ?? {
                  original: 0,
                  adjustment: 0,
                  total: 0,
                  detail_total: 0,
                  groups: [],
                  reconciliation: [],
                };
                return {
                  year: month.year,
                  month: month.month,
                  source_name: body.fileName,
                  source_sha256: hash,
                  imported_at: now,
                  payload: {
                    ...previous,
                    bank_expense_total: month.debits,
                    bank_credits_total: month.credits,
                    bank_summary_source: body.fileName,
                  },
                };
              });
              const result = await db
                .from("dukamp_bank_reports")
                .upsert(rows, { onConflict: "year,month" });
              if (result.error) throw result.error;
            }
          }
          return reply({
            months: months.map(({ values, ...month }) => ({ ...month, codes: values.length })),
            imported: body.phase === "import",
          });
        } catch (error) {
          console.error("financial-report-import", error);
          return reply(
            {
              error:
                error instanceof Error ? error.message : "Não foi possível importar o relatório.",
            },
            400,
          );
        }
      },
    },
  },
});
