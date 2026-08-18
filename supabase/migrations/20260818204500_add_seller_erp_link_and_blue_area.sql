-- Vincula contas internas de vendedor à carteira comercial do ERP.
-- A Área Azul usa esse vínculo para listar clientes sem compras há mais de 6 meses.

alter table public.sellers
  add column if not exists erp_seller_code text,
  add column if not exists erp_seller_name text;

comment on column public.sellers.erp_seller_code is
  'Código do vendedor no ERP/FARCLIEN usado para vincular a conta de vendedor à carteira comercial.';

comment on column public.sellers.erp_seller_name is
  'Nome do vendedor no ERP correspondente a erp_seller_code.';

create index if not exists idx_customers_vendedor_ultima_compra
  on public.customers (vendedor_codigo, ultima_compra);
