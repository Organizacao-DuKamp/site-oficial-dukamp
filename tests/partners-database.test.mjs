import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('real PostgreSQL: partner migration, tenant RLS, atomic checkout, payment reconciliation and refunds',async()=>{
 const db=new PGlite();
 try {
  await db.exec(source('tests/fixtures/partners-baseline.sql'));
  await db.exec(source('supabase/migrations/20260702183145_680d8d90-618b-45e1-8293-69e06159b3c1.sql'));
  await db.exec(`ALTER TYPE public.payment_method ADD VALUE 'boleto';`);
  await db.exec(`ALTER TABLE public.orders
   ADD delivery_status public.delivery_status NOT NULL DEFAULT 'preparando',ADD delivered_at timestamptz,ADD delivery_notified boolean DEFAULT false,
   ADD payment_base_amount numeric,ADD payment_fee numeric DEFAULT 0,ADD card_installments integer,ADD tax_amount numeric DEFAULT 0,ADD tax_destination_uf text,
   ADD seller_id uuid,ADD seller_name text,ADD seller_code text,ADD referencia_entrega text,ADD pessoa_autorizada text;
   ALTER TABLE public.order_items ADD base_unit_price numeric,ADD tax_code text,ADD icms_rate numeric,ADD tax_amount numeric,ADD selected_options jsonb DEFAULT '[]';`);
  await db.exec(source('supabase/migrations/20261002124855_reliable_payment_reconciliation.sql'));
  await db.exec(source('supabase/migrations/20261002134107_pickup_cancellation_audit.sql'));
  // Exercise the existing paid-order customer/ledger integration as well.
  await db.exec(`CREATE TABLE public.customers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),cliente text,codigo text,cnpj_cpf text,data_cadastro date,
   email text,telefone text,celular text,endereco text,numero text,bairro text,cidade text,uf text,cep text,complemento text,referencia_entrega text,pessoa_autorizada text,
   seller_record_id uuid,vendedor_codigo text,vendedor_nome text,dados_vendedor_atualizados_em timestamptz,web_registered boolean DEFAULT false,updated_at timestamptz DEFAULT now());
   CREATE TABLE public.dukamp_stock_items(code text,cost numeric,unit text,stock numeric,total_cost numeric,sale_price numeric,total_sale numeric,updated_at timestamptz);
   REVOKE INSERT ON public.orders FROM anon,authenticated;
   CREATE TABLE public.web_order_sales(order_id uuid PRIMARY KEY REFERENCES public.orders(id),customer_id uuid,user_id uuid,seller_id uuid,seller_name text,seller_code text,
   amount numeric,payment_total numeric,cost_amount numeric,weight_kg numeric,paid_at timestamptz,active boolean DEFAULT true,erp_stock_synced_at timestamptz,updated_at timestamptz DEFAULT now());`);
  const consumer=source('supabase/migrations/20261002170958_consumer_address_paid_sales.sql');
  await db.exec(consumer.slice(consumer.indexOf('CREATE FUNCTION dukamp_private.record_paid_web_order()'),consumer.indexOf('-- Preserve imported ERP amounts.')));
  await db.exec(source('supabase/migrations/20261019200751_dukamp_partners.sql'));
  await db.exec(source('tests/partners.sql'));
  for(const table of ['dukamp_partners','dukamp_partner_quotes','orders','order_items','web_order_sales','customers']){
   assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n,0,`Fixture leaked into ${table}`);
  }
 } finally {await db.close();}
});
