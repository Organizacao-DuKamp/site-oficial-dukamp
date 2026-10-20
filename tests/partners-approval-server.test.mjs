import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const url=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const partners=url(src('src/lib/partners.ts').replaceAll('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const options=url(src('src/lib/product-options.ts').replaceAll('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const manufacturing=url(src('src/lib/dukamp-products.ts'));
const stores=url(src('src/lib/storefronts.ts').replaceAll('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const request=url('export const getRequest=()=>new Request("https://fixture.invalid");');
const audit=url('export const createAuditedAdminClient=()=>globalThis.__requestDb;');
const authorization=url(`
 export async function requirePartner(db,userId) {
  if(userId!=='owner' || !globalThis.__activePartner) throw Error('Parceiro não autorizado');
  return {id:'partner-a',user_id:'owner'};
 }
 export async function requirePartnerAdmin(db,userId) {if(userId!=='admin')throw Error('Apenas administradores');}
`);
const storeServer=url('export async function ownStore(userId){if(userId!=="owner")throw Error("não autorizado");return {store:globalThis.__requestStore};}');
let text=src('src/lib/partner-requests.server.ts');
for(const [key,value] of [['./partners',partners],['./product-options',options],['./dukamp-products',manufacturing],['./storefronts',stores],['./audit.server',audit],['@tanstack/react-start/server',request],['./partners.server',authorization],['./storefronts.server',storeServer]])
 text=text.replaceAll(JSON.stringify(key),JSON.stringify(value));
const server=await import(url(text));
const {partnerQuoteFingerprint}=await import(partners);
const item={product_id:'product-a',quantity:2,selected_options:[]};
const input={partner_quote_id:'quote-a',cep:'15150104',rua:'Rua',numero:'1',bairro:'Centro',cidade:'Monte Aprazível',estado:'SP',complemento:'',items:[item],fulfillment_method:'delivery',customer_name:'Cliente',email:'fixture@example.invalid',phone:'17999999999',cpf_cnpj:'12345678901',partner_customer_details:{}};
const quote={id:'quote-a',partner_id:'partner-a',order_id:null,expires_at:new Date(Date.now()+60000).toISOString(),subtotal:100,shipping_cost:20,payload:{fingerprint:partnerQuoteFingerprint(input),lines:[{...item,unit_price:50,subtotal:100}],shipping:{servico:'Dukamp',prazoDias:3}}};
function db(tables){
 const calls=[];
 return {calls, rpc:async(name,args)=>{calls.push({name,args});return {data:{id:'request-a',order_number:'DKP123'}};},
 from(name){const filters=[];let update;
 const chain={select(){return chain;},eq(k,v){filters.push(x=>x[k]===v);return chain;},is(k,v){filters.push(x=>x[k]===v);return chain;},in(k,v){filters.push(x=>v.includes(x[k]));return chain;},
 update(patch){update=patch;return chain;},
 then(resolve,reject){const rows=(tables[name]||[]).filter(x=>filters.every(f=>f(x)));if(update)for(const row of rows)Object.assign(row,update);return Promise.resolve({data:rows}).then(resolve,reject);},
 async maybeSingle(){const r=await chain;return {data:r.data[0]||null};},async single(){return chain.maybeSingle();}};return chain;}
 };
}
function setup(extra={}){
 globalThis.__activePartner=true;
 const tables={products:[{id:'product-a',name:'Ração DUKAMP',active:true,stock:4,options:[]}],dukamp_partner_quotes:[quote],dukamp_partners:[{id:'partner-a',pix_key:''}],...extra};
 globalThis.__requestDb=db(tables);return {tables,db:globalThis.__requestDb};
}
test('request submission freezes server quote prices, freight and options without starting payment',async()=>{
 const fixture=setup();
 assert.deepEqual(await server.submitPartnerRequest('owner',input),{orderId:'request-a'});
 assert.equal(fixture.db.calls.length,1);
 const {name,args}=fixture.db.calls[0];assert.equal(name,'submit_partner_sale_request');assert.equal(args.p_actor,'owner');
 assert.equal(args.p_subtotal,100);assert.equal(args.p_shipping,20);assert.equal(args.p_details.phone,input.phone);
 assert.equal(args.p_items[0].unit_price,50);assert.equal(args.p_items[0].quantity,2);
 assert.equal(args.p_details.payment_method,undefined);assert.equal(args.p_details.commission_amount,undefined);
});
test('another partner, expired quote, altered address and third-party products cannot submit',async()=>{
 setup();await assert.rejects(server.submitPartnerRequest('stranger',input),/não autorizado/);
 setup({dukamp_partner_quotes:[{...quote,expires_at:'2020-01-01'}]});await assert.rejects(server.submitPartnerRequest('owner',input),/expirada/);
 setup();await assert.rejects(server.submitPartnerRequest('owner',{...input,numero:'99'}),/mudaram/);
 setup({products:[{id:'product-a',name:'Terramicina',active:true,stock:4,options:[]}]});await assert.rejects(server.submitPartnerRequest('owner',input),/somente produtos fabricados/);
 setup({products:[{id:'product-a',name:'Ração DUKAMP',active:true,stock:1,options:[]}]});await assert.rejects(server.submitPartnerRequest('owner',input),/estoque insuficiente/);
 assert.equal(globalThis.__requestDb.calls.length,0);
});
test('only admin sets approval/commission and only active owner saves own Pix key',async()=>{
 const {db,tables}=setup();
 await assert.rejects(server.reviewPartnerRequest('owner',{id:'request-a',action:'approve',commission:12}),/administradores/);
 assert.equal(db.calls.length,0);
 await server.reviewPartnerRequest('admin',{id:'request-a',action:'approve',commission:12});
 assert.equal(db.calls[0].args.p_commission,12);assert.equal(db.calls[0].args.p_actor,'admin');
 await assert.rejects(server.updatePartnerPix('stranger','other'),/não autorizado/);
 await server.updatePartnerPix('owner','fixture@example.invalid');assert.equal(tables.dukamp_partners[0].pix_key,'fixture@example.invalid');
 globalThis.__activePartner=false;await assert.rejects(server.updatePartnerPix('owner','changed'),/não autorizado/);
});
test('manual store sales use authoritative own stock/prices and also await administrator approval',async()=>{
 const {db}=setup({partner_store_products:[{id:'product-a',name:'Produto fixture',store_id:'store-a',active:true,deleted_at:null,stock:4,price:50,cost:10}]});
 globalThis.__requestStore={id:'store-a',slug:'fixture',pickup_enabled:true,delivery_enabled:true,delivery_fee:7.5,delivery_cep_prefixes:['15150'],free_shipping_from:0,delivery_days:2};
 const checkout={slug:'fixture',request_id:'request-key',access_token:'private',items:[{product_id:'product-a',quantity:2}],fulfillment:'delivery',payment_method:'manual',customer:{name:'Cliente',email:'fixture@example.invalid',phone:'17999999999',document:'12345678901',cep:'15150104',street:'Rua',number:'1',neighborhood:'Centro',city:'Monte Aprazível',state:'SP',complement:'',notes:''}};
 await server.submitStoreRequest('owner',checkout);
 assert.equal(db.calls[0].name,'submit_partner_sale_request');assert.equal(db.calls[0].args.p_store,'store-a');
 assert.equal(db.calls[0].args.p_subtotal,100);assert.equal(db.calls[0].args.p_shipping,7.5);assert.equal(db.calls[0].args.p_items[0].cost,undefined);
 await assert.rejects(server.submitStoreRequest('owner',{...checkout,slug:'different'}),/não autorizada/);
});
