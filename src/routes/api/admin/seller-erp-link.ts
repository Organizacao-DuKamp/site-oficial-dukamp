import { createFileRoute } from "@tanstack/react-router";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

type ErpSellerOption = {
  code: string;
  name: string;
  clients: number;
};

type UpdatePayload = {
  userId?: string;
  erpSellerCode?: string | null;
};

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function authorizeMasterAdmin(request: Request) {
  const token = readBearerToken(request);
  if (!token) return { response: errorResponse("Não autorizado.", 401) } as const;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();

  if (error || !data.user) return { response: errorResponse("Sessão inválida.", 401) } as const;
  if (email !== PROTECTED_ADMIN_EMAIL.toLowerCase()) {
    return {
      response: errorResponse("Apenas o Administrador Mestre pode vincular vendedores do ERP.", 403),
    } as const;
  }

  return { supabaseAdmin } as const;
}

async function listErpSellers(supabaseAdmin: any): Promise<ErpSellerOption[]> {
  const counts = new Map<string, ErpSellerOption>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("vendedor_codigo,vendedor_nome")
      .not("vendedor_codigo", "is", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;

    const rows = data ?? [];
    for (const row of rows) {
      const code = String(row.vendedor_codigo ?? "").trim();
      if (!code) continue;
      const name = String(row.vendedor_nome ?? "").trim() || `Vendedor ${code}`;
      const current = counts.get(code);
      if (current) current.clients += 1;
      else counts.set(code, { code, name, clients: 1 });
    }

    if (rows.length < pageSize) break;
  }

  return Array.from(counts.values()).sort((first, second) =>
    first.name.localeCompare(second.name, "pt-BR") || first.code.localeCompare(second.code),
  );
}

export const Route = createFileRoute("/api/admin/seller-erp-link")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = await authorizeMasterAdmin(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin } = authorization;

        const userId = new URL(request.url).searchParams.get("userId")?.trim();
        if (!userId) return errorResponse("Conta não informada.", 400);

        const sellerSlug = `conta-${userId}`;
        const { data: linkedSeller, error: sellerError } = await (supabaseAdmin.from("sellers") as any)
          .select("id,name,erp_seller_code,erp_seller_name")
          .eq("slug", sellerSlug)
          .maybeSingle();
        if (sellerError) return errorResponse(sellerError.message, 500);
        if (!linkedSeller) return errorResponse("Esta conta ainda não está configurada como vendedor.", 404);

        try {
          const sellers = await listErpSellers(supabaseAdmin);
          return Response.json(
            {
              seller: {
                id: linkedSeller.id,
                name: linkedSeller.name,
                erpSellerCode: linkedSeller.erp_seller_code ?? null,
                erpSellerName: linkedSeller.erp_seller_name ?? null,
              },
              sellers,
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("[seller-erp-link] Falha ao listar vendedores do ERP:", error);
          return errorResponse("Não foi possível listar os vendedores do ERP.", 500);
        }
      },

      POST: async ({ request }) => {
        const authorization = await authorizeMasterAdmin(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin } = authorization;

        let payload: UpdatePayload;
        try {
          payload = (await request.json()) as UpdatePayload;
        } catch {
          return errorResponse("Dados inválidos.", 400);
        }

        const userId = payload.userId?.trim();
        if (!userId) return errorResponse("Conta não informada.", 400);
        const erpSellerCode = payload.erpSellerCode?.trim() || null;
        const sellerSlug = `conta-${userId}`;

        const { data: linkedSeller, error: sellerError } = await (supabaseAdmin.from("sellers") as any)
          .select("id")
          .eq("slug", sellerSlug)
          .maybeSingle();
        if (sellerError) return errorResponse(sellerError.message, 500);
        if (!linkedSeller) return errorResponse("Esta conta ainda não está configurada como vendedor.", 404);

        let erpSellerName: string | null = null;
        if (erpSellerCode) {
          const { data: customer, error: customerError } = await supabaseAdmin
            .from("customers")
            .select("vendedor_nome")
            .eq("vendedor_codigo", erpSellerCode)
            .limit(1)
            .maybeSingle();
          if (customerError) return errorResponse(customerError.message, 500);
          if (!customer) return errorResponse("Código de vendedor do ERP não encontrado.", 400);
          erpSellerName = String(customer.vendedor_nome ?? "").trim() || null;
        }

        const { error: updateError } = await (supabaseAdmin.from("sellers") as any)
          .update({
            erp_seller_code: erpSellerCode,
            erp_seller_name: erpSellerName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", linkedSeller.id);
        if (updateError) return errorResponse(updateError.message, 500);

        return Response.json(
          {
            ok: true,
            erpSellerCode,
            erpSellerName,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
