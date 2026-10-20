import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPartnerDatabase } from './fixtures/partner-database.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const payoutMigration='supabase/changes/partner_commission_payouts.sql';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',admin='00000000-0000-4000-8000-000000000003',
 store='10000000-0000-4000-8000-000000000001',product='20000000-0000-4000-8000-000000000001';
test('commission payout ledger resets only unpaid credits, preserves sales, records audit and prevents duplicate or stale settlement',async()=>{
 const db=await createPartnerDatabase();
 try {
  for(const path of ['supabase/migrations/20261020015653_partner_storefronts.sql','supabase/migrations/20261020175414_partner_sale_requests.sql',payoutMigration]) await db.exec(source(path));
  await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[a,b,admin]);
  await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,'admin')",[admin]);
  for(const[id,cnpj,name]of[[a,'11222333000181','fixture-a'],[b,'22333444000181','fixture-b']]) await db.query("INSERT INTO public.dukamp_partners(id,user_id,cnpj,razao_social,nome_completo,username,cep,rua,numero,bairro,cidade,estado,pix_key) VALUES($1,$1,$2,$3,$3,$3,'15150104','Rua','1','Centro','Monte Aprazível','SP','fixture@example.invalid')",[id,cnpj,name]);
  await db.query("INSERT INTO public.partner_stores(id,partner_id,slug,name) VALUES($1,$2,'fixture-agro','Fixture')",[store,a]);
  await db.query("INSERT INTO public.partner_store_products(id,store_id,name,price,stock) VALUES($1,$2,'Produto fixture',50,30)",[product,store]);
  await db.query("SELECT set_config('request.jwt.claims',$1,false),set_config('request.headers',$2,false)",[JSON.stringify({role:'service_role'}),JSON.stringify({'x-dukamp-actor-id':admin})]);
  const account=async()=> (await db.query('SELECT public.get_partner_commission_account($1) a',[a])).rows[0].a;
  async function sale(commission){
   const r=(await db.query("SELECT public.submit_partner_sale_request($1,$1,NULL,$2,$3,'fixture',$4,$5,100,20) r",[a,store,crypto.randomUUID(),{customer_name:'Cliente fixture',fulfillment_method:'delivery'},[{product_id:product,quantity:2,unit_price:50,subtotal:100}]])).rows[0].r;
   await db.query("SELECT public.review_partner_sale_request($1,$2,'approve',$3)",[admin,r.id,commission]); return r.id;
  }
  const pay=(preview,key=crypto.randomUUID(),actor=admin,amount=Number(preview.balance))=>db.query('SELECT public.confirm_partner_commission_payout($1,$2,$3,$4,$5) p',[actor,a,key,amount,preview.balance_token]);
  const stock=async()=>Number((await db.query('SELECT stock FROM public.partner_store_products WHERE id=$1',[product])).rows[0].stock);
  const firstSale=await sale(17.25);await sale(9.99);
  const old=await account();assert.equal(Number(old.balance),27.24);assert.equal(Number(old.sales_count),2);
  await assert.rejects(pay(old,crypto.randomUUID(),a),/administradores/);
  await assert.rejects(pay(old,crypto.randomUUID(),admin,1),/saldo ou a chave Pix mudou/i);
  await sale(5);
  await assert.rejects(pay(old),/saldo ou a chave Pix mudou/i);
  assert.equal(Number((await db.query('SELECT count(*) n FROM public.partner_commission_payouts')).rows[0].n),0);
  const keyPreview=await account();
  await db.query("UPDATE public.dukamp_partners SET pix_key='changed@example.invalid' WHERE id=$1",[a]);
  await assert.rejects(pay(keyPreview),/saldo ou a chave Pix mudou/i);
  await db.query("UPDATE public.dukamp_partners SET pix_key='fixture@example.invalid' WHERE id=$1",[a]);
  const preview=await account(), key=crypto.randomUUID(), beforeStock=await stock();
  const receipt=(await pay(preview,key)).rows[0].p;
  assert.equal(Number(receipt.amount),32.24);assert.equal(await stock(),beforeStock);
  let current=await account();assert.equal(Number(current.balance),0);assert.equal(Number(current.paid_total),32.24);
  let summary=(await db.query('SELECT * FROM public.dukamp_partner_sales_summary WHERE partner_id=$1',[a])).rows[0];
  assert.equal(Number(summary.commission_balance),0);assert.equal(Number(summary.commission_total),32.24);assert.equal(Number(summary.commission_paid_total),32.24);
  assert.equal(Number((await db.query('SELECT commission_amount FROM public.partner_sale_requests WHERE id=$1',[firstSale])).rows[0].commission_amount),17.25);
  assert.ok((await db.query('SELECT payload FROM public.partner_sales_feed WHERE id=$1',[firstSale])).rows[0].payload.commission_paid_at);
  const audit=(await db.query("SELECT * FROM public.audit_logs WHERE entity_table='partner_commission_payouts'")).rows;
  assert.equal(audit.length,1);assert.equal(audit[0].actor_id,admin);assert.equal(Number(audit[0].after_data.amount),32.24);assert.equal(audit[0].after_data.partner_name,'fixture-a');
  assert.equal((await pay(preview,key)).rows[0].p.id,receipt.id);
  await assert.rejects(pay(preview,key,admin,30),/outra|outro pagamento/);
  await assert.rejects(pay(current),/valor de comissão válido/);
  await assert.rejects(pay(current,crypto.randomUUID(),admin,1),/não possui comissão/);
  await sale(7.5);
  assert.equal((await pay(preview,key)).rows[0].p.id,receipt.id);assert.equal(Number((await account()).balance),7.5);
  const next=await account();await pay(next);
  current=await account();assert.equal(Number(current.balance),0);assert.equal(Number(current.paid_total),39.74);
  assert.equal(Number((await db.query('SELECT count(*) n FROM public.partner_commission_payout_items')).rows[0].n),4);
  // Historical retained commissions were deducted at checkout and are never paid again.
  const quote=crypto.randomUUID();
  await db.query("INSERT INTO public.dukamp_partner_quotes(id,partner_id,payload,subtotal,shipping_cost,gross_total,commission_amount,net_total,expires_at) VALUES($1,$2,'{}',100,20,120,12,108,now()+interval '15 minutes')",[quote,a]);
  await db.query("INSERT INTO public.orders(customer_name,email,phone,cpf_cnpj,cep,rua,numero,bairro,cidade,estado,subtotal,shipping_cost,total,payment_base_amount,payment_fee,payment_status,partner_id,partner_quote_id,partner_name,partner_gross_total,partner_commission_amount) VALUES('Cliente antigo','fixture@example.invalid','17999999999','12345678901','15150104','Rua','1','Centro','Monte Aprazível','SP',100,20,108,108,0,'approved',$1,$2,'fixture-a',120,12)",[a,quote]);
  assert.equal(Number((await account()).balance),0);
  // A legacy storefront referral is a genuine unpaid credit and can be settled.
  await db.query("INSERT INTO public.orders(customer_name,email,phone,cpf_cnpj,cep,rua,numero,bairro,cidade,estado,subtotal,shipping_cost,total,payment_base_amount,payment_fee,payment_status,origin_store_id,origin_partner_id,origin_commission_amount) VALUES('Cliente referral','fixture@example.invalid','17999999999','12345678901','15150104','Rua','1','Centro','Monte Aprazível','SP',100,20,120,120,0,'approved',$1,$2,12)",[store,a]);
  const referral=await account();assert.equal(Number(referral.balance),12);await pay(referral);
  assert.equal(Number((await account()).balance),0);assert.equal(Number((await account()).paid_total),51.74);
  assert.equal(Number((await db.query("SELECT count(*) n FROM public.audit_logs WHERE entity_table='partner_commission_payouts'")).rows[0].n),3);
  for(const role of ['anon','authenticated']){
   for(const table of ['partner_commission_payouts','partner_commission_payout_items','partner_commission_open_credits'])
    assert.equal((await db.query("SELECT has_table_privilege($1,$2,'SELECT') allowed",[role,'public.'+table])).rows[0].allowed,false);
   for(const fn of ['get_partner_commission_account(uuid)','confirm_partner_commission_payout(uuid,uuid,uuid,numeric,text)'])
    assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') allowed",[role,'public.'+fn])).rows[0].allowed,false);
  }
  assert.equal(Number((await db.query('SELECT public.get_partner_commission_account($1) a',[b])).rows[0].a.balance),0);
 } finally { await db.close(); }
});
