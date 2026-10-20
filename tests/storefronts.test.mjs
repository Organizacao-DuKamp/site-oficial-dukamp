import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const moduleUrl=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const modelUrl=moduleUrl(source('src/lib/storefronts.ts').replaceAll('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const model=await import(modelUrl);
const secrets=moduleUrl(source('src/lib/storefront-secrets.server.ts'));
const crypto=await import(secrets);
const request=moduleUrl('export const getRequest=()=>new Request("https://shop.invalid",{headers:{"x-nf-client-connection-ip":"127.0.0.1"}});export const setResponseHeader=(k,v)=>{globalThis.__storeCookie=v};');
const admin=moduleUrl('export const supabaseAdmin=new Proxy({},{get:(_,key)=>globalThis.__storeDb[key]});');
const partners=source('src/lib/partners.server.ts');
const auth=moduleUrl('function check(e){if(e)throw new Error(e.message)}\n'+partners.slice(partners.indexOf('export async function requirePartner('),partners.indexOf('export async function requirePartnerAdmin')));
const tax=moduleUrl(source('src/lib/tax.ts'));
const pricing=moduleUrl(source('src/lib/pricing.ts').replaceAll('"./tax"',JSON.stringify(tax)));
const options=moduleUrl(source('src/lib/product-options.ts').replaceAll('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const manufacturing=moduleUrl(source('src/lib/dukamp-products.ts'));
const server=await import(moduleUrl(source('src/lib/storefronts.server.ts').replaceAll('"./dukamp-products"',JSON.stringify(manufacturing)).replaceAll('"@tanstack/react-start/server"',JSON.stringify(request)).replaceAll('"@/integrations/supabase/client.server"',JSON.stringify(admin)).replaceAll('"./partners.server"',JSON.stringify(auth)).replaceAll('"./storefronts"',JSON.stringify(modelUrl)).replaceAll('"./storefront-secrets.server"',JSON.stringify(secrets)).replaceAll('"./pricing"',JSON.stringify(pricing)).replaceAll('"./product-options"',JSON.stringify(options)).replaceAll('"sanitize-html"',JSON.stringify(import.meta.resolve('sanitize-html')))));
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const partner={id:a,user_id:'user-a',active:true,deleted_at:null,cnpj:'11222333000181',razao_social:'AgroPet'};
const cfg=model.storeConfigSchema.parse({name:'AgroPet',slug:'agropet',published:true,email:'agropet@example.invalid',phone:'17999999999',address:'Rua Fixture, 1'});
const store={id:a,partner_id:a,name:cfg.name,slug:cfg.slug,published:true,payment_connected:true,payment_account:'Conta Fixture',config:cfg,created_at:'2026-10-20T00:00:00Z',updated_at:'2026-10-20T00:00:00Z'};
function fakeDb(tables,rpc=()=>({data:true,error:null})){
 return {rpc:async(name,args)=>rpc(name,args),from(table){let filters=[],operation='select',value,projection='*';const chain={
 select(cols='*'){projection=cols;return chain},or(){return chain},eq(k,v){filters.push(r=>r[k]===v);return chain},is(k,v){filters.push(r=>r[k]===v);return chain},gt(k,v){filters.push(r=>r[k]>v);return chain},lt(k,v){filters.push(r=>r[k]<v);return chain},order(){return chain},range(){return chain},limit(){return chain},
 insert(v){operation='insert';value=v;return chain},upsert(v){operation='upsert';value=v;return chain},update(v){operation='update';value=v;return chain},delete(){operation='delete';return chain},
 result(single=false,maybe=false){let rows=(tables[table]||[]).filter(r=>filters.every(f=>f(r)));
 if(operation==='insert'){const row={id:crypto.randomSecret().slice(0,32),...value};(tables[table]||=[]).push(row);rows=[row];}
 if(operation==='upsert'){let row=(tables[table]||[]).find(r=>r.store_id===value.store_id);if(row)Object.assign(row,value);else{row={...value};(tables[table]||=[]).push(row);}rows=[row];}
 if(operation==='update')rows.forEach(r=>Object.assign(r,value));if(operation==='delete')tables[table]=(tables[table]||[]).filter(r=>!rows.includes(r));
 if(projection!=='*'&&!projection.includes('('))rows=rows.map(r=>Object.fromEntries(projection.split(',').map(k=>[k,r[k]])));
 return {data:single?rows[0]||null:rows.map(r=>({...r})),error:single&&!maybe&&!rows[0]?{message:'Registro não encontrado'}:null,count:rows.length};},
 async single(){return chain.result(true)},async maybeSingle(){return chain.result(true,true)},then(resolve,reject){return Promise.resolve(chain.result()).then(resolve,reject)},
 };return chain;}};
}
function tables(){return {dukamp_partners:[{...partner},{...partner,id:b,user_id:'user-b'}],partner_stores:[{...store},{...store,id:b,partner_id:b,slug:'outra-loja',config:{...cfg,slug:'outra-loja'}}],partner_store_products:[{id:a,store_id:a,name:'Produto A',code:'A',stock:10,price:19.99,cost:7,active:true,deleted_at:null,images:[],category:'Pet',brand:'Fixture',unit:'un',description:'<p>Produto A</p>'},{id:b,store_id:b,name:'Produto B',price:80,cost:40,stock:2,active:true,deleted_at:null}],products:[],partner_store_orders:[],partner_store_credentials:[]};}
process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-key-never-real';
process.env.PUBLIC_APP_URL='https://shop.invalid';
test('store URLs reject reserved routes and unsafe paths; shipping only covers configured CEPs',()=>{
 for(const s of ['admin','api','parceiro','checkout','dukamp','agro/pet','../x','x','Agro%20Pet'])assert.equal(model.storeSlugSchema.safeParse(s).success,false,s);
 assert.equal(model.storeSlugSchema.parse(' AgroPet '),'agropet');
 const config={...cfg,pickup_enabled:true,delivery_enabled:true,delivery_fee:12.5,free_shipping_from:100,delivery_cep_prefixes:['15150']};
 assert.equal(model.storeDelivery(config,'pickup','',50),0);assert.equal(model.storeDelivery(config,'delivery','15150-104',50),12.5);assert.equal(model.storeDelivery(config,'delivery','15150-104',100),0);
 assert.throws(()=>model.storeDelivery(config,'delivery','99999999',200));
 for(const to of ['javascript:alert(1)','//evil.invalid','data:text/html,hi','/../admin'])assert.equal(model.safeStoreLink(to),false,to);
});
test('prices are computed in cents and shared stock quantities aggregate; inactive and foreign products fail',()=>{
 const products=tables().partner_store_products;const result=model.storeTotals(products,[{product_id:a,quantity:1},{product_id:a,quantity:2}]);assert.equal(result.subtotal,59.97);assert.equal(result.items.length,1);assert.equal(result.items[0].quantity,3);
 assert.throws(()=>model.storeTotals(products,[{product_id:a,quantity:11}]));assert.throws(()=>model.storeTotals(products,[{product_id:'foreign',quantity:1}]));
});
test('payment credentials encrypt with random authenticated nonces; tampering never decrypts',()=>{
 const value='APP_USR-fixture-token-never-real';const first=crypto.sealSecret(value),second=crypto.sealSecret(value);assert.notEqual(first,second);assert.ok(!first.includes(value));assert.equal(crypto.openSecret(first),value);const parts=first.split('.');parts[2]='AAAAAAAAAAAAAAAAAAAAAA';assert.throws(()=>crypto.openSecret(parts.join('.')));
});
test('store HTML removes scripts, event handlers, iframes and unsafe URLs',()=>{
 const clean=server.sanitizeStoreHtml('<p onclick="steal()">Texto <strong>seguro</strong></p><script>alert(1)</script><img src=x onerror=steal()><iframe src="https://evil.invalid"></iframe><a href="javascript:alert(1)">link</a>');assert.equal(clean.includes('onclick'),false);assert.equal(/<script|<img|<iframe|javascript:/i.test(clean),false);assert.ok(clean.includes('<strong>seguro</strong>'));
});
test('owner is derived from authenticated user; another store product cannot be edited or deleted',async()=>{
 const data=tables();globalThis.__storeDb=fakeDb(data);assert.equal((await server.ownStore('user-a')).store.id,a);assert.equal((await server.ownStore('user-b')).store.id,b);
 await assert.rejects(server.saveProduct('user-a',{...data.partner_store_products[1],name:'Injected',version:'2026-10-20T00:00:00Z'}),/atualizado/);await assert.rejects(server.deleteProduct('user-a',b),/não encontrado/);assert.equal(data.partner_store_products[1].name,'Produto B');
 data.dukamp_partners[0].active=false;await assert.rejects(server.ownStore('user-a'),/não autorizado/);
});
test('public catalog excludes private costs and partner identity, with immutable Dukamp entries',async()=>{
 const data=tables();globalThis.__storeDb=fakeDb(data);const result=await server.publicStore('agropet');assert.equal(result.products.length,1);assert.equal(result.products[0].cost,undefined);assert.equal(result.products[0].store_id,undefined);assert.equal(result.store.partner_id,undefined);assert.equal(result.store.encrypted_token,undefined);
});
test('partner storefront exposes only DuKamp-manufactured catalog entries and preserves the store own stock',async()=>{
 const data=tables();data.products=[{id:'own',name:'DUKAMP Ração Baby',active:true,options:[],price:20,stock:5,images:[]},{id:'ade',name:'ADITIVO ADEKAMP GOLD',active:true,options:[],price:30,stock:5,images:[]},{id:'foreign',name:'ACURA 25ML',active:true,options:[],price:10,stock:5,images:[]}];
 globalThis.__storeDb=fakeDb(data);const result=await server.publicStore('agropet');
 assert.deepEqual(result.dukamp.map(p=>p.id),['own','ade']);assert.equal(result.products.length,1);
});
test('connecting payment account validates company, stores only ciphertext and returns no secret',async()=>{
 const data=tables();globalThis.__storeDb=fakeDb(data);const savedFetch=globalThis.fetch;try{globalThis.fetch=async()=>new Response(JSON.stringify({id:123,nickname:'Loja Fixture',site_id:'MLB',identification:{type:'CNPJ',number:partner.cnpj}}));const result=await server.connectCredentials('user-a','APP_USR-fixture-only');assert.deepEqual(result,{account:'Loja Fixture'});assert.equal(crypto.openSecret(data.partner_store_credentials[0].encrypted_token),'APP_USR-fixture-only');assert.ok(!JSON.stringify(data.partner_store_credentials).includes('APP_USR-fixture-only'));assert.equal(data.partner_store_credentials[0].collector_id,'123');}finally{globalThis.fetch=savedFetch;}
});
const checkout={slug:'agropet',request_id:'30000000-0000-4000-8000-000000000001',access_token:'a'.repeat(64),items:[{product_id:a,quantity:2}],customer:{name:'Cliente Fixture',email:'fixture@example.invalid',phone:'17999999999',document:'12345678901',cep:'',street:'',number:'',neighborhood:'',city:'',state:'',complement:'',notes:''},fulfillment:'pickup',payment_method:'card'};
test('card checkout uses only the store token, full amount without platform fees, bound return link and provider idempotency',async()=>{
 const data=tables();data.partner_store_credentials=[{store_id:a,encrypted_token:crypto.sealSecret('APP_USR-owner-token'),collector_id:'123'}];const order={id:b,store_id:a,order_number:101,total:39.98,subtotal:39.98,customer:checkout.customer,items:[],payment_method:'card',payment_status:'pending',expires_at:new Date(Date.now()+1800000).toISOString()};data.partner_store_orders=[order];let createCalls=0,payload;
 globalThis.__storeDb=fakeDb(data,(name,args)=>{if(name==='claim_partner_store_payment')return {data:{claimed:true,issued:false,retry:false},error:null};if(name==='create_partner_store_order'){createCalls++;assert.equal(args.p_store,a);assert.equal(args.p_access_hash,crypto.secretHash(checkout.access_token));return {data:{...order},error:null};}return {data:true,error:null};});
 const savedFetch=globalThis.fetch;let requests=0;try{globalThis.fetch=async(url,options)=>{requests++;assert.equal(options.headers.Authorization,'Bearer APP_USR-owner-token');assert.equal(options.headers['X-Idempotency-Key'],b);payload=JSON.parse(options.body);assert.equal(payload.items[0].unit_price,39.98);assert.equal(payload.marketplace_fee,undefined);assert.equal(payload.application_fee,undefined);assert.equal(payload.back_urls.success,`https://shop.invalid/agropet/pedido/${b}?token=${checkout.access_token}`);assert.equal(payload.notification_url,`https://shop.invalid/api/partner-store/webhook?store=${a}`);return new Response(JSON.stringify({id:'pref-fixture',init_point:'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=fixture'}));};
 assert.equal((await server.createStoreOrder(checkout)).id,b);await server.createStoreOrder(checkout);assert.equal(createCalls,2);assert.equal(requests,1);
 }finally{globalThis.fetch=savedFetch;}
});
test('Pix creates QR on owner account and rejects provider payments from another collector or currency',async()=>{
 const data=tables();data.partner_store_credentials=[{store_id:a,encrypted_token:crypto.sealSecret('APP_USR-owner-token'),collector_id:'123'}];const order={id:b,store_id:a,order_number:101,total:39.98,customer:checkout.customer,payment_method:'pix',payment_status:'pending',expires_at:new Date(Date.now()+1800000).toISOString()};data.partner_store_orders=[order];let reconciled;
 globalThis.__storeDb=fakeDb(data,(name,args)=>{if(name==='claim_partner_store_payment')return {data:{claimed:true,issued:false,retry:false},error:null};if(name==='create_partner_store_order')return {data:{...order},error:null};if(name==='reconcile_partner_store_payment'){reconciled=args;return {data:order,error:null};}return {data:true,error:null};});const savedFetch=globalThis.fetch;
 const payment={id:12345,collector_id:123,currency_id:'BRL',external_reference:b,transaction_amount:39.98,status:'pending',date_last_updated:new Date().toISOString(),point_of_interaction:{transaction_data:{qr_code:'PIX_FIXTURE',qr_code_base64:'UElYX0ZJWFRVUkU='}}};
 try{globalThis.fetch=async(url,options)=>{assert.equal(JSON.parse(options.body).transaction_amount,39.98);assert.equal(JSON.parse(options.body).application_fee,undefined);return new Response(JSON.stringify(payment));};await server.createStoreOrder({...checkout,payment_method:'pix'});assert.equal(data.partner_store_orders[0].qr_code,'PIX_FIXTURE');assert.equal(reconciled.p_store,a);assert.equal(reconciled.p_amount,39.98);
 await assert.rejects(server.reconcileStorePayment(a,{...payment,collector_id:999},'123'),/inválido/);await assert.rejects(server.reconcileStorePayment(a,{...payment,currency_id:'USD'},'123'),/inválido/);
 }finally{globalThis.fetch=savedFetch;}
});
test('unknown capabilities cannot read orders and public order output omits customer PII and costs',async()=>{
 const data=tables();data.partner_store_orders=[{id:b,store_id:a,order_number:1,access_hash:crypto.secretHash('b'.repeat(64)),source:'manual',payment_status:'approved',items:[{product_id:a,name:'A',unit_price:1,quantity:1,subtotal:1,cost:0.5}],customer:{name:'PRIVATE'},total:1}];globalThis.__storeDb=fakeDb(data);await assert.rejects(server.publicOrder('agropet',b,'a'.repeat(64)),/não encontrado/);const result=await server.publicOrder('agropet',b,'b'.repeat(64));assert.equal(result.customer,undefined);assert.equal(result.items[0].cost,undefined);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
});
