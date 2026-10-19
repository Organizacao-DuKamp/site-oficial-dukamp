import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { z } from 'zod';
const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const moduleUrl = text => 'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text)).toString('base64');
const fulfillmentUrl = moduleUrl(source('src/lib/order-fulfillment.ts'));
const { checkoutFieldValid } = await import(fulfillmentUrl);
const taxUrl = moduleUrl(source('src/lib/tax.ts'));
const pricingUrl = moduleUrl(source('src/lib/pricing.ts').replace('"./tax"',JSON.stringify(taxUrl)));
const requestUrl = moduleUrl('export const getRequest = () => globalThis.__fulfillmentRequest;');
const auditUrl = moduleUrl('export function createAuditedAdminClient(actor) { globalThis.__fulfillmentActor=actor; return globalThis.__fulfillmentDb; }');
const notifyUrl = moduleUrl('export function paymentNotificationUrl() { return "https://fixture.invalid/webhook"; }');
const sellerUrl = moduleUrl(source('src/lib/order-seller.server.ts'));
const optionsUrl = moduleUrl(source('src/lib/product-options.ts').replace('\"zod\"',JSON.stringify(import.meta.resolve('zod'))));
const partnersUrl = moduleUrl(source('src/lib/partners.ts').replace('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const partnerCheckoutUrl = moduleUrl('export const authorizePartnerCheckout=(...args)=>globalThis.__partnerCheckout(...args);');
const providerUrl = moduleUrl('export const applyProviderPayment=async()=>null;');
const checkout = source('src/lib/checkout.functions.ts');
const checkoutSource = `
const z = globalThis.__fulfillmentZ;
import { partnerAmounts, partnerCustomerDetailsSchema } from ${JSON.stringify(partnersUrl)};
import { PICKUP_SERVICE, checkoutFieldValid } from ${JSON.stringify(fulfillmentUrl)};
import { normalizeTaxCode, roundMoney } from ${JSON.stringify(taxUrl)};
import { priceForAccount } from ${JSON.stringify(pricingUrl)};
import { optionChoicesSchema, productQuantities, resolveOptionSelections } from ${JSON.stringify(optionsUrl)};
const onlyDigits = s => (s || '').replace(/\\D/g,'');
const getServerSupabase = async () => globalThis.__fulfillmentDb;
const createServerFn = () => { let validate; return { inputValidator(fn) { validate=fn; return this; }, handler(fn) { return async data => fn({data:validate(data)}); } }; };
`+checkout.slice(checkout.indexOf('export const CARD_FEE_TABLE'),checkout.indexOf('export const getMpPublicKey'));
globalThis.__fulfillmentZ = z;
const { createPixOrder } = await import(moduleUrl(checkoutSource.replaceAll('./partners.server',partnerCheckoutUrl).replaceAll('@/lib/mercadopago-payment.server',providerUrl).replaceAll('@/lib/order-seller.server',sellerUrl).replaceAll('@/lib/audit.server',auditUrl).replaceAll('@tanstack/react-start/server',requestUrl).replaceAll('@/lib/mercadopago-notifications.server',notifyUrl)));
const fixture = {
 customer_name:'Test Customer',email:'fixture@example.invalid',phone:'17999999999',cpf_cnpj:'12345678901',
 cep:'',rua:'',numero:'',bairro:'',cidade:'',estado:'',items:[{product_id:'00000000-0000-4000-8000-000000000001',quantity:2,unit_price:1}],
 seller_id:null,shipping_cost:999,shipping_service:'forged shipping',shipping_deadline_days:30,fulfillment_method:'pickup',payment_method:'card',card_installments:1,
};
function setupDb(validToken=true, options=[]) {
 globalThis.__fulfillmentRequest = new Request('https://fixture.invalid/checkout',{headers:{authorization:'Bearer fixture-token'}});
 const writes=[];
 globalThis.__fulfillmentDb = {
  auth:{getUser:async()=>validToken ? {data:{user:{id:'verified-user'}}} : {data:{user:null},error:new Error('invalid')}},
  from(table) {
   let insert;
   const chain = {
    select:()=>chain,in:()=>chain,eq:()=>chain,
    maybeSingle:async()=>({data:{account_type:'cliente'}}),
    insert(value) { insert=value; writes.push({table,value}); return chain; },
    update(value) { writes.push({table,value,update:true}); return chain; },
    single:async()=>({data:{...insert,id:'00000000-0000-4000-8000-000000000002',order_number:'TEST'}}),
    then(resolve,reject) { return Promise.resolve({data:table==='products' ? [{id:fixture.items[0].product_id,name:'Test Product',code:'TEST',options,consumer_price:10,price:10,stock:10,active:true,tax_code:'040'}] : null}).then(resolve,reject); },
   }; return chain;
  },
 };
 return writes;
}

test('pickup checkout derives zero freight and totals from database prices',async()=>{
 const writes=setupDb(); process.env.MERCADO_PAGO_ACCESS_TOKEN='fixture-only';
 const result=await createPixOrder(fixture);
 const order=writes.find(w=>w.table==='orders').value;
 assert.equal(order.shipping_cost,0);assert.equal(order.shipping_service,'Retirar na loja');
 assert.equal(order.shipping_deadline_days,0);assert.equal(order.subtotal,20);assert.equal(order.payment_base_amount,20);
 assert.equal(order.total,21);assert.equal(result.shippingAmount,0);
 assert.equal(order.delivery_status,'preparando');assert.equal(order.user_id,'verified-user');
 assert.equal(globalThis.__fulfillmentActor,'verified-user');
});
test('delivery and boleto still require an address; pickup validates contact details',async()=>{
 setupDb();
 await assert.rejects(createPixOrder({...fixture,fulfillment_method:'delivery'}));
 await assert.rejects(createPixOrder({...fixture,payment_method:'boleto'}));
 await assert.rejects(createPixOrder({...fixture,phone:'1234'}));
 await assert.rejects(createPixOrder({...fixture,email:'invalid'}));
});
test('invalid authentication cannot create orders or supply an audit actor',async()=>{
 const writes=setupDb(false);
 await assert.rejects(createPixOrder(fixture),/Sessão inválida/);assert.equal(writes.length,0);
});
test('checkout validity covers required blanks, formats and optional complement',()=>{
 assert.equal(checkoutFieldValid('customer_name',''),false);
 assert.equal(checkoutFieldValid('email','invalid'),false);
 assert.equal(checkoutFieldValid('email','fixture@example.invalid'),true);
 assert.equal(checkoutFieldValid('cep','15150-104'),true);
 assert.equal(checkoutFieldValid('estado','XX'),false);
 assert.equal(checkoutFieldValid('complemento',''),true);
});

const auditSource=source('src/lib/audit.server.ts').replace(/import \{ createClient \} from .*?;/,'const createClient = globalThis.__auditCreateClient;');
globalThis.__auditCreateClient=(url,key,options)=>options;
const {trustedRequestIp,createAuditedAdminClient}=await import(moduleUrl(auditSource));
test('audit uses validated trusted IP and isolates identities per request',async()=>{
 assert.equal(trustedRequestIp(new Request('https://fixture.invalid',{headers:{'x-forwarded-for':'1.2.3.4'}})),null);
 assert.equal(trustedRequestIp(new Request('https://fixture.invalid',{headers:{'x-nf-client-connection-ip':'invalid'}})),null);
 const oldFetch=globalThis.fetch; const requests=[];
 globalThis.fetch=async(input,init)=>{requests.push(new Headers(init.headers));return new Response('{}');};
 const oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;const oldUrl=process.env.SUPABASE_URL;
 process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_fixture';process.env.SUPABASE_URL='https://fixture.invalid';
 try {
  const first=createAuditedAdminClient('first-user',new Request('https://fixture.invalid',{headers:{'x-nf-client-connection-ip':'127.0.0.1'}}));
  const second=createAuditedAdminClient('second-user',new Request('https://fixture.invalid'));
  await Promise.all([first.global.fetch('https://fixture.invalid',{headers:{Authorization:'Bearer sb_secret_fixture'}}),second.global.fetch('https://fixture.invalid',{})]);
  assert.equal(requests[0].get('x-dukamp-actor-id'),'first-user');assert.equal(requests[1].get('x-dukamp-actor-id'),'second-user');
  assert.equal(requests[0].get('x-dukamp-actor-ip'),'127.0.0.1');assert.equal(requests[1].get('x-dukamp-actor-ip'),null);
  assert.equal(requests[0].get('authorization'),null);
 } finally {
  globalThis.fetch=oldFetch;
  if(oldKey===undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
  if(oldUrl===undefined) delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;
 }
});
const adminAuthUrl = moduleUrl('export const authenticateSupportAdmin = request => globalThis.__auditAuth(request);');
const auditIpUrl = moduleUrl('export const trustedRequestIp = request => request.headers.get("x-nf-client-connection-ip");');
const routeSource = source('src/routes/api/admin/audit.ts').replace(/import \{ createFileRoute \} from .*?;/,'const createFileRoute = () => options => options;').replaceAll('@/lib/admin-support.server',adminAuthUrl).replaceAll('@/lib/audit.server',auditIpUrl);
const { Route: auditRoute } = await import(moduleUrl(routeSource));
test('audit endpoint rejects unauthenticated reads and writes',async()=>{
 globalThis.__auditAuth = async()=>({response:new Response('Unauthorized',{status:401})});
 for(const method of ['GET','POST']) assert.equal((await auditRoute.server.handlers[method]({request:new Request('https://fixture.invalid/api/admin/audit',{method})})).status,401);
});
test('admin access records the verified actor and deduplicates by session',async()=>{
 const records=[]; const sessionId='00000000-0000-4000-8000-000000000003';
 const claims=Buffer.from(JSON.stringify({sub:'untrusted-claim',session_id:sessionId})).toString('base64url');
 const db={from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{full_name:'Verified Admin'}}),upsert:async(row,options)=>{records.push({row,options});return {};}})};
 globalThis.__auditAuth=async()=>({user:{id:'verified-admin',email:'fixture@example.invalid'},supabaseAdmin:db});
 const response=await auditRoute.server.handlers.POST({request:new Request('https://fixture.invalid/api/admin/audit',{method:'POST',headers:{authorization:'Bearer fixture.'+claims+'.fixture','x-nf-client-connection-ip':'127.0.0.1'},body:JSON.stringify({actor_id:'forged-user'})})});
 assert.equal(response.status,200); assert.equal(records[0].row.actor_id,'verified-admin');
 assert.equal(records[0].row.actor_ip,'127.0.0.1');assert.equal(records[0].row.session_id,sessionId);
 assert.deepEqual(records[0].options,{onConflict:'session_id',ignoreDuplicates:true});
});

const colorOptions = [{ id: '11111111-1111-4111-8111-111111111111', name: 'Cor do produto', values: [
 { id:'22222222-2222-4222-8222-222222222222', label:'Preta', image:'https://fixture.invalid/preta.webp' },
 { id:'33333333-3333-4333-8333-333333333333', label:'Branca' },
] }];
const optionItem = (index, quantity) => ({...fixture.items[0],quantity,selected_options:[{option_id:colorOptions[0].id,value_id:colorOptions[0].values[index].id}]});
test('checkout preserves distinct alternatives of the same product in order items', async()=>{
 const writes=setupDb(true,colorOptions); process.env.MERCADO_PAGO_ACCESS_TOKEN='fixture-only';
 await createPixOrder({...fixture,items:[optionItem(0,2),optionItem(1,3)]});
 const lines=writes.find(write=>write.table==='order_items').value;
 assert.equal(lines.length,2); assert.equal(lines[0].selected_options[0].label,'Preta'); assert.equal(lines[1].selected_options[0].label,'Branca');
 assert.equal(lines[0].selected_options[0].image,'https://fixture.invalid/preta.webp');
 assert.equal(writes.find(write=>write.table==='orders').value.subtotal,50);
});
test('invalid or missing alternatives are rejected before creating any order', async()=>{
 const writes=setupDb(true,colorOptions);
 await assert.rejects(createPixOrder(fixture),/Escolha uma alternativa/);
 await assert.rejects(createPixOrder({...fixture,items:[{...optionItem(0,1),selected_options:[{option_id:colorOptions[0].id,value_id:'99999999-9999-4999-8999-999999999999'}]}]}),/alternativa válida/);
 assert.equal(writes.length,0);
});
test('checkout checks shared product stock across different alternatives', async()=>{
 const writes=setupDb(true,colorOptions);
 await assert.rejects(createPixOrder({...fixture,items:[optionItem(0,6),optionItem(1,5)]}),/Estoque insuficiente/);
 assert.equal(writes.length,0);
});


test('partner checkout derives the discounted Dukamp charge from the stored quote, ignoring browser freight and price',async()=>{
 const writes=setupDb();const db=globalThis.__fulfillmentDb;
 globalThis.__partnerCheckout=async(_db,user,data)=>{
  assert.equal(user,'verified-user');assert.equal(data.partner_quote_id,'00000000-0000-4000-8000-000000000003');
  return {partner:{id:'partner-a',razao_social:'Fixture Partner'},quote:{id:data.partner_quote_id,gross_total:70,commission_amount:7,shipping_cost:50,payload:{shipping:{servico:'PAC',prazoDias:5}}},requestHash:'fixture-hash',existingOrder:null};
 };
 db.rpc=async(name,args)=>{assert.equal(name,'create_dukamp_partner_order');writes.push({table:'partner-order',value:args.p_order,items:args.p_items});return {data:{...args.p_order,id:'00000000-0000-4000-8000-000000000002',order_number:'TEST-PARTNER'}}};
 const originalFetch=globalThis.fetch;let payment;
 globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.mercadopago.com/v1/payments');payment=JSON.parse(init.body);return Response.json({id:123,status:'pending',external_reference:payment.external_reference,currency_id:'BRL',transaction_amount:payment.transaction_amount,date_last_updated:new Date().toISOString(),point_of_interaction:{transaction_data:{qr_code:'fixture-pix'}}});};
 try{
  const result=await createPixOrder({...fixture,cep:'15150104',rua:'Rua teste',numero:'1',bairro:'Centro',cidade:'Monte Aprazível',estado:'SP',fulfillment_method:'delivery',payment_method:'pix',partner_quote_id:'00000000-0000-4000-8000-000000000003'});
  const order=writes.find(w=>w.table==='partner-order');
  assert.equal(order.value.user_id,null);assert.equal(order.value.subtotal,20);assert.equal(order.value.shipping_cost,50);assert.equal(order.value.shipping_service,'PAC');
  assert.equal(order.value.partner_gross_total,70);assert.equal(order.value.partner_commission_amount,7);assert.equal(order.value.total,63);assert.equal(order.value.payment_base_amount,63);
  assert.equal(payment.transaction_amount,63);assert.equal(result.amount,63);assert.equal(order.items[0].unit_price,10);
 }finally{globalThis.fetch=originalFetch}
});
test('repeating a completed partner checkout returns the existing charge without creating another payment',async()=>{
 const writes=setupDb();globalThis.__partnerCheckout=async()=>({quote:{},partner:{},existingOrder:{id:'existing-order',order_number:'EXISTING',mp_payment_id:'123',total:63,subtotal:20,tax_amount:0,shipping_cost:50}});
 const result=await createPixOrder({...fixture,partner_quote_id:'00000000-0000-4000-8000-000000000003'});
 assert.equal(result.orderId,'existing-order');assert.equal(writes.length,0);
});
