import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type { DeliveryStatus } from "@/lib/order-fulfillment";

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as any)
      .from("orders")
      .select(
        "*",
      )
      .eq("user_id", userId)
      .in("payment_status", ["approved", "in_process", "refunded", "cancelled"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyDeliveryNotices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_number")
      .eq("user_id", userId)
      .eq("delivery_status", "entregue")
      .eq("delivery_notified", false)
      .eq("payment_status", "approved");
    if (error) throw new Error(error.message);
    // fetch product names via order_items
    const withNames: Array<{ id: string; order_number: string; product_names: string[] }> = [];
    for (const o of data ?? []) {
      const { data: items } = await supabase
        .from("order_items")
        .select("name")
        .eq("order_id", o.id);
      withNames.push({
        id: o.id,
        order_number: o.order_number,
        product_names: (items ?? []).map((i: any) => i.name),
      });
    }
    return withNames;
  });

export const markDeliveryNotified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("orders")
      .update({ delivery_notified: true })
      .eq("id", data.orderId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin ----------

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        onlyOpen: z.boolean().optional(),
        orderId: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = (supabase as any)
      .from("orders")
      .select(
        "*",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.orderId) q = q.eq("id", data.orderId);
    if (data.onlyOpen) {
      q = q.eq("payment_status", "approved").neq("delivery_status", "entregue");
    } else {
      // Só mostra pedidos com pagamento confirmado (esconde pendentes/qr abertos)
      q = q.in("payment_status", ["approved", "in_process", "rejected", "cancelled", "refunded"]);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateDeliveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["preparando", "pronto", "a_caminho", "entregue"]),
        pickupLocation: z.enum(["rio_preto", "monte_aprazivel"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { getRequest } = await import("@tanstack/react-start/server");
    const { createAuditedAdminClient } = await import("@/lib/audit.server");
    const admin = createAuditedAdminClient(userId, getRequest());
    const { error } = await admin.rpc("manage_order_fulfillment", {
      p_order_id: data.orderId, p_actor_id: userId, p_action: "status",
      p_status: data.status, p_pickup_location: data.pickupLocation || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSalesStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: rows, error } = await supabase
      .from("orders")
      .select("total,payment_status,delivery_status,created_at")
      .gte("created_at", since.toISOString());
    if (error) throw new Error(error.message);

    const approved = (rows ?? []).filter((r: any) => r.payment_status === "approved");
    const bruto = approved.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
    // Mercado Pago Pix ~0.99% (aprox). Ajustável no futuro.
    const taxaPct = 0.0099;
    const taxas = bruto * taxaPct;
    const liquido = bruto - taxas;

    // Vendas por dia — últimos 7 dias
    const days: Array<{ date: string; label: string; total: number; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
      days.push({ date: key, label, total: 0, count: 0 });
    }
    for (const r of approved) {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      const bucket = days.find((d) => d.date === key);
      if (bucket) {
        bucket.total += Number(r.total || 0);
        bucket.count += 1;
      }
    }

    return {
      period: "30d",
      bruto,
      liquido,
      taxas,
      taxaPct,
      ordersCount: approved.length,
      pendingCount: (rows ?? []).filter((r: any) => r.payment_status === "pending").length,
      openDeliveries: approved.filter((r: any) => r.delivery_status !== "entregue").length,
      week: days,
    };
  });

export const manageOrderFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    orderId: z.string().uuid(),
    action: z.enum(["cancel", "refunded", "location"]),
    pickupLocation: z.enum(["rio_preto", "monte_aprazivel"]).optional(),
    reason: z.string().trim().min(3).max(1000).optional(),
    requestRefund: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { createAuditedAdminClient } = await import("@/lib/audit.server");
    const admin = createAuditedAdminClient(context.userId, getRequest());
    const { data: result, error } = await admin.rpc("manage_order_fulfillment", {
      p_order_id: data.orderId, p_actor_id: context.userId, p_action: data.action,
      p_pickup_location: data.pickupLocation || null, p_reason: data.reason || null,
      p_request_refund: data.requestRefund,
    });
    if (error) throw new Error(error.message);
    return result;
  });
