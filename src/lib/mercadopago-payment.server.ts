import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ProviderPayment = {
  id: string | number;
  status: string;
  external_reference?: string;
  transaction_amount: number;
  currency_id: string;
  date_last_updated: string;
};

export async function fetchProviderPayment(paymentId: string): Promise<ProviderPayment> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
  if (!/^\d+$/.test(paymentId)) throw new Error("Identificador de pagamento inválido");
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Consulta ao Mercado Pago falhou (${response.status})`);
  const payment = (await response.json()) as ProviderPayment;
  if (String(payment.id) !== paymentId)
    throw new Error("Pagamento retornado não corresponde à consulta");
  return payment;
}

export async function applyProviderPayment(payment: ProviderPayment) {
  if (
    !payment.external_reference ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(payment.external_reference)
  )
    return null;
  if (payment.currency_id !== "BRL" || !Number.isFinite(payment.transaction_amount)) {
    throw new Error("Valor/moeda do pagamento inválido");
  }
  const statuses = ["pending", "in_process", "approved", "rejected", "cancelled", "refunded"];
  const status = payment.status === "charged_back" ? "refunded" : payment.status;
  if (!statuses.includes(status))
    throw new Error(`Status de pagamento não suportado: ${payment.status}`);
  // One transaction locks the order, validates the amount and deducts stock only once.
  const { data, error } = await (supabaseAdmin as any).rpc("reconcile_mercadopago_payment", {
    p_order_id: payment.external_reference,
    p_payment_id: String(payment.id),
    p_status: status,
    p_amount: payment.transaction_amount,
    p_provider_updated_at: payment.date_last_updated,
  });
  if (error) throw error;
  const result = data as { payment_status: string; newly_paid: boolean } | null;
  if (result?.newly_paid) {
    try {
      const { generateLabelForOrder } = await import("@/lib/shipping-generate.server");
      await generateLabelForOrder(supabaseAdmin, payment.external_reference);
    } catch (error) {
      console.error("[Correios] geração automática de etiqueta falhou", {
        orderId: payment.external_reference,
        message: (error as Error).message,
      });
    }
  }
  return result;
}

export async function refreshOrderPayment(orderId: string, paymentId: string) {
  const payment = await fetchProviderPayment(paymentId);
  if (payment.external_reference !== orderId) throw new Error("Pagamento não pertence ao pedido");
  return applyProviderPayment(payment);
}

// Only call with rows already authorized for the current customer/admin.
export async function refreshPendingOrderPayments<T extends {
  id: string; mp_payment_id: string | null; payment_status: string;
}>(orders: T[]): Promise<T[]> {
  const rows = orders.map((order) => ({ ...order }));
  const pending = rows.filter((order) => order.mp_payment_id &&
    ["pending", "in_process"].includes(order.payment_status));
  for (let offset = 0; offset < pending.length; offset += 5) {
    await Promise.all(pending.slice(offset, offset + 5).map(async (order) => {
      try {
        const result = await refreshOrderPayment(order.id, order.mp_payment_id!);
        if (result) order.payment_status = result.payment_status;
      } catch (error) {
        console.error("[MercadoPago] Consulta da lista de pedidos falhou", {
          orderId: order.id, message: (error as Error).message,
        });
      }
    }));
  }
  return rows;
}
