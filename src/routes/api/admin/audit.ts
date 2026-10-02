import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/admin/audit")({ server: { handlers: {
  GET: async ({ request }) => {
    const { authenticateSupportAdmin } = await import("@/lib/admin-support.server");
    const auth = await authenticateSupportAdmin(request);
    if ("response" in auth) return auth.response;
    const query = new URL(request.url).searchParams;
    const id = query.get("id");
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error:"Registro inválido" }, { status:400 });
      const { data, error } = await auth.supabaseAdmin.from("audit_logs").select("*").eq("id",id).maybeSingle();
      if (error || !data) return Response.json({ error:"Registro não encontrado" }, { status:404 });
      return Response.json(data, { headers:{ "Cache-Control":"no-store" } });
    }
    const page = Math.max(0, Math.min(100000, Number(query.get("page")) || 0));
    const table = query.get("table"); const action = query.get("action");
    let builder = auth.supabaseAdmin.from("audit_logs").select("id,created_at,actor_id,actor_name,actor_email,actor_ip,action,entity_table,entity_id,changed_fields,source", { count: "exact" })
      .order("created_at", { ascending: false }).order("id").range(page * 50, page * 50 + 49);
    if (table && /^[a-z_]+$/.test(table)) builder = builder.eq("entity_table", table);
    if (action && ["insert","update","delete","admin_login"].includes(action)) builder = builder.eq("action", action);
    const user = query.get("actor");
    if (user && /^[0-9a-f-]{36}$/i.test(user)) builder = builder.eq("actor_id",user);
    const since = query.get("since"); const until = query.get("until");
    if (since && Number.isFinite(Date.parse(since))) builder = builder.gte("created_at",new Date(since).toISOString());
    if (until && Number.isFinite(Date.parse(until))) builder = builder.lte("created_at",new Date(until).toISOString());
    const { data, count, error } = await builder;
    if (error) { console.error("[audit] consulta",error); return Response.json({ error:"Não foi possível carregar a auditoria" }, { status:500 }); }
    return Response.json({ rows:data || [], total:count || 0 }, { headers: { "Cache-Control":"no-store" } });
  },
  POST: async ({ request }) => {
    const { authenticateSupportAdmin } = await import("@/lib/admin-support.server");
    const auth = await authenticateSupportAdmin(request);
    if ("response" in auth) return auth.response;
    const { trustedRequestIp } = await import("@/lib/audit.server");
    const token = request.headers.get("authorization")!.replace(/^Bearer\s+/i, "");
    // auth.getUser above verified this token before its session claim is used.
    const claims = JSON.parse(Buffer.from(token.split(".")[1],"base64url").toString());
    if (!/^[0-9a-f-]{36}$/i.test(claims.session_id || "")) return Response.json({ error:"Sessão inválida" }, { status:400 });
    const { data: profile } = await auth.supabaseAdmin.from("profiles").select("full_name,email").eq("id",auth.user.id).maybeSingle();
    const { error } = await auth.supabaseAdmin.from("audit_logs").upsert({
      actor_id:auth.user.id, actor_name:profile?.full_name || null, actor_email:auth.user.email,
      actor_ip:trustedRequestIp(request), action:"admin_login", entity_table:"admin_access",
      entity_id:auth.user.id, session_id:claims.session_id, source:"server",
    }, { onConflict:"session_id",ignoreDuplicates:true });
    if (error) { console.error("[audit] acesso",error); return Response.json({ error:"Não foi possível registrar o acesso" }, { status:500 }); }
    return Response.json({ ok:true }, { headers: { "Cache-Control":"no-store" } });
  },
} } });
