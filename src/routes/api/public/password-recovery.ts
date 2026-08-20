import { createFileRoute } from "@tanstack/react-router";

type RecoveryAction = "request" | "check" | "reset";

type RecoveryPayload = {
  action?: RecoveryAction;
  email?: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  token?: string;
  newPassword?: string;
};

function noStore(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

function digits(value: unknown, max = 30) {
  return String(value ?? "").replace(/\D/g, "").slice(0, max);
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && parsed <= new Date();
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function findProfileByEmail(supabaseAdmin: any, email: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, cpf, phone")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function handleRequest(supabaseAdmin: any, payload: RecoveryPayload) {
  const email = normalizeEmail(payload.email);
  const cpf = digits(payload.cpf, 11);
  const phone = digits(payload.phone, 11);
  const birthDate = String(payload.birthDate ?? "").trim();

  if (!validEmail(email)) return noStore({ error: "Informe um e-mail válido." }, { status: 400 });
  if (cpf.length !== 11) return noStore({ error: "Informe um CPF com 11 dígitos." }, { status: 400 });
  if (phone.length < 10 || phone.length > 11) return noStore({ error: "Informe um telefone válido." }, { status: 400 });
  if (!validDate(birthDate)) return noStore({ error: "Informe uma data de nascimento válida." }, { status: 400 });

  const browserToken = randomToken();
  const browserTokenHash = await hashToken(browserToken);

  try {
    const profile = await findProfileByEmail(supabaseAdmin, email);
    if (profile?.id) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabaseAdmin
        .from("password_recovery_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("created_at", oneHourAgo);
      if (countError) throw countError;

      if ((count ?? 0) < 5) {
        const { error: insertError } = await supabaseAdmin.from("password_recovery_requests").insert({
          user_id: profile.id,
          email,
          account_name: profile.full_name || null,
          submitted_cpf: cpf,
          submitted_birth_date: birthDate,
          submitted_phone: phone,
          account_cpf: digits(profile.cpf, 11) || null,
          account_phone: digits(profile.phone, 11) || null,
          browser_token_hash: browserTokenHash,
          status: "pending",
        });
        if (insertError) throw insertError;
      }
    }
  } catch (error) {
    console.error("[password-recovery] Falha ao registrar solicitação:", error);
  }

  return noStore({
    ok: true,
    token: browserToken,
    message: "Se houver uma conta com esse e-mail, a solicitação será encaminhada para análise.",
  });
}

async function handleCheck(supabaseAdmin: any, payload: RecoveryPayload) {
  const email = normalizeEmail(payload.email);
  const token = String(payload.token ?? "").trim();
  if (!validEmail(email) || token.length < 32) return noStore({ status: "none" });

  const tokenHash = await hashToken(token);
  const { data, error } = await supabaseAdmin
    .from("password_recovery_requests")
    .select("id, status, approved_expires_at")
    .eq("email", email)
    .eq("browser_token_hash", tokenHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[password-recovery] Falha ao consultar solicitação:", error);
    return noStore({ status: "none" });
  }
  if (!data) return noStore({ status: "none" });

  if (data.status === "approved") {
    const expiresAt = data.approved_expires_at ? new Date(data.approved_expires_at).getTime() : 0;
    if (!expiresAt || expiresAt <= Date.now()) {
      await supabaseAdmin
        .from("password_recovery_requests")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("status", "approved");
      return noStore({ status: "expired" });
    }
  }

  return noStore({ status: data.status });
}

async function handleReset(supabaseAdmin: any, payload: RecoveryPayload) {
  const email = normalizeEmail(payload.email);
  const token = String(payload.token ?? "").trim();
  const newPassword = String(payload.newPassword ?? "");

  if (!validEmail(email) || token.length < 32) return noStore({ error: "Autorização inválida." }, { status: 403 });
  if (newPassword.length < 6) return noStore({ error: "A nova senha deve ter no mínimo 6 caracteres." }, { status: 400 });

  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("password_recovery_requests")
    .update({ status: "used", used_at: now, updated_at: now })
    .eq("email", email)
    .eq("browser_token_hash", tokenHash)
    .eq("status", "approved")
    .gt("approved_expires_at", now)
    .select("id, user_id")
    .limit(1)
    .maybeSingle();

  if (claimError || !claimed?.user_id) {
    if (claimError) console.error("[password-recovery] Falha ao consumir autorização:", claimError);
    return noStore({ error: "A autorização expirou ou já foi utilizada." }, { status: 403 });
  }

  const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(claimed.user_id, {
    password: newPassword,
  });

  if (passwordError) {
    console.error("[password-recovery] Falha ao atualizar senha:", passwordError);
    await supabaseAdmin
      .from("password_recovery_requests")
      .update({ status: "approved", used_at: null, updated_at: new Date().toISOString() })
      .eq("id", claimed.id)
      .eq("status", "used");
    return noStore({ error: "Não foi possível redefinir a senha agora. Tente novamente." }, { status: 500 });
  }

  await supabaseAdmin
    .from("password_recovery_requests")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", claimed.user_id)
    .neq("id", claimed.id)
    .in("status", ["pending", "approved"]);

  return noStore({ ok: true });
}

export const Route = createFileRoute("/api/public/password-recovery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: RecoveryPayload;
        try {
          payload = (await request.json()) as RecoveryPayload;
        } catch {
          return noStore({ error: "Dados inválidos." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (payload.action === "request") return handleRequest(supabaseAdmin as any, payload);
        if (payload.action === "check") return handleCheck(supabaseAdmin as any, payload);
        if (payload.action === "reset") return handleReset(supabaseAdmin as any, payload);
        return noStore({ error: "Ação inválida." }, { status: 400 });
      },
    },
  },
});
