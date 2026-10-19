-- Dedicated partner identities. Passwords live only in Supabase Auth.
CREATE TABLE public.dukamp_partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
 cnpj text NOT NULL UNIQUE CHECK (cnpj ~ '^[0-9]{14}$'),
 razao_social text NOT NULL, nome_completo text NOT NULL,
 username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,49}$'),
 logo_url text NOT NULL DEFAULT '',
 cep text NOT NULL CHECK (cep ~ '^[0-9]{8}$'), rua text NOT NULL, numero text NOT NULL,
 bairro text NOT NULL, cidade text NOT NULL, estado text NOT NULL CHECK (length(estado)=2),
 complemento text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
 deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dukamp_partners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dukamp_partners FROM anon, authenticated;
GRANT SELECT ON public.dukamp_partners TO authenticated;
GRANT ALL ON public.dukamp_partners TO service_role;
CREATE POLICY "Partner reads own active identity or admin reads all" ON public.dukamp_partners
 FOR SELECT TO authenticated USING ((user_id=auth.uid() AND active AND deleted_at IS NULL) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER dukamp_partners_updated_at BEFORE UPDATE ON public.dukamp_partners FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.dukamp_partner_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id), settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dukamp_partner_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dukamp_partner_settings FROM anon, authenticated;
GRANT ALL ON public.dukamp_partner_settings TO service_role;
CREATE TRIGGER dukamp_partner_settings_updated_at BEFORE UPDATE ON public.dukamp_partner_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.dukamp_partner_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES public.dukamp_partners(id) ON DELETE RESTRICT,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 subtotal numeric(12,2) NOT NULL CHECK(subtotal>0), shipping_cost numeric(12,2) NOT NULL CHECK(shipping_cost>=0),
 gross_total numeric(12,2) NOT NULL, commission_amount numeric(12,2) NOT NULL, net_total numeric(12,2) NOT NULL,
 order_id uuid UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT, checkout_hash text,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 CHECK(gross_total = subtotal + shipping_cost), CHECK(commission_amount = round(gross_total * 0.10, 2)),
 CHECK(net_total = gross_total - commission_amount), CHECK(expires_at>created_at)
);
CREATE INDEX dukamp_partner_quotes_partner ON public.dukamp_partner_quotes(partner_id,created_at DESC);
ALTER TABLE public.dukamp_partner_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dukamp_partner_quotes FROM anon, authenticated;
GRANT ALL ON public.dukamp_partner_quotes TO service_role;

ALTER TABLE public.orders
 ADD COLUMN partner_id uuid REFERENCES public.dukamp_partners(id) ON DELETE RESTRICT,
 ADD COLUMN partner_quote_id uuid UNIQUE REFERENCES public.dukamp_partner_quotes(id) ON DELETE RESTRICT,
 ADD COLUMN partner_name text,
 ADD COLUMN partner_gross_total numeric(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN partner_commission_amount numeric(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN partner_customer_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(partner_customer_details)='object'),
 ADD CONSTRAINT partner_order_amounts CHECK (
   (partner_id IS NULL AND partner_quote_id IS NULL AND partner_gross_total=0 AND partner_commission_amount=0)
   OR (partner_id IS NOT NULL AND partner_quote_id IS NOT NULL AND user_id IS NULL
     AND payment_base_amount IS NOT NULL AND payment_fee IS NOT NULL
     AND partner_gross_total=round(subtotal+shipping_cost+coalesce(tax_amount,0),2)
     AND partner_commission_amount=round(partner_gross_total*0.10,2)
     AND payment_base_amount=partner_gross_total-partner_commission_amount
     AND total=payment_base_amount+payment_fee)
 );
CREATE INDEX orders_dukamp_partner_created ON public.orders(partner_id,created_at DESC) WHERE partner_id IS NOT NULL;
-- Existing public INSERT policies must never allow forging partner attribution.
CREATE POLICY "Partner orders created by server only" ON public.orders AS RESTRICTIVE
 FOR INSERT TO anon, authenticated WITH CHECK(partner_id IS NULL AND partner_quote_id IS NULL AND partner_gross_total=0 AND partner_commission_amount=0);
CREATE POLICY "Partner orders updated by admin only" ON public.orders AS RESTRICTIVE
 FOR UPDATE TO authenticated USING(partner_id IS NULL OR public.has_role(auth.uid(),'admin'))
 WITH CHECK(public.has_role(auth.uid(),'admin') OR (partner_id IS NULL AND partner_quote_id IS NULL AND partner_gross_total=0 AND partner_commission_amount=0));
CREATE FUNCTION public.is_dukamp_partner_order(p_order_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.orders WHERE id=p_order_id AND partner_id IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION public.is_dukamp_partner_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dukamp_partner_order(uuid) TO anon,authenticated,service_role;
CREATE POLICY "Partner items created by server only" ON public.order_items AS RESTRICTIVE
 FOR INSERT TO anon,authenticated WITH CHECK(NOT public.is_dukamp_partner_order(order_id));

CREATE VIEW public.dukamp_partner_sales_summary WITH (security_invoker=true) AS
 SELECT p.id AS partner_id,
 count(o.id) AS registered_orders,
 count(o.id) FILTER (WHERE o.payment_status='approved' AND o.delivery_status<>'cancelada' AND o.refund_status='none') AS paid_orders,
 coalesce(sum(o.partner_gross_total) FILTER (WHERE o.payment_status='approved' AND o.delivery_status<>'cancelada' AND o.refund_status='none'),0) AS gross_total,
 coalesce(sum(o.partner_commission_amount) FILTER (WHERE o.payment_status='approved' AND o.delivery_status<>'cancelada' AND o.refund_status='none'),0) AS commission_total,
 coalesce(sum(o.total) FILTER (WHERE o.payment_status='approved' AND o.delivery_status<>'cancelada' AND o.refund_status='none'),0) AS dukamp_total
 FROM public.dukamp_partners p LEFT JOIN public.orders o ON o.partner_id=p.id GROUP BY p.id;
REVOKE ALL ON public.dukamp_partner_sales_summary FROM anon,authenticated;
GRANT SELECT ON public.dukamp_partner_sales_summary TO service_role;

-- Atomically persist order+items and consume the quote. Same quote+request can
-- be retried, including after an uncertain provider/network response.
CREATE FUNCTION public.create_dukamp_partner_order(p_order jsonb,p_items jsonb,p_checkout_hash text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE q public.dukamp_partner_quotes%ROWTYPE; o public.orders%ROWTYPE; item jsonb;
BEGIN
 SELECT * INTO q FROM public.dukamp_partner_quotes WHERE id=(p_order->>'partner_quote_id')::uuid FOR UPDATE;
 IF NOT FOUND OR q.partner_id<>(p_order->>'partner_id')::uuid THEN RAISE EXCEPTION 'Invalid partner quote'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.dukamp_partners WHERE id=q.partner_id AND active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Inactive partner'; END IF;
 IF q.order_id IS NOT NULL THEN
   IF q.checkout_hash IS DISTINCT FROM p_checkout_hash THEN RAISE EXCEPTION 'Quote already used for another checkout'; END IF;
   SELECT * INTO o FROM public.orders WHERE id=q.order_id;
   RETURN to_jsonb(o);
 END IF;
 IF q.expires_at<=now() THEN RAISE EXCEPTION 'Quote expired'; END IF;
 IF q.gross_total<>(p_order->>'partner_gross_total')::numeric OR q.commission_amount<>(p_order->>'partner_commission_amount')::numeric
   OR q.net_total<>(p_order->>'payment_base_amount')::numeric THEN RAISE EXCEPTION 'Quote amounts changed'; END IF;
 IF jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Empty order'; END IF;
 INSERT INTO public.orders (
  user_id,partner_id,partner_quote_id,partner_name,partner_gross_total,partner_commission_amount,partner_customer_details,
  customer_name,email,phone,cpf_cnpj,cep,rua,numero,complemento,bairro,cidade,estado,referencia_entrega,pessoa_autorizada,
  subtotal,tax_amount,tax_destination_uf,shipping_cost,shipping_service,shipping_deadline_days,fulfillment_method,
  delivery_status,total,payment_method,payment_status,payment_base_amount,payment_fee,card_installments
 ) VALUES (
  NULL,q.partner_id,q.id,p_order->>'partner_name',q.gross_total,q.commission_amount,coalesce(p_order->'partner_customer_details','{}'::jsonb),
  p_order->>'customer_name',p_order->>'email',p_order->>'phone',p_order->>'cpf_cnpj',p_order->>'cep',p_order->>'rua',p_order->>'numero',
  p_order->>'complemento',p_order->>'bairro',p_order->>'cidade',p_order->>'estado',p_order->>'referencia_entrega',p_order->>'pessoa_autorizada',
  (p_order->>'subtotal')::numeric,(p_order->>'tax_amount')::numeric,p_order->>'tax_destination_uf',q.shipping_cost,
  p_order->>'shipping_service',(p_order->>'shipping_deadline_days')::integer,p_order->>'fulfillment_method',
  'preparando',(p_order->>'total')::numeric,(p_order->>'payment_method')::public.payment_method,'pending',q.net_total,
  (p_order->>'payment_fee')::numeric,(p_order->>'card_installments')::integer
 ) RETURNING * INTO o;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  INSERT INTO public.order_items(order_id,product_id,product_code,name,unit_price,base_unit_price,quantity,subtotal,tax_code,icms_rate,tax_amount,peso,altura,largura,comprimento,selected_options)
  VALUES(o.id,(item->>'product_id')::uuid,item->>'product_code',item->>'name',(item->>'unit_price')::numeric,(item->>'base_unit_price')::numeric,
   (item->>'quantity')::integer,(item->>'subtotal')::numeric,item->>'tax_code',(item->>'icms_rate')::numeric,(item->>'tax_amount')::numeric,
   (item->>'peso')::numeric,(item->>'altura')::numeric,(item->>'largura')::numeric,(item->>'comprimento')::numeric,coalesce(item->'selected_options','[]'::jsonb));
 END LOOP;
 UPDATE public.dukamp_partner_quotes SET order_id=o.id,checkout_hash=p_checkout_hash WHERE id=q.id;
 RETURN to_jsonb(o);
END;
$$;
REVOKE ALL ON FUNCTION public.create_dukamp_partner_order(jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_dukamp_partner_order(jsonb,jsonb,text) TO service_role;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('dukamp-partner-logos','dukamp-partner-logos',true,2097152,ARRAY['image/png','image/jpeg','image/webp'])
 ON CONFLICT(id) DO NOTHING;
CREATE POLICY "Public partner logos" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='dukamp-partner-logos');
CREATE POLICY "Admins upload partner logos" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='dukamp-partner-logos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete partner logos" ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='dukamp-partner-logos' AND public.has_role(auth.uid(),'admin'));

CREATE TRIGGER dukamp_audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.dukamp_partners FOR EACH ROW EXECUTE FUNCTION dukamp_private.capture_audit();
CREATE TRIGGER dukamp_audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.dukamp_partner_settings FOR EACH ROW EXECUTE FUNCTION dukamp_private.capture_audit();
