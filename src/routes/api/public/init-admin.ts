import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "dukamp8442@dukamp.local";
const ADMIN_PASSWORD = "84423697";

export const Route = createFileRoute("/api/public/init-admin")({
  server: {
    handlers: {
      GET: async () => handle(),
      POST: async () => handle(),
    },
  },
});

async function handle() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let userId: string | undefined;
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) return Response.json({ error: listErr.message }, { status: 500 });
  const existing = list.users.find((u) => u.email === ADMIN_EMAIL);

  if (existing) {
    userId = existing.id;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    userId = data.user?.id;
  }

  if (!userId) return Response.json({ error: "no user id" }, { status: 500 });

  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) return Response.json({ error: roleErr.message }, { status: 500 });

  return Response.json({ ok: true, userId, email: ADMIN_EMAIL });
}
