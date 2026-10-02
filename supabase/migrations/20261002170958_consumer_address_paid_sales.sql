-- New consumer profiles retain a delivery address independently of billing.
ALTER TABLE public.profiles ADD COLUMN delivery_address jsonb;
ALTER TABLE public.profiles ADD CONSTRAINT delivery_address_is_object CHECK (delivery_address IS NULL OR jsonb_typeof(delivery_address)='object');
ALTER TABLE public.orders
 ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
 ADD COLUMN seller_name text,
 ADD COLUMN seller_code text,
 ADD COLUMN referencia_entrega text,
 ADD COLUMN pessoa_autorizada text;
CREATE INDEX orders_seller_idx ON public.orders(seller_id);
ALTER TABLE public.customers
 ADD COLUMN seller_record_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
 ADD COLUMN web_registered boolean NOT NULL DEFAULT false,
 ADD COLUMN complemento text,
 ADD COLUMN referencia_entrega text,
 ADD COLUMN pessoa_autorizada text;
CREATE INDEX customers_seller_record_idx ON public.customers(seller_record_id);
CREATE INDEX customers_normalized_document_idx ON public.customers((regexp_replace(cnpj_cpf,'[^0-9]','','g')));

-- The checkout creates orders through a verified server endpoint. A direct
-- browser INSERT must never manufacture an approved payment or seller credit.
REVOKE INSERT ON public.orders FROM anon, authenticated;
CREATE TABLE public.web_order_sales (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
 customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
 user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
 seller_name text,
 seller_code text,
 amount numeric(14,2) NOT NULL CHECK(amount>=0),
 payment_total numeric(14,2) NOT NULL CHECK(payment_total>=0),
 cost_amount numeric(14,2),
 weight_kg numeric(14,3) NOT NULL DEFAULT 0,
 paid_at timestamptz NOT NULL,
 active boolean NOT NULL DEFAULT true,
 erp_stock_synced_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX web_order_sales_seller_date_idx ON public.web_order_sales(seller_id,paid_at);
CREATE INDEX web_order_sales_code_date_idx ON public.web_order_sales(seller_code,paid_at);
CREATE INDEX web_order_sales_customer_idx ON public.web_order_sales(customer_id,paid_at);
CREATE INDEX web_order_sales_user_idx ON public.web_order_sales(user_id);
ALTER TABLE public.web_order_sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.web_order_sales FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.web_order_sales TO authenticated;
GRANT ALL ON public.web_order_sales TO service_role;
CREATE POLICY "Admins read website sales" ON public.web_order_sales FOR SELECT TO authenticated
 USING ((SELECT public.has_role((SELECT auth.uid()),'admin')) OR (SELECT public.is_master_admin((SELECT auth.uid()))));
CREATE TRIGGER dukamp_audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.web_order_sales
 FOR EACH ROW EXECUTE FUNCTION dukamp_private.capture_audit();

-- This trigger is private and cannot be called as a public RPC. The order row
-- is already locked by payment reconciliation. Document locks serialize two
-- different paid orders from the same customer. Financial facts are immutable
-- snapshots; a unique order_id makes repeated notifications harmless.
CREATE FUNCTION dukamp_private.record_paid_web_order() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cid uuid; document text; item record; sale_exists boolean;
 order_date timestamptz; total_cost numeric:=0; known_cost boolean:=true; weight numeric:=0;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.web_order_sales WHERE order_id=NEW.id) INTO sale_exists;
 IF NEW.payment_status::text='refunded' THEN
   UPDATE public.web_order_sales SET active=false,updated_at=now() WHERE order_id=NEW.id AND active;
   RETURN NEW;
 END IF;
 IF NEW.payment_status::text<>'approved' THEN RETURN NEW; END IF;
 IF sale_exists THEN RETURN NEW; END IF;
 -- Do not backfill unrelated historical approved orders during later edits.
 IF TG_OP='UPDATE' AND OLD.payment_status::text='approved' THEN RETURN NEW; END IF;
 document:=regexp_replace(coalesce(NEW.cpf_cnpj,''),'[^0-9]','','g');
 IF length(document) NOT IN (11,14) THEN RAISE EXCEPTION 'Paid checkout requires a complete document'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('dukamp-web-customer:'||document,0));
 SELECT id INTO cid FROM public.customers
 WHERE regexp_replace(cnpj_cpf,'[^0-9]','','g')=document
 ORDER BY web_registered DESC,updated_at DESC,id LIMIT 1 FOR UPDATE;
 IF cid IS NULL THEN
   INSERT INTO public.customers(cliente,codigo,cnpj_cpf,data_cadastro)
   VALUES(NEW.customer_name,'SITE-'||replace(gen_random_uuid()::text,'-',''),document,(now() AT TIME ZONE 'America/Sao_Paulo')::date)
   RETURNING id INTO cid;
 END IF;
 UPDATE public.customers SET cliente=NEW.customer_name,email=NEW.email,telefone=NEW.phone,celular=NEW.phone,
   cnpj_cpf=document,endereco=nullif(NEW.rua,''),numero=nullif(NEW.numero,''),bairro=nullif(NEW.bairro,''),
   cidade=nullif(NEW.cidade,''),uf=nullif(NEW.estado,''),cep=nullif(NEW.cep,''),
   complemento=NEW.complemento,referencia_entrega=NEW.referencia_entrega,pessoa_autorizada=NEW.pessoa_autorizada,
   seller_record_id=NEW.seller_id,vendedor_codigo=NEW.seller_code,vendedor_nome=NEW.seller_name,
   dados_vendedor_atualizados_em=now(),web_registered=true,updated_at=now()
 WHERE id=cid;
 order_date:=coalesce(NEW.mp_status_updated_at,now());
 FOR item IN
   SELECT i.product_code,sum(i.quantity) quantity,sum(i.quantity*coalesce(i.peso,0)) weight_kg,
     s.cost,s.unit
   FROM public.order_items i LEFT JOIN public.dukamp_stock_items s ON s.code=i.product_code
   WHERE i.order_id=NEW.id GROUP BY i.product_code,s.cost,s.unit ORDER BY i.product_code
 LOOP
   weight:=weight+item.weight_kg;
   IF item.cost IS NULL THEN known_cost:=false;
   ELSE total_cost:=total_cost+item.cost*item.quantity; END IF;
   -- Inventory quantities use the same SKU selling unit as the imported ERP.
   -- Never silently create unmatched stock records or change imported pricing.
   UPDATE public.dukamp_stock_items SET stock=greatest(0,stock-item.quantity),
     total_cost=CASE WHEN cost IS NULL THEN NULL ELSE greatest(0,stock-item.quantity)*cost END,
     total_sale=CASE WHEN sale_price IS NULL THEN NULL ELSE greatest(0,stock-item.quantity)*sale_price END,
     updated_at=now() WHERE code=item.product_code;
 END LOOP;
 INSERT INTO public.web_order_sales(order_id,customer_id,user_id,seller_id,seller_name,seller_code,amount,payment_total,cost_amount,weight_kg,paid_at,erp_stock_synced_at)
 VALUES(NEW.id,cid,NEW.user_id,NEW.seller_id,NEW.seller_name,NEW.seller_code,NEW.subtotal,NEW.total,
   CASE WHEN known_cost THEN round(total_cost,2) ELSE NULL END,weight,order_date,now());
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION dukamp_private.record_paid_web_order() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER dukamp_record_paid_web_order AFTER INSERT OR UPDATE OF payment_status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION dukamp_private.record_paid_web_order();

-- Preserve imported ERP amounts. Website totals are calculated separately and
-- combined for display, so refunds and repeated callbacks never corrupt imports.
CREATE VIEW public.customers_sales_summary WITH (security_invoker=true) AS
SELECT (jsonb_populate_record(NULL::public.customers,to_jsonb(c)||jsonb_build_object(
 'compra_ano',coalesce(c.compra_ano,0)+coalesce(w.current_year,0),
 'compra_ano_anterior',coalesce(c.compra_ano_anterior,0)+coalesce(w.previous_year,0),
 'ultima_compra',CASE WHEN w.last_purchase IS NULL THEN c.ultima_compra ELSE greatest(c.ultima_compra,w.last_purchase) END,
 'valor_ultima_compra',CASE WHEN w.last_purchase IS NOT NULL AND (c.ultima_compra IS NULL OR w.last_purchase>=c.ultima_compra) THEN last_sale.amount ELSE c.valor_ultima_compra END,
 'valor_maior_compra',greatest(c.valor_maior_compra,w.largest),
 'data_maior_compra',CASE WHEN w.largest IS NOT NULL AND (c.valor_maior_compra IS NULL OR w.largest>=c.valor_maior_compra) THEN largest_sale.purchase_date ELSE c.data_maior_compra END
))).*,coalesce(w.current_year,0) AS web_compra_ano,coalesce(w.previous_year,0) AS web_compra_ano_anterior
FROM public.customers c
LEFT JOIN LATERAL (
 SELECT sum(amount) FILTER(WHERE extract(year FROM paid_at AT TIME ZONE 'America/Sao_Paulo')=extract(year FROM now() AT TIME ZONE 'America/Sao_Paulo')) current_year,
 sum(amount) FILTER(WHERE extract(year FROM paid_at AT TIME ZONE 'America/Sao_Paulo')=extract(year FROM now() AT TIME ZONE 'America/Sao_Paulo')-1) previous_year,
 max((paid_at AT TIME ZONE 'America/Sao_Paulo')::date) last_purchase,max(amount) largest
 FROM public.web_order_sales WHERE customer_id=c.id AND active
) w ON true
LEFT JOIN LATERAL (SELECT amount FROM public.web_order_sales WHERE customer_id=c.id AND active ORDER BY paid_at DESC,order_id LIMIT 1) last_sale ON true
LEFT JOIN LATERAL (SELECT (paid_at AT TIME ZONE 'America/Sao_Paulo')::date purchase_date FROM public.web_order_sales WHERE customer_id=c.id AND active ORDER BY amount DESC,paid_at DESC,order_id LIMIT 1) largest_sale ON true;
REVOKE ALL ON public.customers_sales_summary FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.customers_sales_summary TO authenticated,service_role;

-- Ledger and stock records also have a readable audit identity.
CREATE OR REPLACE FUNCTION dukamp_private.capture_audit() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b jsonb; a jsonb; fields text[]; actor uuid; actor_ip inet;
 h jsonb := coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}');
 caller text := coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',current_setting('role',true));
 who_name text; who_email text;
BEGIN
 b := CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END;
 a := CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END;
 SELECT coalesce(array_agg(k ORDER BY k),'{}') INTO fields FROM
   (SELECT jsonb_object_keys(coalesce(b,'{}')||coalesce(a,'{}')) k) keys
   WHERE (b->k) IS DISTINCT FROM (a->k) AND k NOT IN ('updated_at');
 IF TG_OP='UPDATE' AND cardinality(fields)=0 THEN RETURN NEW; END IF;
 actor := auth.uid();
 IF caller='service_role' THEN
   BEGIN actor := nullif(h->>'x-dukamp-actor-id','')::uuid; EXCEPTION WHEN invalid_text_representation THEN actor:=NULL; END;
   BEGIN actor_ip := nullif(h->>'x-dukamp-actor-ip','')::inet; EXCEPTION WHEN invalid_text_representation THEN actor_ip:=NULL; END;
 END IF;
 IF actor IS NOT NULL THEN
   SELECT full_name,email INTO who_name,who_email FROM public.profiles WHERE id=actor;
 END IF;
 INSERT INTO public.audit_logs(actor_id,actor_name,actor_email,actor_ip,action,entity_table,entity_id,changed_fields,before_data,after_data,source)
 VALUES(actor,who_name,who_email,actor_ip,lower(TG_OP),TG_TABLE_NAME,
   coalesce(a->>'id',b->>'id',a->>'order_id',b->>'order_id',a->>'code',b->>'code',a->>'key',b->>'key'),fields,
   dukamp_private.redact_audit_data(b),dukamp_private.redact_audit_data(a),
   CASE WHEN actor IS NULL THEN 'system' ELSE 'database' END);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
