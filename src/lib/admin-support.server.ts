import { isMasterAdminUserId } from "@/lib/constants";
import { authenticateRequest, errorResponse } from "@/lib/seller-system.server";

export async function authenticateSupportAdmin(request: Request) {
  const authorization = await authenticateRequest(request);
  if ("response" in authorization) return authorization;
  const { supabaseAdmin, user } = authorization;
  const { data: role, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (error)
    return { response: errorResponse("Não foi possível validar o administrador.", 500) } as const;
  if (!role && !isMasterAdminUserId(user.id)) {
    return { response: errorResponse("Acesso negado.", 403) } as const;
  }
  return authorization;
}

export async function handleSupportAction(request: Request) {
  const authorization = await authenticateSupportAdmin(request);
  if ("response" in authorization) return authorization.response;
  const { supabaseAdmin, user } = authorization;
  try {
    const body = await request.json();
    if (!/^[0-9a-f-]{36}$/i.test(body.ticketId || ""))
      return errorResponse("Atendimento inválido.", 400);
    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .eq("id", body.ticketId)
      .single();
    if (error || !ticket) return errorResponse("Atendimento não encontrado.", 404);
    let operation;
    if (body.action === "read") {
      operation = await supabaseAdmin
        .from("support_messages")
        .update({ read_by_admin: true })
        .eq("ticket_id", ticket.id)
        .in("sender_role", ["user", "customer"])
        .eq("read_by_admin", false);
    } else if (body.action === "close") {
      operation = await supabaseAdmin
        .from("support_tickets")
        .update({ status: "closed", closed_by: user.id, closed_at: new Date().toISOString() })
        .eq("id", ticket.id);
    } else if (body.action === "send") {
      if (ticket.status === "closed") return errorResponse("Atendimento encerrado.", 409);
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message || message.length > 5000)
        return errorResponse("Mensagem inválida (máximo de 5000 caracteres).", 400);
      operation = await supabaseAdmin.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: "admin",
        message,
        read_by_admin: true,
        read_by_user: false,
      });
    } else return errorResponse("Ação inválida.", 400);
    if (operation.error) throw operation.error;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-support] Falha na ação:", error);
    return errorResponse("Não foi possível atualizar o atendimento.", 500);
  }
}
