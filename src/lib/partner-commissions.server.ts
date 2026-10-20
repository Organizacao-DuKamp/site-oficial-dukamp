import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuditedAdminClient } from "./audit.server";
import { requirePartner, requirePartnerAdmin } from "./partners.server";

const database = (userId: string) => createAuditedAdminClient(userId, getRequest()) as SupabaseClient;
function check(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "Não foi possível consultar as comissões.");
}
export type PartnerCommissionPayment = {
  id: string; amount: number; paid_at: string; paid_sales_count: number; pix_key_snapshot: string;
};
export async function loadPartnerCommissionAccount(userId: string, input: { partnerId?: string; page: number }) {
  const db = database(userId);
  let partner;
  if (input.partnerId) {
    await requirePartnerAdmin(db, userId);
    const result = await db.from("dukamp_partners").select("id,razao_social,pix_key").eq("id", input.partnerId).single();
    check(result.error);
    if (!result.data) throw new Error("Parceiro não encontrado.");
    partner = result.data;
  } else partner = await requirePartner(db, userId);
  const [account, history] = await Promise.all([
    db.rpc("get_partner_commission_account", { p_partner: partner.id }),
    db.from("partner_commission_payouts")
      .select("id,amount,paid_at,paid_sales_count,pix_key_snapshot", { count: "exact" })
      .eq("partner_id", partner.id).order("paid_at", { ascending: false }).order("id")
      .range((input.page - 1) * 20, input.page * 20 - 1),
  ]);
  check(account.error); check(history.error);
  return {
    partner_id: partner.id as string, partner_name: account.data.partner_name as string, pix_key: (account.data.pix_key || "") as string,
    balance: Number(account.data.balance), paid_total: Number(account.data.paid_total),
    sales_count: Number(account.data.sales_count), balance_token: account.data.balance_token as string,
    history: (history.data || []) as PartnerCommissionPayment[], count: history.count || 0, page: input.page,
  };
}
export async function settlePartnerCommission(userId: string, input: {
  partnerId: string; requestId: string; amount: number; balanceToken: string;
}) {
  const db = database(userId);
  await requirePartnerAdmin(db, userId);
  const result = await db.rpc("confirm_partner_commission_payout", {
    p_actor: userId, p_partner: input.partnerId, p_request: input.requestId,
    p_expected_amount: input.amount, p_balance_token: input.balanceToken,
  });
  check(result.error);
  return result.data as { id: string; amount: number; paid_at: string };
}
