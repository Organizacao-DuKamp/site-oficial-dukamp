import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createPartnerDatabase } from './fixtures/partner-database.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migrationPath='supabase/changes/partner_sale_requests.sql';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',admin='00000000-0000-4000-8000-000000000003',
 store='10000000-0000-4000-8000-000000000001',product='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002';
test('approval ledger: tenant access, unpaid submission, idempotency, admin-only commission and atomic stock',async()=>{
 const db=await createPartnerDatabase();
 try {
  await db.exec(source('supabase/migrations/20261020015653_partner_storefronts.sql'));
  await db.exec(source(migrationPath));
  await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[a,b,admin]);
  await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,'admin')",[admin]);
  for (const [id,cnpj,username] of [[a,'11222333000181','fixture-a'],[b,'22333444000181','fixture-b']])
   await db.query("INSERT INTO public.dukamp_partners(id,user_id,cnpj,razao_social,nome_completo,username,cep,rua,numero,bairro,cidade,estado) VALUES($1,$1,$2,$3,$3,$3,'15150104','Rua','1','Centro','Monte Aprazível','SP')",[id,cnpj,username]);
  await db.query("INSERT INTO public.partner_stores(id,partner_id,slug,name) VALUES($1,$2,'fixture-agro','Fixture')",[store,a]);
  await db.query("INSERT INTO public.partner_store_products(id,store_id,name,price,stock) VALUES($1,$2,'Produto fixture',50,10),($3,$2,'Produto sem estoque',25,0)",[product,store,other]);
  const details={customer_name:'Cliente fixture',phone:'17999999999',email:'fixture@example.invalid',cpf_cnpj:'12345678901',fulfillment_method:'delivery',cidade:'Monte Aprazível',estado:'SP'};
  const items=[{product_id:product,quantity:2,unit_price:50,subtotal:100,selected_options:[]}];
  const key=crypto.randomUUID();
  const submit=(actor=a,partner=a,hash='fixed',request=key,lines=items,subtotal=100)=>db.query('SELECT public.submit_partner_sale_request($1,$2,NULL,$3,$4,$5,$6,$7,$8,20) r',[actor,partner,store,request,hash,details,lines,subtotal]);
  const review=(actor,id,action='approve',commission=17.25,reason=null,status=null)=>db.query('SELECT public.review_partner_sale_request($1,$2,$3,$4,$5,$6) r',[actor,id,action,commission,reason,status]);
  const stock=async id=>Number((await db.query('SELECT stock FROM public.partner_store_products WHERE id=$1',[id])).rows[0].stock);
  const r=(await submit()).rows[0].r;
  assert.equal(r.approval_status,'pending');assert.equal(r.commission_amount,null);assert.equal(await stock(product),10);
  assert.equal(Number((await db.query('SELECT count(*) n FROM public.orders')).rows[0].n),0);
  assert.equal(Number((await db.query('SELECT count(*) n FROM public.web_order_sales')).rows[0].n),0);
  assert.equal((await submit()).rows[0].r.id,r.id);assert.equal(await stock(product),10);
  await assert.rejects(submit(a,a,'changed'),/já foi usada/);
  await assert.rejects(submit(b,a,'other',crypto.randomUUID()),/não autorizado/);
  await assert.rejects(submit(a,b,'other',crypto.randomUUID()),/não autorizado/);
  for (const amount of [-1,120.01,1.001,NaN]) await assert.rejects(review(admin,r.id,'approve',amount),/comissão válida/);
  await assert.rejects(review(a,r.id),/administradores/);
  await assert.rejects(review(admin,r.id,'delivery',null,null,'entregue'),/Confirme/);
  const accepted=(await review(admin,r.id)).rows[0].r;
  assert.equal(accepted.approval_status,'approved');assert.equal(Number(accepted.commission_amount),17.25);assert.equal(await stock(product),8);
  assert.equal(accepted.payout_month.slice(8,10),'01');
  assert.equal((await review(admin,r.id)).rows[0].r.id,r.id);assert.equal(await stock(product),8);
  await assert.rejects(review(admin,r.id,'approve',18),/já foi analisada/);assert.equal(await stock(product),8);
  await review(admin,r.id,'delivery',null,null,'a_caminho');
  let feed=(await db.query('SELECT payload FROM public.partner_sales_feed WHERE id=$1',[r.id])).rows[0].payload;
  assert.equal(feed.payment_status,'not_required');assert.equal(feed.delivery_status,'a_caminho');assert.equal(feed.phone,details.phone);assert.equal(Number(feed.shipping_cost),20);
  let summary=(await db.query('SELECT * FROM public.dukamp_partner_sales_summary WHERE partner_id=$1',[a])).rows[0];
  assert.equal(Number(summary.registered_orders),1);assert.equal(Number(summary.paid_orders),1);assert.equal(Number(summary.commission_total),17.25);
  const insufficient=(await submit(a,a,'stock',crypto.randomUUID(),[...items,{product_id:other,quantity:1,unit_price:25,subtotal:25}],125)).rows[0].r;
  await assert.rejects(review(admin,insufficient.id),/estoque insuficiente/);assert.equal(await stock(product),8);
  assert.equal((await db.query('SELECT approval_status FROM public.partner_sale_requests WHERE id=$1',[insufficient.id])).rows[0].approval_status,'pending');
  const rejected=(await review(admin,insufficient.id,'reject',null,'Cliente não confirmou')).rows[0].r;
  assert.equal(rejected.approval_status,'rejected');assert.equal(rejected.commission_amount,null);assert.equal(await stock(product),8);
  for(const role of ['anon','authenticated']) {
    for(const table of ['partner_sale_requests','partner_sales_feed']) assert.equal((await db.query('SELECT has_table_privilege($1,$2,\'SELECT\') allowed',[role,'public.'+table])).rows[0].allowed,false);
    for(const signature of ['submit_partner_sale_request(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,numeric,numeric)','review_partner_sale_request(uuid,uuid,text,numeric,text,text)'])
      assert.equal((await db.query('SELECT has_function_privilege($1,$2,\'EXECUTE\') allowed',[role,'public.'+signature])).rows[0].allowed,false);
  }

  // The central Dukamp catalog uses the same approval flow without creating a paid order.
  await db.query("INSERT INTO public.products(id,name,price,stock,active) VALUES($1,'DUKAMP Ração fixture',50,5,true)",[product]);
  const quoteId=crypto.randomUUID();
  await db.query("INSERT INTO public.dukamp_partner_quotes(id,partner_id,payload,subtotal,shipping_cost,gross_total,commission_amount,net_total,expires_at) VALUES($1,$2,'{}',100,20,120,12,108,now()+interval '15 minutes')",[quoteId,a]);
  const factory=(await db.query("SELECT public.submit_partner_sale_request($1,$2,$3,NULL,$3,'factory',$4,$5,100,20) r",[a,a,quoteId,details,items])).rows[0].r;
  assert.equal(factory.store_id,null);assert.equal(factory.quote_id,quoteId);
  assert.equal(Number((await db.query("SELECT stock FROM public.products WHERE id=$1",[product])).rows[0].stock),5);
  await review(admin,factory.id,'approve',9.99);
  await review(admin,factory.id,'approve',9.99);
  assert.equal(Number((await db.query("SELECT stock FROM public.products WHERE id=$1",[product])).rows[0].stock),3);
  assert.equal(Number((await db.query("SELECT count(*) n FROM public.orders")).rows[0].n),0);
  assert.equal(Number((await db.query("SELECT count(*) n FROM public.web_order_sales")).rows[0].n),0);
  const factoryFeed=(await db.query("SELECT payload FROM public.partner_sales_feed WHERE id=$1",[factory.id])).rows[0].payload;
  assert.equal(factoryFeed.request_kind,'approval');assert.equal(Number(factoryFeed.partner_commission_amount),9.99);
  const replay=(await db.query("SELECT public.submit_partner_sale_request($1,$2,$3,NULL,$3,'factory',$4,$5,100,20) r",[a,a,quoteId,details,items])).rows[0].r;
  assert.equal(replay.id,factory.id);

  await db.query('UPDATE public.dukamp_partners SET active=false WHERE id=$1',[a]);
  await assert.rejects(submit(a,a,'inactive',crypto.randomUUID()),/desativado/);
 } finally { await db.close(); }
});
