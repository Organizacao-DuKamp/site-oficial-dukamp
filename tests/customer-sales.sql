-- All fixtures, stock movements and audit records are rolled back.
BEGIN;
DO $$
DECLARE seller uuid:=gen_random_uuid(); product uuid:=gen_random_uuid(); first_order uuid:=gen_random_uuid(); second_order uuid:=gen_random_uuid(); third_order uuid:=gen_random_uuid();
 customer uuid:=gen_random_uuid(); fixture_doc text:='99999999901'; result jsonb; summary public.customers_sales_summary%ROWTYPE;
 t timestamptz:=now(); actor uuid:=gen_random_uuid(); blocked boolean;
BEGIN
 IF EXISTS(SELECT 1 FROM public.customers WHERE regexp_replace(cnpj_cpf,'[^0-9]','','g') IN (fixture_doc,'99999999902'))
 OR EXISTS(SELECT 1 FROM public.dukamp_stock_items WHERE code='999998') OR EXISTS(SELECT 1 FROM public.products WHERE code='999998')
 THEN RAISE EXCEPTION 'Fixture identifiers already exist'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 PERFORM set_config('request.headers','{}',true);
 INSERT INTO public.sellers(id,slug,name,active,erp_seller_code) VALUES(seller,'qa-'||seller::text,'Vendedor de teste',true,'999995');
 INSERT INTO public.products(id,name,code,slug,price,consumer_price,stock,active,peso)
 VALUES(product,'Produto de teste','999998','qa-'||product::text,50,50,20,true,1);
 INSERT INTO public.dukamp_stock_items(code,name,unit,stock,cost,sale_price,total_cost,total_sale)
 VALUES('999998','Produto de teste','UN',20,30,50,600,1000);
 INSERT INTO public.customers(id,cliente,codigo,cnpj_cpf,compra_ano,compra_ano_anterior)
 VALUES(customer,'Cliente já existente','QA-'||customer::text,'999.999.999-01',200,75);
 INSERT INTO public.orders(id,customer_name,email,phone,cpf_cnpj,cep,rua,numero,bairro,cidade,estado,complemento,referencia_entrega,pessoa_autorizada,subtotal,total,shipping_cost,seller_id,seller_name,seller_code)
 VALUES(first_order,'Cliente de teste','fixture@example.invalid','17999999999',fixture_doc,'15150104','Rua Teste','10','Centro','Monte Aprazível','SP','Fundos','Portão azul','Recebedor Teste',100,115,15,seller,'Vendedor de teste','999995');
 INSERT INTO public.order_items(order_id,product_id,product_code,name,unit_price,quantity,subtotal,peso)
 VALUES(first_order,product,'999998','Produto de teste',50,2,100,1);
 IF EXISTS(SELECT 1 FROM public.web_order_sales WHERE order_id=first_order) THEN RAISE EXCEPTION 'Pending order counted as sale'; END IF;
 result:=public.reconcile_mercadopago_payment(first_order,'999999998001','approved',115,t);
 IF result->>'payment_status'<>'approved' OR NOT (result->>'newly_paid')::boolean THEN RAISE EXCEPTION 'First payment not reconciled'; END IF;
 IF (SELECT stock FROM public.products WHERE id=product)<>18 OR (SELECT stock FROM public.dukamp_stock_items WHERE code='999998')<>18 THEN RAISE EXCEPTION 'Site/ERP stock not decremented'; END IF;
 IF (SELECT total_cost FROM public.dukamp_stock_items WHERE code='999998')<>540 THEN RAISE EXCEPTION 'ERP stock totals not updated'; END IF;
 IF (SELECT count(*) FROM public.customers WHERE regexp_replace(cnpj_cpf,'[^0-9]','','g')=fixture_doc)<>1 THEN RAISE EXCEPTION 'Existing customer duplicated'; END IF;
 SELECT * INTO summary FROM public.customers_sales_summary WHERE id=customer;
 IF summary.compra_ano<>300 OR summary.web_compra_ano<>100 OR summary.compra_ano_anterior<>75 THEN RAISE EXCEPTION 'Historical + website customer totals wrong'; END IF;
 IF summary.seller_record_id<>seller OR summary.vendedor_codigo<>'999995' OR summary.pessoa_autorizada<>'Recebedor Teste' OR summary.referencia_entrega<>'Portão azul' THEN RAISE EXCEPTION 'Seller or delivery details not copied'; END IF;
 IF (SELECT cost_amount FROM public.web_order_sales WHERE order_id=first_order)<>60 OR (SELECT payment_total FROM public.web_order_sales WHERE order_id=first_order)<>115 THEN RAISE EXCEPTION 'Sale cost/payment snapshots wrong'; END IF;
 result:=public.reconcile_mercadopago_payment(first_order,'999999998001','approved',115,t+interval '1 second');
 IF (result->>'newly_paid')::boolean OR (SELECT count(*) FROM public.web_order_sales WHERE order_id=first_order)<>1 OR (SELECT stock FROM public.dukamp_stock_items WHERE code='999998')<>18 THEN RAISE EXCEPTION 'Repeated callback duplicated sale or stock'; END IF;
 INSERT INTO public.orders(id,customer_name,email,phone,cpf_cnpj,cep,rua,numero,bairro,cidade,estado,subtotal,total,shipping_cost)
 VALUES(second_order,'Cliente de teste','fixture@example.invalid','17999999999',fixture_doc,'15150104','Rua Teste','10','Centro','Monte Aprazível','SP',150,150,0);
 INSERT INTO public.order_items(order_id,product_id,product_code,name,unit_price,quantity,subtotal,peso)
 VALUES(second_order,product,'999998','Produto de teste',50,3,150,1);
 PERFORM public.reconcile_mercadopago_payment(second_order,'999999998002','approved',150,t+interval '2 seconds');
 SELECT * INTO summary FROM public.customers_sales_summary WHERE id=customer;
 IF summary.compra_ano<>450 OR summary.seller_record_id IS NOT NULL OR summary.vendedor_nome IS NOT NULL OR summary.vendedor_codigo IS NOT NULL THEN RAISE EXCEPTION 'No seller attribution or second purchase totals wrong'; END IF;
 IF (SELECT seller_id FROM public.web_order_sales WHERE order_id=first_order)<>seller THEN RAISE EXCEPTION 'Later purchase changed earlier seller credit'; END IF;
 PERFORM public.reconcile_mercadopago_payment(first_order,'999999998001','refunded',115,t+interval '3 seconds');
 PERFORM public.reconcile_mercadopago_payment(first_order,'999999998001','refunded',115,t+interval '4 seconds');
 SELECT * INTO summary FROM public.customers_sales_summary WHERE id=customer;
 IF summary.compra_ano<>350 OR (SELECT active FROM public.web_order_sales WHERE order_id=first_order) THEN RAISE EXCEPTION 'Refund did not remove website amount exactly once'; END IF;
 IF (SELECT compra_ano FROM public.customers WHERE id=customer)<>200 THEN RAISE EXCEPTION 'ERP imported history was modified'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE entity_table='web_order_sales' AND entity_id=first_order::text) THEN RAISE EXCEPTION 'Website sale not audited'; END IF;
 -- A new consumer without a seller is also registered after payment.
 INSERT INTO public.orders(id,customer_name,email,phone,cpf_cnpj,cep,rua,numero,bairro,cidade,estado,subtotal,total,shipping_cost)
 VALUES(third_order,'Novo cliente de teste','new-fixture@example.invalid','17999999999','99999999902','15150104','Rua Nova','20','Centro','Monte Aprazível','SP',50,50,0);
 INSERT INTO public.order_items(order_id,product_id,product_code,name,unit_price,quantity,subtotal,peso)
 VALUES(third_order,product,'999998','Produto de teste',50,1,50,1);
 IF EXISTS(SELECT 1 FROM public.customers WHERE cnpj_cpf='99999999902') THEN RAISE EXCEPTION 'Unpaid consumer already registered'; END IF;
 PERFORM public.reconcile_mercadopago_payment(third_order,'999999998003','approved',50,t+interval '5 seconds');
 SELECT * INTO summary FROM public.customers_sales_summary WHERE cnpj_cpf='99999999902';
 IF summary.id IS NULL OR summary.codigo NOT LIKE 'SITE-%' OR summary.compra_ano<>50 OR summary.seller_record_id IS NOT NULL OR NOT summary.web_registered THEN RAISE EXCEPTION 'New consumer customer registration failed'; END IF;
 -- Reverting an admin status and approving again never duplicates old facts.
 UPDATE public.orders SET payment_status='pending' WHERE id=second_order;
 UPDATE public.orders SET payment_status='approved' WHERE id=second_order;
 IF (SELECT count(*) FROM public.web_order_sales WHERE order_id=second_order)<>1 THEN RAISE EXCEPTION 'Existing order counted twice'; END IF;
 IF has_table_privilege('anon','public.orders','INSERT') OR has_table_privilege('authenticated','public.orders','INSERT') OR has_table_privilege('authenticated','public.web_order_sales','UPDATE') OR has_function_privilege('authenticated','dukamp_private.record_paid_web_order()','EXECUTE') THEN RAISE EXCEPTION 'Payment/sales writes exposed to browser'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 PERFORM set_config('role','authenticated',true);
 IF EXISTS(SELECT 1 FROM public.web_order_sales) OR EXISTS(SELECT 1 FROM public.customers_sales_summary) THEN RAISE EXCEPTION 'Customer can read admin sales/customer view'; END IF;
 PERFORM set_config('role','none',true);
END $$;
SELECT 'paid customer, seller snapshots, historical totals, idempotency, refund, inventory, audit and RLS passed' AS result;
ROLLBACK;
