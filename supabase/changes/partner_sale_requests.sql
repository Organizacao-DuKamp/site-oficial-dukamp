-- Commercial requests are deliberately separate from payment-confirmed orders.
-- Existing Mercado Pago history, stock reconciliation and financial ledgers stay intact.
ALTER TABLE public.dukamp_partners ADD COLUMN pix_key text NOT NULL DEFAULT '' CHECK(length(pix_key)<=180);

CREATE TABLE public.partner_sale_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_number text NOT NULL UNIQUE DEFAULT ('DKP'||to_char(now(),'YYMMDD')||substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 partner_id uuid NOT NULL REFERENCES public.dukamp_partners(id),
 quote_id uuid UNIQUE REFERENCES public.dukamp_partner_quotes(id),
 store_id uuid REFERENCES public.partner_stores(id),
 request_key uuid NOT NULL, request_hash text NOT NULL,
 details jsonb NOT NULL CHECK(jsonb_typeof(details)='object'),
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array' AND jsonb_array_length(items)>0),
 subtotal numeric(12,2) NOT NULL CHECK(subtotal>0),
 shipping_cost numeric(12,2) NOT NULL CHECK(shipping_cost>=0),
 total numeric(12,2) NOT NULL CHECK(total=subtotal+shipping_cost),
 approval_status text NOT NULL DEFAULT 'pending' CHECK(approval_status IN('pending','approved','rejected')),
 commission_amount numeric(12,2) CHECK(commission_amount>=0 AND commission_amount<=total),
 approved_at timestamptz, approved_by uuid REFERENCES auth.users(id), payout_month date,
 rejection_reason text,
 delivery_status text NOT NULL DEFAULT 'preparando' CHECK(delivery_status IN('preparando','pronto','a_caminho','entregue','cancelada')),
 stock_deducted boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(partner_id,request_key),
 CHECK((quote_id IS NOT NULL AND store_id IS NULL) OR (quote_id IS NULL AND store_id IS NOT NULL)),
 CHECK((approval_status='approved' AND commission_amount IS NOT NULL AND approved_at IS NOT NULL AND approved_by IS NOT NULL AND payout_month IS NOT NULL AND stock_deducted)
   OR (approval_status<>'approved' AND commission_amount IS NULL AND approved_at IS NULL AND approved_by IS NULL AND payout_month IS NULL AND NOT stock_deducted))
);
CREATE INDEX partner_sale_requests_partner_created ON public.partner_sale_requests(partner_id,created_at DESC);
CREATE INDEX partner_sale_requests_store_created ON public.partner_sale_requests(store_id,created_at DESC) WHERE store_id IS NOT NULL;
ALTER TABLE public.partner_sale_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_sale_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.partner_sale_requests TO service_role;
CREATE TRIGGER partner_sale_requests_updated_at BEFORE UPDATE ON public.partner_sale_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER dukamp_audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.partner_sale_requests FOR EACH ROW EXECUTE FUNCTION dukamp_private.capture_audit();

CREATE FUNCTION public.submit_partner_sale_request(
 p_actor uuid,p_partner uuid,p_quote uuid,p_store uuid,p_key uuid,p_hash text,
 p_details jsonb,p_items jsonb,p_subtotal numeric,p_shipping numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.partner_sale_requests%ROWTYPE; q public.dukamp_partner_quotes%ROWTYPE; partner public.dukamp_partners%ROWTYPE;
BEGIN
 SELECT * INTO partner FROM public.dukamp_partners WHERE id=p_partner AND user_id=p_actor AND active AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Parceiro não autorizado ou desativado.'; END IF;
 SELECT * INTO r FROM public.partner_sale_requests WHERE partner_id=p_partner AND request_key=p_key;
 IF FOUND THEN
  IF r.request_hash IS DISTINCT FROM p_hash THEN RAISE EXCEPTION 'Esta solicitação já foi usada. Abra a venda existente ou registre outra.'; END IF;
  RETURN to_jsonb(r);
 END IF;
 IF p_quote IS NOT NULL THEN
  SELECT * INTO q FROM public.dukamp_partner_quotes WHERE id=p_quote AND partner_id=p_partner FOR UPDATE;
  IF NOT FOUND OR q.order_id IS NOT NULL OR q.expires_at<=now() THEN RAISE EXCEPTION 'Simulação inválida, expirada ou já utilizada.'; END IF;
  IF q.subtotal IS DISTINCT FROM p_subtotal OR q.shipping_cost IS DISTINCT FROM p_shipping OR p_store IS NOT NULL THEN RAISE EXCEPTION 'Valores diferentes da simulação.'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.partner_stores WHERE id=p_store AND partner_id=p_partner) THEN RAISE EXCEPTION 'Loja não autorizada.'; END IF;
 END IF;
 IF p_subtotal IS NULL OR p_subtotal<=0 OR p_shipping IS NULL OR p_shipping<0 OR jsonb_typeof(p_items)<>'array'
  OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100
  OR (SELECT sum((i->>'subtotal')::numeric) FROM jsonb_array_elements(p_items) i) IS DISTINCT FROM p_subtotal THEN RAISE EXCEPTION 'Valores ou itens inválidos.'; END IF;
 INSERT INTO public.partner_sale_requests(partner_id,quote_id,store_id,request_key,request_hash,details,items,subtotal,shipping_cost,total)
 VALUES(p_partner,p_quote,p_store,p_key,p_hash,p_details,p_items,p_subtotal,p_shipping,p_subtotal+p_shipping) RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.submit_partner_sale_request(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_partner_sale_request(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,numeric,numeric) TO service_role;

CREATE FUNCTION public.review_partner_sale_request(p_actor uuid,p_id uuid,p_action text,p_commission numeric DEFAULT NULL,p_reason text DEFAULT NULL,p_status text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.partner_sale_requests%ROWTYPE; i record; remaining integer; available boolean;
BEGIN
 IF p_actor IS NULL OR NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Apenas administradores podem confirmar vendas.'; END IF;
 SELECT * INTO r FROM public.partner_sale_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada.'; END IF;
 IF p_action='approve' THEN
  IF p_commission IS NULL OR p_commission='NaN'::numeric OR p_commission<0 OR p_commission>r.total OR round(p_commission,2)<>p_commission THEN RAISE EXCEPTION 'Informe uma comissão válida em reais, entre zero e o total da venda.'; END IF;
  IF r.approval_status='approved' AND r.commission_amount=p_commission THEN RETURN to_jsonb(r); END IF;
  IF r.approval_status<>'pending' THEN RAISE EXCEPTION 'Esta venda já foi analisada.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.dukamp_partners WHERE id=r.partner_id AND active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Parceiro desativado.'; END IF;
  FOR i IN SELECT (value->>'product_id')::uuid AS id,sum((value->>'quantity')::integer)::integer AS qty
    FROM jsonb_array_elements(r.items) GROUP BY 1 ORDER BY 1 LOOP
   IF i.qty IS NULL OR i.qty<=0 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
   IF r.store_id IS NULL THEN
    SELECT stock,active INTO remaining,available FROM public.products WHERE id=i.id FOR UPDATE;
   ELSE
    SELECT stock,active AND deleted_at IS NULL INTO remaining,available FROM public.partner_store_products WHERE id=i.id AND store_id=r.store_id FOR UPDATE;
   END IF;
   IF NOT FOUND OR NOT coalesce(available,false) OR remaining IS NULL OR remaining<i.qty THEN RAISE EXCEPTION 'Produto indisponível ou estoque insuficiente. Confira o pedido antes de aceitar.'; END IF;
   IF r.store_id IS NULL THEN UPDATE public.products SET stock=stock-i.qty WHERE id=i.id;
   ELSE UPDATE public.partner_store_products SET stock=stock-i.qty WHERE id=i.id AND store_id=r.store_id; END IF;
  END LOOP;
  UPDATE public.partner_sale_requests SET approval_status='approved',commission_amount=p_commission,approved_at=now(),approved_by=p_actor,
    payout_month=(date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 month')::date,stock_deducted=true WHERE id=r.id RETURNING * INTO r;
 ELSIF p_action='reject' THEN
  IF r.approval_status<>'pending' THEN RAISE EXCEPTION 'Esta venda já foi analisada.'; END IF;
  IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Informe o motivo da recusa.'; END IF;
  UPDATE public.partner_sale_requests SET approval_status='rejected',rejection_reason=trim(p_reason),delivery_status='cancelada' WHERE id=r.id RETURNING * INTO r;
 ELSIF p_action='delivery' THEN
  IF r.approval_status<>'approved' THEN RAISE EXCEPTION 'Confirme a venda antes de atualizar a entrega.'; END IF;
  IF p_status IS NULL OR p_status NOT IN('preparando','pronto','a_caminho','entregue')
   OR (r.details->>'fulfillment_method'='pickup' AND p_status='a_caminho')
   OR (r.details->>'fulfillment_method'<>'pickup' AND p_status='pronto') THEN RAISE EXCEPTION 'Etapa de entrega inválida.'; END IF;
  UPDATE public.partner_sale_requests SET delivery_status=p_status WHERE id=r.id RETURNING * INTO r;
 ELSE RAISE EXCEPTION 'Ação inválida.'; END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.review_partner_sale_request(uuid,uuid,text,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_partner_sale_request(uuid,uuid,text,numeric,text,text) TO service_role;

-- One pageable feed for historical paid orders and the new commercial workflow.
CREATE VIEW public.partner_sales_feed WITH(security_invoker=true) AS
 SELECT o.id,coalesce(o.partner_id,o.origin_partner_id) AS partner_id,o.created_at,(to_jsonb(o)-ARRAY['shipping_error','correios_prepostagem_id','mp_status_updated_at']) AS payload
 FROM public.orders o WHERE o.partner_id IS NOT NULL OR o.origin_partner_id IS NOT NULL
 UNION ALL
 SELECT r.id,r.partner_id,r.created_at,
  r.details || jsonb_build_object(
   'id',r.id,'order_number',r.order_number,'partner_id',r.partner_id,'partner_name',p.razao_social,
   'created_at',r.created_at,'request_kind','approval','approval_status',r.approval_status,
   'partner_gross_total',r.total,'partner_commission_amount',r.commission_amount,
   'commission_payout_month',r.payout_month,'approved_at',r.approved_at,'rejection_reason',r.rejection_reason,
   'subtotal',r.subtotal,'shipping_cost',r.shipping_cost,'total',r.total,
   'payment_status','not_required','payment_method','manual','delivery_status',r.delivery_status,
   'refund_status','none','tax_amount',0,'payment_fee',0,'order_items',r.items,'source_store_id',r.store_id)
 FROM public.partner_sale_requests r JOIN public.dukamp_partners p ON p.id=r.partner_id;
REVOKE ALL ON public.partner_sales_feed FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.partner_sales_feed TO service_role;

CREATE OR REPLACE VIEW public.dukamp_partner_sales_summary WITH(security_invoker=true) AS
 SELECT p.id AS partner_id,count(f.id) AS registered_orders,
 count(f.id) FILTER(WHERE f.recognized) AS paid_orders,
 coalesce(sum(f.gross) FILTER(WHERE f.recognized),0) AS gross_total,
 coalesce(sum(f.commission) FILTER(WHERE f.recognized),0) AS commission_total,
 coalesce(sum(f.net) FILTER(WHERE f.recognized),0) AS dukamp_total
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

UPDATE public.dukamp_partner_settings SET settings=jsonb_set(settings,'{partnership_terms}',
 to_jsonb('O parceiro registra o pedido sem pagamento. A Dukamp entra em contato com o cliente e confirma a compra. Após a confirmação, o administrador aceita a venda e informa a comissão em reais, que fica disponível no painel do parceiro. As comissões aprovadas no mês são pagas pela chave Pix cadastrada até o 10º dia útil do mês seguinte. Preços, estoque, frete e prazos são conferidos na simulação; o estoque é baixado ao aceitar a venda.'::text))
WHERE settings->>'partnership_terms'='Comissão de 10% sobre produtos + frete, sem incluir taxas de cartão. A loja retém a comissão e paga o saldo à Dukamp. A comissão só é reconhecida após aprovação do pagamento e é desconsiderada em vendas canceladas ou reembolsadas. Preços, estoque, frete e prazos são confirmados na simulação. A Dukamp cuida da produção e logística; a loja cuida da prospecção e do atendimento ao cliente.';
