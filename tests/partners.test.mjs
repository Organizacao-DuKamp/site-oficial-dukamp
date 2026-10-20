import test from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const moduleUrl = text => 'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text)).toString('base64');
const partnersUrl = moduleUrl(source('src/lib/partners.ts').replaceAll('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const {partnerAmounts,validCnpj,partnerLoginEmail,partnerSchema,partnerQuoteFingerprint,recognizedPartnerSale} = await import(partnersUrl);
const taxUrl=moduleUrl(source('src/lib/tax.ts'));
const pricingUrl=moduleUrl(source('src/lib/pricing.ts').replaceAll('"./tax"',JSON.stringify(taxUrl)));
const optionsUrl=moduleUrl(source('src/lib/product-options.ts').replaceAll('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const manufacturingUrl=moduleUrl(source('src/lib/dukamp-products.ts'));
const requestUrl=moduleUrl('export const getRequest=()=>new Request("https://fixture.invalid");');
const auditUrl=moduleUrl('export const createAuditedAdminClient=()=>globalThis.__partnersDb;');
const ownShippingUrl=moduleUrl('export const calculateDukampShipping=async options=>globalThis.__ownShipping(options);');
const shippingUrl=moduleUrl('export const calculateShipping=async options=>globalThis.__publicShipping(options);');
const server=await import(moduleUrl(source('src/lib/partners.server.ts')
 .replaceAll('"./partners"',JSON.stringify(partnersUrl)).replaceAll('"./pricing"',JSON.stringify(pricingUrl))
 .replaceAll('"./dukamp-products"',JSON.stringify(manufacturingUrl))
 .replaceAll('"./product-options"',JSON.stringify(optionsUrl)).replaceAll('"./audit.server"',JSON.stringify(auditUrl))
 .replaceAll('"@tanstack/react-start/server"',JSON.stringify(requestUrl)).replaceAll('"./dukamp-shipping.functions"',JSON.stringify(ownShippingUrl))
 .replaceAll('"./checkout.functions"',JSON.stringify(shippingUrl))));
const address={cep:'15150104',rua:'Rua de teste',numero:'10',bairro:'Centro',cidade:'Monte Aprazível',estado:'SP',complemento:''};
const item={product_id:'00000000-0000-4000-8000-000000000001',quantity:2,selected_options:[]};
const ownProduct={id:item.product_id,name:'DUKAMP Ração Fixture',stock:3,active:true,options:[],price:100,consumer_price:100};
const input={...address,items:[item],fulfillment_method:'delivery'};
function fakeDb(tables,admin=false){
 return {rpc:async()=>({data:admin}),from(table){let filters=[];let inserted;const chain={
  select(){return chain},or(){return chain},order(){return chain},range(){return chain},eq(key,value){filters.push(row=>row[key]===value);return chain},is(key,value){filters.push(row=>row[key]===value);return chain},in(key,values){filters.push(row=>values.includes(row[key]));return chain},
  insert(value){inserted=value;(tables[table]||=[]).push({id:'generated-quote',...value});return chain},
  async single(){const rows=(tables[table]||[]).filter(row=>filters.every(f=>f(row)));return {data:inserted?{id:'generated-quote',...inserted}:rows[0]||null}},
  async maybeSingle(){return chain.single()},
  then(resolve,reject){return Promise.resolve({data:(tables[table]||[]).filter(row=>filters.every(f=>f(row)))}).then(resolve,reject)},
 };return chain;}};
}
const partner={id:'partner-a',user_id:'user-a',active:true,deleted_at:null,razao_social:'Fixture'};
const quote={id:'quote-a',partner_id:partner.id,payload:{fingerprint:partnerQuoteFingerprint(input),shipping:{servico:'PAC',valor:50,prazoDias:5}},shipping_cost:50,subtotal:200,gross_total:250,commission_amount:25,net_total:225,expires_at:new Date(Date.now()+60000).toISOString(),order_id:null};
const checkout={...input,partner_quote_id:quote.id,customer_name:'Fixture Client',email:'fixture@example.invalid',phone:'17999999999',cpf_cnpj:'12345678901',payment_method:'pix'};

test('commission includes freight, is deducted once and reconciles every cent',()=>{
 assert.deepEqual(partnerAmounts(1000,200),{gross:1200,commission:120,net:1080});
 assert.deepEqual(partnerAmounts(19.99,0.06),{gross:20.05,commission:2.01,net:18.04});
 for(let cents=1;cents<10000;cents++){
  const value=partnerAmounts(cents/100,5.13);
  assert.equal(Math.round(value.gross*100),Math.round(value.commission*100)+Math.round(value.net*100));
 }
 for(const value of [-1,NaN,Infinity])assert.throws(()=>partnerAmounts(value,10));
});
test('company validation rejects fake CNPJ and unsafe usernames',()=>{
 assert.equal(validCnpj('11.222.333/0001-81'),true);assert.equal(validCnpj('11.222.333/0001-82'),false);assert.equal(validCnpj('00.000.000/0000-00'),false);
 assert.equal(partnerLoginEmail(' LOJA_123 '),'loja_123@parceiros.dukamp.com.br');
 for(const name of ['a','x@y.com','loja / teste','loja,cnpj.eq.x'])assert.throws(()=>partnerLoginEmail(name));
 assert.equal(partnerSchema.safeParse({...address,cnpj:'11.222.333/0001-81',razao_social:'Fixture',nome_completo:'Fixture Owner',username:'fixture',password:'short'}).success,false);
});
test('quote fingerprint binds address, quantities, variants and delivery method',()=>{
 const base=partnerQuoteFingerprint(input);
 assert.equal(base,partnerQuoteFingerprint({...input,cep:'15150-104',estado:'sp'}));
 for(const change of [{numero:'11'},{cep:'15000000'},{items:[{...item,quantity:3}]},{items:[{...item,selected_options:[{option_id:'a',value_id:'b'}]}]},{fulfillment_method:'pickup'}])assert.notEqual(base,partnerQuoteFingerprint({...input,...change}));
});
test('only approved, uncancelled and unrefunded sales count toward commission',()=>{
 const paid={payment_status:'approved',delivery_status:'preparando',refund_status:'none'};
 assert.equal(recognizedPartnerSale(paid),true);
 for(const change of [{payment_status:'pending'},{payment_status:'in_process'},{payment_status:'refunded'},{delivery_status:'cancelada'},{refund_status:'requested'},{refund_status:'refunded'}])assert.equal(recognizedPartnerSale({...paid,...change}),false);
});
test('authorization rejects other tenants, expired/modified quotes and deactivated partners',async()=>{
 const db=fakeDb({dukamp_partners:[partner],dukamp_partner_quotes:[quote],products:[ownProduct]});
 await assert.rejects(server.authorizePartnerCheckout(db,'user-a',checkout),/sem pagamento/);
 await assert.rejects(server.authorizePartnerCheckout(db,null,checkout),/Entre no painel/);
 await assert.rejects(server.authorizePartnerCheckout(db,'user-b',checkout),/não autorizado/);
 await assert.rejects(server.authorizePartnerCheckout(db,'user-a',{...checkout,numero:'99'}),/mudaram/);
 await assert.rejects(server.authorizePartnerCheckout(fakeDb({dukamp_partners:[{...partner,active:false}]}),'user-a',checkout),/não autorizado/);
 await assert.rejects(server.authorizePartnerCheckout(fakeDb({dukamp_partners:[partner],dukamp_partner_quotes:[{...quote,expires_at:'2020-01-01'}]}),'user-a',checkout),/expirou/);
 await assert.rejects(server.requirePartnerAdmin(db,'user-a'),/administradores/);
});
test('consumed quotes allow only the exact same checkout request',async()=>{
 const requestHash=createHash('sha256').update(JSON.stringify({
  fingerprint: quote.payload.fingerprint, customer: [checkout.customer_name,checkout.email,checkout.phone,checkout.cpf_cnpj,"",""],
  profile: {}, method: "pix", installments: null
 })).digest('hex');
 const consumed={...quote,order_id:'order-a',checkout_hash:requestHash,expires_at:'2020-01-01'};
 const db=fakeDb({dukamp_partners:[partner],dukamp_partner_quotes:[consumed],orders:[{id:'order-a',partner_id:'partner-a',payment_status:'pending'}]});
 assert.equal((await server.authorizePartnerCheckout(db,'user-a',checkout)).existingOrder.id,'order-a');
 for(const change of [{customer_name:'Another customer'},{payment_method:'boleto'},{partner_customer_details:{observacoes:'changed'}}])await assert.rejects(server.authorizePartnerCheckout(db,'user-a',{...checkout,...change}),/já possui/);
});
test('simulation derives prices and freight server-side and aggregates stock across variants',async()=>{
 const tables={dukamp_partners:[partner],products:[ownProduct],dukamp_partner_quotes:[]};
 globalThis.__partnersDb=fakeDb(tables);globalThis.__ownShipping=async()=>({option:null,status:{eligible:false}});globalThis.__publicShipping=async()=>({opcoes:[{servico:'SEDEX',valor:80,prazoDias:2},{servico:'PAC',valor:50,prazoDias:5}]});
 const result=await server.quotePurchase('user-a',input);
 assert.equal(result.subtotal,200);assert.equal(result.shipping.valor,50);assert.equal(result.gross,250);assert.equal(result.commission,25);assert.equal(result.net,225);
 const express=await server.quotePurchase('user-a',{...input,shipping_service:'SEDEX'});assert.equal(express.shipping.valor,80);
 await assert.rejects(server.quotePurchase('user-a',{...input,shipping_service:'free'}),/Frete inválido/);
 await assert.rejects(server.quotePurchase('user-a',{...input,items:[item,item]}),/estoque insuficiente/);
 assert.equal(tables.dukamp_partner_quotes.length,2);
});

test('partner catalog excludes third-party medicines, electronics and other feed brands',async()=>{
 const tables={dukamp_partners:[partner],products:[ownProduct,
  {...ownProduct,id:'ade',name:'ADITIVO ADEKAMP GOLD 10KG'},
  {...ownProduct,id:'branded',name:'Suplemento mineral',brand:'Dukamp'},
  {...ownProduct,id:'medicine',name:'ACURA 25ML'},
  {...ownProduct,id:'electronics',name:'Adaptador USB Bluetooth CSR 5.0'},
  {...ownProduct,id:'foreign-feed',name:'Ração de outra fábrica',brand:'Outra marca',catalogs:{name:'Rações para Gado de Corte'}}]};
 globalThis.__partnersDb=fakeDb(tables);
 assert.deepEqual((await server.getPartnerProducts('user-a')).map(p=>p.id),[ownProduct.id,'ade','branded']);
});

test('third-party products fail simulation and an old quote cannot authorize a new checkout',async()=>{
 const products=[{...ownProduct,name:'ACURA 25ML'}];
 const tables={dukamp_partners:[partner],products,dukamp_partner_quotes:[quote]};
 globalThis.__partnersDb=fakeDb(tables);
 await assert.rejects(server.quotePurchase('user-a',input),/somente produtos fabricados/);
 await assert.rejects(server.authorizePartnerCheckout(fakeDb(tables),'user-a',checkout),/somente produtos fabricados/);
 assert.equal(tables.dukamp_partner_quotes.length,1);
});

test('commercial approval recognizes a manually assigned commission without a payment', () => {
 const order={request_kind:'approval',approval_status:'approved',payment_status:'not_required',delivery_status:'preparando',refund_status:'none'};
 assert.equal(recognizedPartnerSale(order),true);
 for(const approval_status of ['pending','rejected']) assert.equal(recognizedPartnerSale({...order,approval_status}),false);
 assert.equal(recognizedPartnerSale({...order,delivery_status:'cancelada'}),false);
});
