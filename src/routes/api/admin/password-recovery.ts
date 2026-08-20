import { createFileRoute } from "@tanstack/react-router";

type ReviewPayload = {
  id?: string;
  decision?: "approve" | "reject";
};

function response(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function authorizeAdmin(request: Request) {
  const token = readBearerToken(request);
  if (!token) return { error: response({ error: "Não autorizado." }, { status: 401 }) } as const;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: response({ error: "Sessão inválida." }, { status: 401 }) } as const;
  }

  const { data: role, error: roleError } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (roleError || !role) {
    return { error: response({ error: "Acesso restrito ao administrativo." }, { status: 403 }) } as const;
  }

  return { supabaseAdmin: supabaseAdmin as any, reviewerId: userData.user.id } as const;
}

export const Route = createFileRoute("/api/admin/password-recovery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeAdmin(request);
        if ("error" in auth) return auth.error;

        let payload: ReviewPayload;
        try {
          payload = (await request.json()) as ReviewPayload;
        } catch {
          return response({ error: "Dados inválidos." }, { status: 400 });
        }

        const id = String(payload.id ?? "").trim();
        if (!id || !["approve", "reject"].includes(String(payload.decision))) {
          return response({ error: "Solicitação ou decisão inválida." }, { status: 400 });
        }

        const { data: current, error: currentError } = await auth.supabaseAdmin
          .from("password_recovery_requests")
          .select("id, user_id, status")
          .eq("id", id)
          .maybeSingle();

        if (currentError) return response({ error: currentError.message }, { status: 500 });
        if (!current) return response({ error: "Solicitação não encontrada." }, { status: 404 });
        if (current.status !== "pending") {
          return response({ error: "Esta solicitação já foi analisada." }, { status: 409 });
        }

        const now = new Date();
        const reviewedAt = now.toISOString();

        if (payload.decision === "reject") {
          const { error } = await auth.supabaseAdmin
            .from("password_recovery_requests")
            .update({
              status: "rejected",
              reviewed_by: auth.reviewerId,
              reviewed_at: reviewedAt,
              approved_expires_at: null,
              updated_at: reviewedAt,
            })
            .eq("id", id)
            .eq("status", "pending");
          if (error) return response({ error: error.message }, { status: 500 });
          return response({ ok: true, status: "rejected" });
        }

        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

        await auth.supabaseAdmin
          .from("password_recovery_requests")
          .update({ status: "rejected", reviewed_by: auth.reviewerId, reviewed_at: reviewedAt, updated_at: reviewedAt })
          .eq("user_id", current.user_id)
          .eq("status", "pending")
          .neq("id", id);

        await auth.supabaseAdmin
          .from("password_recovery_requests")
          .update({ status: "expired", updated_at: reviewedAt })
          .eq("user_id", current.user_id)
          .eq("status", "approved")
          .neq("id", id);

        const { data: approved, error: approveError } = await auth.supabaseAdmin
          .from("password_recovery_requests")
          .update({
            status: "approved",
            reviewed_by: auth.reviewerId,
            reviewed_at: reviewedAt,
            approved_expires_at: expiresAt,
            updated_at: reviewedAt,
          })
          .eq("id", id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();

        if (approveError) return response({ error: approveError.message }, { status: 500 });
        if (!approved) return response({ error: "A solicitação mudou de status. Atualize a página." }, { status: 409 });

        return response({ ok: true, status: "approved", expiresAt });
      },
    },
  },
});
