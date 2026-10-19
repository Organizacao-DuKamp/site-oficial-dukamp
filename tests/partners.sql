-- Run on the migrated Dukamp database. All fixtures and side effects roll back.
BEGIN;
DO $$
DECLARE
 ua uuid:=gen_random_uuid(); ub uuid:=gen_random_uuid(); pa uuid:=gen_random_uuid(); pb uuid:=gen_random_uuid();
 product uuid:=gen_random_uuid(); qid uuid:=gen_random_uuid(); expired_q uuid:=gen_random_uuid();
 payload jsonb; line jsonb; order_a jsonb; repeated jsonb; result jsonb; n integer;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
 VALUES(ua,ua::text||'@fixture.invalid','{}','{}'),(ub,ub::text||'@fixture.invalid','{}','{}');
 INSERT INTO public.dukamp_partners(id,user_id,cnpj,razao_social,nome_completo,username,cep,rua,numero,bairro,cidade,estado)
 VALUES(pa,ua,lpad((random()*99999999999999)::bigint::text,14,'0'),'Parceiro teste A','Responsável teste A','teste-'||replace(pa::text,'-',''),'15150104','Rua teste','10','Centro','Monte Aprazível','SP'),
 (pb,ub,lpad((random()*99999999999999)::bigint::text,14,'0'),'Parceiro teste B','Responsável teste B','teste-'||replace(pb::text,'-',''),'15150104','Rua teste','20','Centro','Monte Aprazível','SP');
 INSERT INTO public.products(id,name,slug,price,stock,active) VALUES(product,'Produto Dukamp teste transacional','teste-'||product::text,100,5,true);
 INSERT INTO public.dukamp_partner_quotes(id,partner_id,payload,subtotal,shipping_cost,gross_total,commission_amount,net_total,expires_at)
 VALUES(qid,pa,'{}',200,50,250,25,225,now()+interval '15 minutes');
 payload:=jsonb_build_object('partner_id',pa,'partner_quote_id',qid,'partner_name','Parceiro teste A','partner_gross_total',250,'partner_commission_amount',25,
  'customer_name','Cliente teste transacional','email','fixture@example.invalid','phone','17999999999','cpf_cnpj','12345678909',
  'cep','15150104','rua','Rua teste','numero','10','bairro','Centro','cidade','Monte Aprazível','estado','SP',
  'subtotal',200,'tax_amount',0,'tax_destination_uf','SP','shipping_cost',50,'shipping_service','PAC','shipping_deadline_days',5,
  'fulfillment_method','delivery','total',225,'payment_method','pix','payment_base_amount',225,'payment_fee',0);
 line:=jsonb_build_array(jsonb_build_object('product_id',product,'name','Produto Dukamp teste transacional','unit_price',100,'base_unit_price',100,'quantity',2,'subtotal',200,'tax_code','040','icms_rate',0,'tax_amount',0));
 order_a:=public.create_dukamp_partner_order(payload,line,'request-a');
 ASSERT (order_a->>'total')::numeric=225 AND (order_a->>'partner_commission_amount')::numeric=25,'Incorrect commission/provider amount';
 ASSERT (order_a->>'user_id') IS NULL,'Partner must not own customer row through the retail policy';
 repeated:=public.create_dukamp_partner_order(payload,line,'request-a');
 ASSERT order_a->>'id'=repeated->>'id','Duplicate checkout created another order';
 SELECT count(*) INTO n FROM public.order_items WHERE order_id=(order_a->>'id')::uuid;
 ASSERT n=1,'Duplicate checkout created duplicate items';
 BEGIN
  PERFORM public.create_dukamp_partner_order(payload,line,'different-request'); RAISE EXCEPTION 'Expected hash rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected hash rejection' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.create_dukamp_partner_order(payload||jsonb_build_object('partner_id',pb),line,'request-a'); RAISE EXCEPTION 'Expected tenant rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected tenant rejection' THEN RAISE; END IF; END;
 INSERT INTO public.dukamp_partner_quotes(id,partner_id,payload,subtotal,shipping_cost,gross_total,commission_amount,net_total,created_at,expires_at)
 VALUES(expired_q,pa,'{}',200,50,250,25,225,now()-interval '1 hour',now()-interval '1 minute');
 BEGIN
  PERFORM public.create_dukamp_partner_order(payload||jsonb_build_object('partner_quote_id',expired_q),line,'request-a'); RAISE EXCEPTION 'Expected expiration rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected expiration rejection' THEN RAISE; END IF; END;
 -- Confirmation verifies the NET amount; repeat notifications deduct stock once.
 BEGIN
  PERFORM public.reconcile_mercadopago_payment((order_a->>'id')::uuid,'999000001','approved',250,now()); RAISE EXCEPTION 'Expected amount rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected amount rejection' THEN RAISE; END IF; END;
 PERFORM public.reconcile_mercadopago_payment((order_a->>'id')::uuid,'999000001','approved',225,now());
 PERFORM public.reconcile_mercadopago_payment((order_a->>'id')::uuid,'999000001','approved',225,now());
 SELECT stock INTO n FROM public.products WHERE id=product; ASSERT n=3,'Stock must be deducted once';
 SELECT to_jsonb(s) INTO result FROM public.dukamp_partner_sales_summary s WHERE partner_id=pa;
 ASSERT (result->>'gross_total')::numeric=250 AND (result->>'commission_total')::numeric=25 AND (result->>'dukamp_total')::numeric=225,'Summary amounts incorrect';
 PERFORM public.reconcile_mercadopago_payment((order_a->>'id')::uuid,'999000001','refunded',225,now());
 SELECT to_jsonb(s) INTO result FROM public.dukamp_partner_sales_summary s WHERE partner_id=pa;
 ASSERT (result->>'paid_orders')::integer=0 AND (result->>'commission_total')::numeric=0,'Refund still generates commission';
 -- Real database roles/RLS: no partner can read another store or use service RPCs.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT count(*) INTO n FROM public.dukamp_partners WHERE id IN(pa,pb); ASSERT n=1,'Cross-partner RLS leak';
 BEGIN
  PERFORM * FROM public.dukamp_partner_quotes; RAISE EXCEPTION 'Expected quotes permission denial';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.create_dukamp_partner_order(payload,line,'request-a'); RAISE EXCEPTION 'Expected RPC permission denial';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.order_items(order_id,product_id,name,unit_price,quantity,subtotal) VALUES((order_a->>'id')::uuid,product,'Forged item',1,1,1);
  RAISE EXCEPTION 'Expected item insertion denial';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.orders(customer_name,email,phone,cep,rua,numero,bairro,cidade,estado,subtotal,shipping_cost,total,payment_base_amount,payment_fee,partner_id,partner_quote_id,partner_gross_total,partner_commission_amount)
  VALUES('Forged','fixture@example.invalid','17999999999','15150104','Rua','1','Centro','Monte Aprazível','SP',200,50,225,225,0,pa,expired_q,250,25);
  RAISE EXCEPTION 'Expected forged partner order denial';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 EXECUTE 'RESET ROLE';
 UPDATE public.dukamp_partners SET active=false WHERE id=pa;
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT count(*) INTO n FROM public.dukamp_partners WHERE id=pa; ASSERT n=0,'Inactive partner remains visible';
 EXECUTE 'RESET ROLE';
 BEGIN
  PERFORM public.create_dukamp_partner_order(payload,line,'request-a'); RAISE EXCEPTION 'Expected inactive partner rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected inactive partner rejection' THEN RAISE; END IF; END;
END;
$$;
ROLLBACK;
SELECT 'partner integration / RLS / payment / rollback: passed' AS result;
