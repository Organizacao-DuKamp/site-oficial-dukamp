import { createFileRoute } from "@tanstack/react-router";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

function validInteger(value: string | null, minimum: number, maximum: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export const Route = createFileRoute("/api/admin/seller-margin-report")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;

        const { supabaseAdmin, user } = authorization;
        if (user.email?.toLowerCase() !== PROTECTED_ADMIN_EMAIL.toLowerCase()) {
          return errorResponse("Apenas o Administrador Mestre pode consultar este relatório.", 403);
        }

        const url = new URL(request.url);
        const userId = url.searchParams.get("userId")?.trim();
        const year = validInteger(url.searchParams.get("year"), 2000, 2100);
        const month = validInteger(url.searchParams.get("month"), 1, 12);
        if (!userId || !year || !month) return errorResponse("Conta, mês ou ano inválido.", 400);

        const targetResult = await supabaseAdmin.auth.admin.getUserById(userId);
        if (targetResult.error || !targetResult.data.user) {
          return errorResponse("Conta não encontrada.", 404);
        }

        const seller = await resolveSellerIdentity(supabaseAdmin, targetResult.data.user);
        if (!seller) return errorResponse("Esta conta não está configurada como vendedor.", 400);

        const { data: reports, error } = await supabaseAdmin
          .from("seller_monthly_margin_reports")
          .select("*")
          .eq("seller_user_id", userId)
          .eq("report_year", year)
          .eq("report_month", month)
          .order("period_end", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1);
        if (error) {
          console.error("[admin-seller-margin-report] Falha ao consultar relatório:", error);
          return errorResponse("Não foi possível consultar o relatório mensal.", 500);
        }

        return Response.json({ report: reports?.[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
