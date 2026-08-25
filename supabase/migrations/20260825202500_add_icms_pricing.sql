-- Sistema fiscal Dukamp / ICMS 2026
-- Mantém o preço do produtor como fonte principal e registra o snapshot fiscal do pedido.

alter table public.products
  add column if not exists tax_code text,
  add column if not exists erp_group text,
  add column if not exists erp_icms_rate numeric(5,2),
  add column if not exists points numeric(12,3),
  add column if not exists barcode text,
  add column if not exists fixed_table boolean;

comment on column public.products.tax_code is 'Código tributário do ERP (ex.: 000 ou 040).';
comment on column public.products.erp_icms_rate is 'Percentual de ICMS informado no arquivo do ERP; a alíquota interestadual efetiva é resolvida pela UF de destino.';

alter table public.orders
  add column if not exists tax_amount numeric(12,2) not null default 0,
  add column if not exists tax_destination_uf text;

alter table public.order_items
  add column if not exists base_unit_price numeric(12,2),
  add column if not exists tax_code text,
  add column if not exists icms_rate numeric(5,2) not null default 0,
  add column if not exists tax_amount numeric(12,2) not null default 0;

create index if not exists products_tax_code_idx on public.products(tax_code);
