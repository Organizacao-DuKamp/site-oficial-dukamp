import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {createPartnerDatabase} from './fixtures/partner-database.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('real PostgreSQL: partner migration, tenant RLS, atomic checkout, payment reconciliation and refunds',async()=>{
 const db=await createPartnerDatabase();
 try {
  await db.exec(source('tests/partners.sql'));
  for(const table of ['dukamp_partners','dukamp_partner_quotes','orders','order_items','web_order_sales','customers']){
   assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n,0,`Fixture leaked into ${table}`);
  }
 } finally {await db.close();}
});
