-- Payments record Pix transfers already made by the administrator.
-- Sale commissions remain immutable; settlement lines identify exactly what was paid.
CREATE TABLE public.partner_commission_payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid NOT NULL REFERENCES public.dukamp_partners(id),
 partner_name text NOT NULL,
 amount numeric(12,2) NOT NULL CHECK(amount>0 AND amount<>'NaN'::numeric),
 paid_sales_count integer NOT NULL CHECK(paid_sales_count>0),
 pix_key_snapshot text NOT NULL DEFAULT '',
 paid_at timestamptz NOT NULL DEFAULT now(),
 paid_by uuid NOT NULL REFERENCES auth.users(id),
 request_token uuid NOT NULL,
 balance_token text NOT NULL,
 UNIQUE(partner_id,request_token)
);
CREATE INDEX partner_commission_payouts_history ON public.partner_commission_payouts(partner_id,paid_at DESC,id);
CREATE TABLE public.partner_commission_payout_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 payout_id uuid NOT NULL REFERENCES public.partner_commission_payouts(id) ON DELETE RESTRICT,
 request_sale_id uuid UNIQUE REFERENCES public.partner_sale_requests(id),
 referral_order_id uuid UNIQUE REFERENCES public.orders(id),
 amount numeric(12,2) NOT NULL CHECK(amount>0 AND amount<>'NaN'::numeric),
 CHECK(num_nonnulls(request_sale_id,referral_order_id)=1)
);
CREATE INDEX partner_commission_payout_items_payment ON public.partner_commission_payout_items(payout_id);
ALTER TABLE public.partner_commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commission_payout_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_commission_payouts,public.partner_commission_payout_items FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.partner_commission_payouts,public.partner_commission_payout_items FROM service_role;
GRANT SELECT,INSERT ON public.partner_commission_payouts,public.partner_commission_payout_items TO service_role;
CREATE TRIGGER dukamp_audit_changes AFTER INSERT ON public.partner_commission_payouts FOR EACH ROW EXECUTE FUNCTION dukamp_private.capture_audit();

-- Old assisted checkouts already retained their commission. Only unpaid credits
-- from the current approval flow and legacy storefront referrals are payable.
CREATE VIEW public.partner_commission_open_credits WITH(security_invoker=true) AS
 SELECT r.partner_id,r.id AS sale_id,'request'::text AS source,r.commission_amount AS amount
 FROM public.partner_sale_requests r
 WHERE r.approval_status='approved' AND r.delivery_status<>'cancelada' AND r.commission_amount>0
 AND NOT EXISTS(SELECT 1 FROM public.partner_commission_payout_items i WHERE i.request_sale_id=r.id)
 UNION ALL
 SELECT o.origin_partner_id,o.id,'referral'::text,o.origin_commission_amount
 FROM public.orders o WHERE o.origin_partner_id IS NOT NULL AND o.payment_status='approved'
 AND o.delivery_status<>'cancelada' AND o.refund_status='none' AND o.origin_commission_amount>0
 AND NOT EXISTS(SELECT 1 FROM public.partner_commission_payout_items i WHERE i.referral_order_id=o.id);
REVOKE ALL ON public.partner_commission_open_credits FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.partner_commission_open_credits TO service_role;

CREATE FUNCTION public.get_partner_commission_account(p_partner uuid) RETURNS jsonb
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object(
  'balance',coalesce(sum(c.amount),0),
  'sales_count',count(c.sale_id),
  'balance_token',md5(jsonb_build_object('credits',coalesce(jsonb_agg(jsonb_build_object('id',c.sale_id,'source',c.source,'amount',c.amount) ORDER BY c.source,c.sale_id) FILTER(WHERE c.sale_id IS NOT NULL),'[]'::jsonb),
   'pix_key',coalesce((SELECT pix_key FROM public.dukamp_partners WHERE id=p_partner),''))::text),
  'pix_key',(SELECT pix_key FROM public.dukamp_partners WHERE id=p_partner),
  'partner_name',(SELECT razao_social FROM public.dukamp_partners WHERE id=p_partner),
  'credits',coalesce(jsonb_agg(jsonb_build_object('id',c.sale_id,'source',c.source,'amount',c.amount) ORDER BY c.source,c.sale_id) FILTER(WHERE c.sale_id IS NOT NULL),'[]'::jsonb),
  'paid_total',coalesce((SELECT sum(p.amount) FROM public.partner_commission_payouts p WHERE p.partner_id=p_partner),0)
 ) FROM public.partner_commission_open_credits c WHERE c.partner_id=p_partner;
$$;
REVOKE ALL ON FUNCTION public.get_partner_commission_account(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_commission_account(uuid) TO service_role;

CREATE FUNCTION public.confirm_partner_commission_payout(p_actor uuid,p_partner uuid,p_request uuid,p_expected_amount numeric,p_balance_token text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE partner public.dukamp_partners%ROWTYPE; existing public.partner_commission_payouts%ROWTYPE;
 account jsonb; credit jsonb; result public.partner_commission_payouts%ROWTYPE;
BEGIN
 IF p_actor IS NULL OR NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Apenas administradores podem confirmar pagamentos de comissão.'; END IF;
 SELECT * INTO partner FROM public.dukamp_partners WHERE id=p_partner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Parceiro não encontrado.'; END IF;
 SELECT * INTO existing FROM public.partner_commission_payouts WHERE partner_id=p_partner AND request_token=p_request;
 IF FOUND THEN
  IF existing.amount IS DISTINCT FROM p_expected_amount OR existing.balance_token IS DISTINCT FROM p_balance_token THEN RAISE EXCEPTION 'Esta confirmação já foi utilizada para outro pagamento.'; END IF;
  RETURN jsonb_build_object('id',existing.id,'amount',existing.amount,'paid_at',existing.paid_at);
 END IF;
 IF p_request IS NULL OR p_expected_amount IS NULL OR p_expected_amount='NaN'::numeric OR p_expected_amount<=0 OR round(p_expected_amount,2)<>p_expected_amount THEN RAISE EXCEPTION 'Informe um valor de comissão válido.'; END IF;
 account:=public.get_partner_commission_account(p_partner);
 -- Lock the previewed sales; payment/refund changes cannot invalidate a receipt mid-transaction.
 FOR credit IN SELECT value FROM jsonb_array_elements(account->'credits') LOOP
  IF credit->>'source'='request' THEN PERFORM 1 FROM public.partner_sale_requests WHERE id=(credit->>'id')::uuid FOR UPDATE;
  ELSE PERFORM 1 FROM public.orders WHERE id=(credit->>'id')::uuid FOR UPDATE; END IF;
 END LOOP;
 account:=public.get_partner_commission_account(p_partner);
 IF (account->>'balance')::numeric<=0 THEN RAISE EXCEPTION 'Este parceiro não possui comissão pendente de pagamento.'; END IF;
 IF (account->>'balance')::numeric IS DISTINCT FROM p_expected_amount OR account->>'balance_token' IS DISTINCT FROM p_balance_token THEN
  RAISE EXCEPTION 'O saldo ou a chave Pix mudou. Atualize os dados e confira o Pix antes de confirmar.';
 END IF;
 INSERT INTO public.partner_commission_payouts(partner_id,partner_name,amount,paid_sales_count,pix_key_snapshot,paid_by,request_token,balance_token)
 VALUES(partner.id,partner.razao_social,(account->>'balance')::numeric,(account->>'sales_count')::integer,partner.pix_key,p_actor,p_request,p_balance_token)
 RETURNING * INTO result;
 FOR credit IN SELECT value FROM jsonb_array_elements(account->'credits') LOOP
  INSERT INTO public.partner_commission_payout_items(payout_id,request_sale_id,referral_order_id,amount)
  VALUES(result.id,CASE WHEN credit->>'source'='request' THEN (credit->>'id')::uuid END,
   CASE WHEN credit->>'source'='referral' THEN (credit->>'id')::uuid END,(credit->>'amount')::numeric);
 END LOOP;
 RETURN jsonb_build_object('id',result.id,'amount',result.amount,'paid_at',result.paid_at);
END $$;
REVOKE ALL ON FUNCTION public.confirm_partner_commission_payout(uuid,uuid,uuid,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_partner_commission_payout(uuid,uuid,uuid,numeric,text) TO service_role;

CREATE OR REPLACE VIEW public.dukamp_partner_sales_summary WITH(security_invoker=true) AS
 SELECT p.id AS partner_id,count(f.id) AS registered_orders,
 count(f.id) FILTER(WHERE f.recognized) AS paid_orders,
 coalesce(sum(f.gross) FILTER(WHERE f.recognized),0) AS gross_total,
 coalesce(sum(f.commission) FILTER(WHERE f.recognized),0) AS commission_total,
 coalesce(sum(f.net) FILTER(WHERE f.recognized),0) AS dukamp_total,
 coalesce((SELECT sum(c.amount) FROM public.partner_commission_open_credits c WHERE c.partner_id=p.id),0) AS commission_balance,
 coalesce((SELECT sum(paid.amount) FROM public.partner_commission_payouts paid WHERE paid.partner_id=p.id),0) AS commission_paid_total
 FROM public.dukamp_partners p LEFT JOIN (
  SELECT coalesce(o.partner_id,o.origin_partner_id) AS partner_id,o.id,
   o.payment_status='approved' AND o.delivery_status<>'cancelada' AND o.refund_status='none' AS recognized,
   CASE WHEN o.partner_id IS NOT NULL THEN o.partner_gross_total ELSE o.subtotal+o.shipping_cost+coalesce(o.tax_amount,0) END AS gross,
   o.partner_commission_amount+o.origin_commission_amount AS commission,o.total AS net FROM public.orders o
   WHERE o.partner_id IS NOT NULL OR o.origin_partner_id IS NOT NULL
  UNION ALL
  SELECT r.partner_id,r.id,r.approval_status='approved',r.total,coalesce(r.commission_amount,0),r.total-coalesce(r.commission_amount,0)
  FROM public.partner_sale_requests r
 ) f ON f.partner_id=p.id GROUP BY p.id;

REVOKE ALL ON public.dukamp_partner_sales_summary FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.dukamp_partner_sales_summary TO service_role;

CREATE OR REPLACE VIEW public.partner_sales_feed WITH(security_invoker=true) AS
 SELECT o.id,coalesce(o.partner_id,o.origin_partner_id) AS partner_id,o.created_at,(to_jsonb(o)-ARRAY['shipping_error','correios_prepostagem_id','mp_status_updated_at']) ||
 jsonb_build_object('commission_paid_at',(SELECT paid.paid_at FROM public.partner_commission_payout_items item JOIN public.partner_commission_payouts paid ON paid.id=item.payout_id WHERE item.referral_order_id=o.id)) AS payload
 FROM public.orders o WHERE o.partner_id IS NOT NULL OR o.origin_partner_id IS NOT NULL
 UNION ALL
 SELECT r.id,r.partner_id,r.created_at,
  r.details || jsonb_build_object(
   'id',r.id,'order_number',r.order_number,'partner_id',r.partner_id,'partner_name',p.razao_social,
   'created_at',r.created_at,'request_kind','approval','approval_status',r.approval_status,
   'partner_gross_total',r.total,'partner_commission_amount',r.commission_amount,
   'commission_payout_month',r.payout_month,'commission_paid_at',(SELECT paid.paid_at FROM public.partner_commission_payout_items item JOIN public.partner_commission_payouts paid ON paid.id=item.payout_id WHERE item.request_sale_id=r.id),'approved_at',r.approved_at,'rejection_reason',r.rejection_reason,
   'subtotal',r.subtotal,'shipping_cost',r.shipping_cost,'total',r.total,
   'payment_status','not_required','payment_method','manual','delivery_status',r.delivery_status,
   'refund_status','none','tax_amount',0,'payment_fee',0,'order_items',r.items,'source_store_id',r.store_id)
 FROM public.partner_sale_requests r JOIN public.dukamp_partners p ON p.id=r.partner_id;

REVOKE ALL ON public.partner_sales_feed FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.partner_sales_feed TO service_role;
