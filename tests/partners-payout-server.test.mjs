import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const url=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const authorization=url(`export async function requirePartner(db,userId){if(userId!=='owner')throw Error('Parceiro não autorizado');return {id:'partner-a',razao_social:'Fixture',pix_key:'fixture@example.invalid'};}
export async function requirePartnerAdmin(db,userId){if(userId!=='admin')throw Error('Apenas administradores');}`);
const request=url('export const getRequest=()=>new Request("https://fixture.invalid");'),audit=url('export const createAuditedAdminClient=()=>globalThis.__commissionDb;');
let source=readFileSync(new URL('../src/lib/partner-commissions.server.ts',import.meta.url),'utf8');
for(const[key,value]of[['./partners.server',authorization],['./audit.server',audit],['@tanstack/react-start/server',request]]) source=source.replaceAll(JSON.stringify(key),JSON.stringify(value));
const server=await import(url(source));
function mock(){
 const calls=[];
 const db={calls,rpc:async(name,args)=>{calls.push({name,args});return {data:name==='get_partner_commission_account'?{partner_name:'Fixture',pix_key:'fixture@example.invalid',balance:20,paid_total:10,sales_count:2,balance_token:'token',credits:[{private:true}]}:{id:'receipt-a',amount:20,paid_at:'2026-10-20'},error:null};},
 from(table){const filters=[];const chain={select(){return chain;},eq(key,value){filters.push([key,value]);return chain;},order(){return chain;},range(start,end){calls.push({table,start,end,filters});return chain;},single:async()=>({data:{id:'partner-b',razao_social:'Outra',pix_key:'other'}}),then(resolve,reject){return Promise.resolve({data:[{id:'receipt',amount:10,paid_at:'2026-10-01',paid_sales_count:1,pix_key_snapshot:'saved'}],count:21,error:null}).then(resolve,reject);}};return chain;}
 };
 globalThis.__commissionDb=db;return db;
}
test('owner commission history is tenant scoped and paginated; other accounts require admin authorization',async()=>{
 const db=mock();
 const own=await server.loadPartnerCommissionAccount('owner',{page:2});
 assert.equal(own.partner_id,'partner-a');assert.equal(own.balance,20);assert.equal(own.paid_total,10);assert.equal(own.credits,undefined);
 const history=db.calls.find(c=>c.table==='partner_commission_payouts');assert.deepEqual(history.filters,[['partner_id','partner-a']]);assert.equal(history.start,20);assert.equal(history.end,39);
 await assert.rejects(server.loadPartnerCommissionAccount('owner',{partnerId:'partner-b',page:1}),/administradores/);
 await assert.rejects(server.loadPartnerCommissionAccount('stranger',{page:1}),/não autorizado/);
 const other=await server.loadPartnerCommissionAccount('admin',{partnerId:'partner-b',page:1});assert.equal(other.partner_id,'partner-b');
});
test('only administrators record a commission payout and actor identity comes from the session',async()=>{
 const db=mock(),input={partnerId:'partner-a',requestId:'request-a',amount:20,balanceToken:'token'};
 await assert.rejects(server.settlePartnerCommission('owner',input),/administradores/);assert.equal(db.calls.length,0);
 await server.settlePartnerCommission('admin',input);
 assert.equal(db.calls[0].name,'confirm_partner_commission_payout');assert.equal(db.calls[0].args.p_actor,'admin');
 assert.equal(db.calls[0].args.p_partner,'partner-a');assert.equal(db.calls[0].args.p_expected_amount,20);assert.equal(db.calls[0].args.p_balance_token,'token');
});
