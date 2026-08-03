import { createFileRoute } from "@tanstack/react-router";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

type AccountType = "cliente" | "revendedor" | "produtor" | "empresa" | "vendedor" | "admin";

type UpdatePayload = {
  userId?: string;
  accountType?: AccountType;
};

const WRITABLE_TYPES: AccountType[] = ["cliente", "revendedor", "produtor", "empresa", "vendedor", "admin"];

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
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
    return { response: errorResponse("Apenas o Administrador Mestre pode gerenciar contas.", 403) } as const;
  }

  return { supabaseAdmin } as const;
}

function effectiveAccountType(
  profileType: unknown,
  isAdmin: boolean,
  userMetadata: Record<string, unknown> | null | undefined,
): AccountType {
  if (isAdmin) return "admin";
  if (userMetadata?.account_type_override === "vendedor") return "vendedor";
  return (typeof profileType === "string" ? profileType : "cliente") as AccountType;
}

export const Route = createFileRoute("/api/admin/account-type")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = await authorizeMasterAdmin(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin } = authorization;

        const url = new URL(request.url);
        const userId = url.searchParams.get("userId")?.trim();

        if (userId) {
          const [targetR, profileR, rolesR] = await Promise.all([
            supabaseAdmin.auth.admin.getUserById(userId),
            supabaseAdmin.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
            supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
          ]);

          if (targetR.error || !targetR.data.user) return errorResponse("Conta não encontrada.", 404);
          if (profileR.error) return errorResponse(profileR.error.message, 500);
          if (rolesR.error) return errorResponse(rolesR.error.message, 500);

          return Response.json({
            accountType: effectiveAccountType(
              profileR.data?.account_type,
              (rolesR.data ?? []).length > 0,
              targetR.data.user.user_metadata,
            ),
          });
        }

        const sellerIds: string[] = [];
        const perPage = 1000;
        let page = 1;

        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
          if (error) return errorResponse(error.message, 500);

          for (const user of data.users) {
            if (user.user_metadata?.account_type_override === "vendedor") sellerIds.push(user.id);
          }

          if (data.users.length < perPage) break;
          page += 1;
        }

        return Response.json({ sellerIds });
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
        const accountType = payload.accountType;
        if (!userId || !accountType || !WRITABLE_TYPES.includes(accountType)) {
          return errorResponse("Tipo de conta inválido.", 400);
        }

        const [targetR, profileR] = await Promise.all([
          supabaseAdmin.auth.admin.getUserById(userId),
          supabaseAdmin.from("profiles").select("id, account_type, email").eq("id", userId).maybeSingle(),
        ]);

        if (targetR.error || !targetR.data.user) {
          return errorResponse("Conta não encontrada.", 404);
        }
        if (profileR.error) return errorResponse(profileR.error.message, 500);
        if (!profileR.data) return errorResponse("Conta não encontrada.", 404);

        const targetEmail = (targetR.data.user.email ?? profileR.data.email ?? "").toLowerCase();
        if (targetEmail === PROTECTED_ADMIN_EMAIL.toLowerCase()) {
          return errorResponse("Esta conta é protegida.", 403);
        }

        const currentMetadata = { ...(targetR.data.user.user_metadata ?? {}) } as Record<string, unknown>;

        if (accountType === "vendedor") {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ account_type: "cliente" })
            .eq("id", userId);
          if (profileError) return errorResponse(profileError.message, 500);

          const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...currentMetadata, account_type_override: "vendedor" },
          });
          if (metadataError) return errorResponse(metadataError.message, 500);

          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", "admin");
          if (roleError) return errorResponse(roleError.message, 500);

          return Response.json({ ok: true, accountType: "vendedor" });
        }

        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { ...currentMetadata, account_type_override: null },
        });
        if (metadataError) return errorResponse(metadataError.message, 500);

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ account_type: accountType })
          .eq("id", userId);
        if (profileError) return errorResponse(profileError.message, 500);

        if (accountType === "admin") {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "admin" } as any, { onConflict: "user_id,role" });
          if (roleError) return errorResponse(roleError.message, 500);
        } else {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", "admin");
          if (roleError) return errorResponse(roleError.message, 500);
        }

        return Response.json({ ok: true, accountType });
      },
    },
  },
});
