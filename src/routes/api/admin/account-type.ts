import { createFileRoute } from "@tanstack/react-router";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

type AccountType = "cliente" | "revendedor" | "produtor" | "empresa" | "vendedor" | "admin";

type UpdatePayload = {
  userId?: string;
  accountType?: AccountType;
  sellerCode?: string | null;
};

type DatabaseError = {
  code?: string;
  message?: string;
} | null;

const WRITABLE_TYPES: AccountType[] = [
  "cliente",
  "revendedor",
  "produtor",
  "empresa",
  "vendedor",
  "admin",
];

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isMissingSellerColumn(error: DatabaseError, column: string): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes(column.toLowerCase()) &&
    (error.code === "42703" ||
      error.code === "PGRST204" ||
      message.includes("does not exist") ||
      message.includes("schema cache"))
  );
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
      response: errorResponse("Apenas o Administrador Mestre pode gerenciar contas.", 403),
    } as const;
  }

  return { supabaseAdmin } as const;
}

function effectiveAccountType(
  profileType: unknown,
  isAdmin: boolean,
  isSeller: boolean,
): AccountType {
  if (isAdmin) return "admin";
  if (isSeller) return "vendedor";
  return (typeof profileType === "string" ? profileType : "cliente") as AccountType;
}

function readSellerCode(appMetadata: Record<string, unknown> | null | undefined): string | null {
  const value = appMetadata?.seller_code;
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

export const Route = createFileRoute("/api/admin/account-type")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = await authorizeMasterAdmin(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin } = authorization;
        const {
          invalidateAuthUsersCache,
          listAllAuthUsers,
          resolveSellerIdentity,
        } = await import("@/lib/seller-system.server");

        const userId = new URL(request.url).searchParams.get("userId")?.trim();
        if (userId) {
          const [targetResult, profileResult, rolesResult] = await Promise.all([
            supabaseAdmin.auth.admin.getUserById(userId),
            supabaseAdmin.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
            supabaseAdmin
              .from("user_roles")
              .select("role")
              .eq("user_id", userId)
              .eq("role", "admin"),
          ]);

          if (targetResult.error || !targetResult.data.user) {
            return errorResponse("Conta não encontrada.", 404);
          }
          if (profileResult.error) return errorResponse(profileResult.error.message, 500);
          if (rolesResult.error) return errorResponse(rolesResult.error.message, 500);

          const seller = await resolveSellerIdentity(supabaseAdmin, targetResult.data.user);
          invalidateAuthUsersCache();
          return Response.json(
            {
              accountType: effectiveAccountType(
                profileResult.data?.account_type,
                (rolesResult.data ?? []).length > 0,
                Boolean(seller),
              ),
              sellerCode: seller ? readSellerCode(targetResult.data.user.app_metadata) : null,
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        const sellerIds: string[] = [];
        const users = await listAllAuthUsers(supabaseAdmin);
        for (const user of users) {
          if (await resolveSellerIdentity(supabaseAdmin, user)) sellerIds.push(user.id);
        }
        invalidateAuthUsersCache();
        return Response.json(
          { sellerIds },
          { headers: { "Cache-Control": "no-store" } },
        );
      },

      POST: async ({ request }) => {
        const authorization = await authorizeMasterAdmin(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin } = authorization;
        const { invalidateAuthUsersCache, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");

        let payload: UpdatePayload;
        try {
          payload = (await request.json()) as UpdatePayload;
        } catch {
          return errorResponse("Dados inválidos.", 400);
        }

        const userId = payload.userId?.trim();
        if (!userId) return errorResponse("Conta não informada.", 400);

        const sellerCodeWasProvided = Object.prototype.hasOwnProperty.call(payload, "sellerCode");
        if (!payload.accountType && sellerCodeWasProvided) {
          const targetResult = await supabaseAdmin.auth.admin.getUserById(userId);
          if (targetResult.error || !targetResult.data.user) {
            return errorResponse("Conta não encontrada.", 404);
          }

          const targetEmail = (targetResult.data.user.email ?? "").toLowerCase();
          if (targetEmail === PROTECTED_ADMIN_EMAIL.toLowerCase()) {
            return errorResponse("Esta conta é protegida.", 403);
          }

          const seller = await resolveSellerIdentity(supabaseAdmin, targetResult.data.user);
          if (!seller) return errorResponse("Esta conta não está configurada como vendedor.", 400);

          const sellerCode = typeof payload.sellerCode === "string" ? payload.sellerCode.trim() : "";
          if (sellerCode.length > 50) {
            return errorResponse("O código do vendedor deve ter no máximo 50 caracteres.", 400);
          }

          const currentAppMetadata = {
            ...(targetResult.data.user.app_metadata ?? {}),
          } as Record<string, unknown>;
          const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            app_metadata: {
              ...currentAppMetadata,
              seller_code: sellerCode || null,
            },
          });
          if (metadataError) return errorResponse(metadataError.message, 500);

          invalidateAuthUsersCache();
          return Response.json({
            ok: true,
            accountType: "vendedor",
            sellerCode: sellerCode || null,
          });
        }

        const accountType = payload.accountType;
        if (!accountType || !WRITABLE_TYPES.includes(accountType)) {
          return errorResponse("Tipo de conta inválido.", 400);
        }

        const [targetResult, profileResult] = await Promise.all([
          supabaseAdmin.auth.admin.getUserById(userId),
          supabaseAdmin
            .from("profiles")
            .select("id, account_type, email, full_name")
            .eq("id", userId)
            .maybeSingle(),
        ]);

        if (targetResult.error || !targetResult.data.user) {
          return errorResponse("Conta não encontrada.", 404);
        }
        if (profileResult.error) return errorResponse(profileResult.error.message, 500);
        if (!profileResult.data) return errorResponse("Conta não encontrada.", 404);

        const targetEmail = (
          targetResult.data.user.email ??
          profileResult.data.email ??
          ""
        ).toLowerCase();
        if (targetEmail === PROTECTED_ADMIN_EMAIL.toLowerCase()) {
          return errorResponse("Esta conta é protegida.", 403);
        }

        const currentUserMetadata = {
          ...(targetResult.data.user.user_metadata ?? {}),
        } as Record<string, unknown>;
        const currentAppMetadata = {
          ...(targetResult.data.user.app_metadata ?? {}),
        } as Record<string, unknown>;
        const sellerSlug = `conta-${userId}`;

        if (accountType === "vendedor") {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ account_type: "cliente" })
            .eq("id", userId);
          if (profileError) return errorResponse(profileError.message, 500);

          const sellerName =
            profileResult.data.full_name ||
            profileResult.data.email ||
            targetResult.data.user.email ||
            `Vendedor ${userId.slice(0, 8)}`;

          let { data: linkedSeller, error: sellerLookupError } = await supabaseAdmin
            .from("sellers")
            .select("id")
            .eq("slug", sellerSlug)
            .maybeSingle();
          if (sellerLookupError) return errorResponse(sellerLookupError.message, 500);

          if (!linkedSeller) {
            const creation = await supabaseAdmin
              .from("sellers")
              .insert({ name: sellerName, slug: sellerSlug, active: true })
              .select("id")
              .single();

            if (creation.error?.code === "23505") {
              const retry = await supabaseAdmin
                .from("sellers")
                .select("id")
                .eq("slug", sellerSlug)
                .maybeSingle();
              linkedSeller = retry.data;
              sellerLookupError = retry.error;
            } else {
              linkedSeller = creation.data;
              sellerLookupError = creation.error;
            }
          }

          if (sellerLookupError || !linkedSeller) {
            return errorResponse(
              sellerLookupError?.message ?? "Não foi possível criar o cadastro interno do vendedor.",
              500,
            );
          }

          const { error: activeError } = await supabaseAdmin
            .from("sellers")
            .update({ active: true, name: sellerName })
            .eq("id", linkedSeller.id);
          if (activeError) return errorResponse(activeError.message, 500);

          const optionalUpdates = [
            supabaseAdmin
              .from("sellers")
              .update({ show_on_team: false } as never)
              .eq("id", linkedSeller.id),
            supabaseAdmin
              .from("sellers")
              .update({ user_id: userId } as never)
              .eq("id", linkedSeller.id),
          ];

          const [teamResult, userLinkResult] = await Promise.all(optionalUpdates);
          if (
            teamResult.error &&
            !isMissingSellerColumn(teamResult.error, "show_on_team")
          ) {
            console.error("[account-type] Falha ao ocultar vendedor interno:", teamResult.error.message);
          }
          if (
            userLinkResult.error &&
            !isMissingSellerColumn(userLinkResult.error, "user_id")
          ) {
            console.error("[account-type] Falha ao vincular conta ao vendedor:", userLinkResult.error.message);
          }

          const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            app_metadata: {
              ...currentAppMetadata,
              account_type_override: "vendedor",
              seller_record_id: linkedSeller.id,
            },
            user_metadata: {
              ...currentUserMetadata,
              account_type_override: null,
              seller_record_id: null,
            },
          });
          if (metadataError) return errorResponse(metadataError.message, 500);

          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", "admin");
          if (roleError) return errorResponse(roleError.message, 500);

          invalidateAuthUsersCache();
          return Response.json({
            ok: true,
            accountType: "vendedor",
            sellerCode: readSellerCode(currentAppMetadata),
          });
        }

        const { error: deactivateError } = await supabaseAdmin
          .from("sellers")
          .update({ active: false })
          .eq("slug", sellerSlug);
        if (deactivateError) return errorResponse(deactivateError.message, 500);

        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...currentAppMetadata,
            account_type_override: null,
            seller_record_id: null,
            seller_code: null,
          },
          user_metadata: {
            ...currentUserMetadata,
            account_type_override: null,
            seller_record_id: null,
          },
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
            .upsert({ user_id: userId, role: "admin" } as any, {
              onConflict: "user_id,role",
            });
          if (roleError) return errorResponse(roleError.message, 500);
        } else {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", "admin");
          if (roleError) return errorResponse(roleError.message, 500);
        }

        invalidateAuthUsersCache();
        return Response.json({ ok: true, accountType });
      },
    },
  },
});
