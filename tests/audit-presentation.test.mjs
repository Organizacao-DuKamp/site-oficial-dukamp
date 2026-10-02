import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const url = text => 'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text)).toString('base64');
const presentationUrl=url(source('src/lib/audit-presentation.ts'));
const {auditChanges,auditValue,auditSummary,auditRecord,auditDate}=await import(presentationUrl);
const adminId='00000000-0000-4000-8000-000000000001';
const customerId='00000000-0000-4000-8000-000000000002';
const event={id:'event',created_at:'2026-10-02T14:16:06Z',action:'update',entity_table:'support_tickets',changed_fields:['closed_at','closed_by','status'],before_data:{id:'private-record',status:'open',user_id:customerId,closed_at:null,closed_by:null},after_data:{id:'private-record',status:'closed',user_id:customerId,closed_at:'2026-10-02T14:16:06Z',closed_by:adminId},people:{[adminId]:'Administrador Eduardo',[customerId]:'Cliente Teste'}};
test('support closure reads as a customer action with only changed fields',()=>{
 assert.equal(auditSummary(event),'Encerrou o atendimento');assert.equal(auditRecord(event),'Atendimento de Cliente Teste');
 const changes=auditChanges(event);assert.equal(changes.length,3);
 assert.deepEqual(changes.map(c=>c.label),['Encerrado em','Encerrado por','Situação']);
 assert.equal(auditValue('status','open'),'Aberto');assert.equal(auditValue('status','closed'),'Encerrado');
 assert.equal(auditValue('closed_by',adminId,event.people),'Administrador Eduardo');
 assert.equal(auditValue('closed_at',null),'Não informado');
});
test('currency, dates, boolean values and UUID references use readable labels',()=>{
 assert.match(auditValue('shipping_cost',12.5),/R\$\s*12,50/);
 assert.equal(auditValue('active',false),'Não');assert.equal(auditValue('stock',0),'0');
 assert.equal(auditDate('2026-10-02'),'02/10/2026');assert.match(auditDate('2026-10-02T14:16:06Z'),/11:16/);
 assert.equal(auditValue('closed_by',adminId),'Cadastro vinculado');
 assert.equal(auditValue('encrypted_blob','ciphertext'),'Informação protegida');
});
test('nested ERP edits display only the price that changed',()=>{
 const e={...event,entity_table:'erp_products',changed_fields:['pricing_data'],before_data:{pricing_data:{custo_real:'10,00',valor_minimo:'20,00'}},after_data:{pricing_data:{custo_real:'10,00',valor_minimo:'25,00'}}};
 const changes=auditChanges(e);assert.equal(changes.length,1);
 assert.equal(changes[0].label,'Preços e margens › Valor mínimo');assert.match(auditValue(changes[0].field,changes[0].after),/25,00/);
});
test('created/deleted records omit empty values and secret identifiers',()=>{
 const e={...event,action:'insert',changed_fields:['id','name','updated_at','secret_token','phone'],before_data:null,after_data:{id:adminId,name:'Produto',updated_at:'date',secret_token:'secret',phone:null}};
 assert.deepEqual(auditChanges(e).map(c=>c.label),['Nome']);
 assert.equal(auditSummary({...event,action:'admin_login'}),'Entrou no painel administrativo');
});
const serverSource=source('src/lib/audit-records.server.ts').replace('"./audit-presentation"',JSON.stringify(presentationUrl));
const {enrichAuditRows,AUDIT_LIST_COLUMNS}=await import(url(serverSource));
test('preview resolves customer names in one query without shipping full snapshots',async()=>{
 let calls=0;const db={from(table){calls++;assert.equal(table,'profiles');return {select(){return this;},in:async()=>({data:[{id:customerId,full_name:'Cliente Teste',email:'fixture@example.invalid'}]})};}};
 const rows=await enrichAuditRows(db,[{...event,before_data:undefined,after_data:undefined,before_status:'open',after_status:'closed',after_user_id:customerId,after_name:null,after_value:'a large blob'}]);
 assert.equal(calls,1);assert.equal(rows[0].record_label,'Atendimento de Cliente Teste');assert.equal(auditSummary(rows[0]),'Encerrou o atendimento');
 assert.equal(rows[0].after_data.value,undefined);assert(!AUDIT_LIST_COLUMNS.includes('after_data,'));
});
test('linked products and categories are displayed by name without replacing person names',async()=>{
 const db={from(table){return {select(){return this;},in:async()=>({data:table==='profiles' ? [{id:adminId,full_name:'Administrador Eduardo'}] : [{id:adminId,name:'Vermífugos'}]})};}};
 const [row]=await enrichAuditRows(db,[{...event,entity_table:'products',before_data:{category_id:adminId},after_data:{category_id:adminId,closed_by:adminId}}],true);
 assert.equal(auditValue('category_id',adminId,row.people),'Vermífugos');
 assert.equal(auditValue('closed_by',adminId,row.people),'Administrador Eduardo');
});
