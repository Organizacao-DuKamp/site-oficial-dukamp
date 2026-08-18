-- Campos complementares do relatório ABC VENDEDOR/CLIENTE (17/08/2026).
-- A carga de dados é aplicada nas migrations seguintes e atualiza clientes por codigo.

alter table public.customers
  add column if not exists vendedor_codigo text,
  add column if not exists vendedor_nome text,
  add column if not exists vendedor_ultima_compra date,
  add column if not exists vendedor_total_acumulado numeric(14, 2),
  add column if not exists vendedor_percentual numeric(7, 2),
  add column if not exists vendedor_percentual_acumulado numeric(7, 2),
  add column if not exists abc_s text,
  add column if not exists abc_c text,
  add column if not exists abc_l text,
  add column if not exists dados_vendedor_atualizados_em timestamptz;

comment on column public.customers.vendedor_codigo is
  'Código do vendedor responsável segundo o relatório ABC VENDEDOR/CLIENTE mais recente importado.';
comment on column public.customers.vendedor_nome is
  'Nome do vendedor responsável segundo o relatório ABC VENDEDOR/CLIENTE mais recente importado.';
comment on column public.customers.vendedor_ultima_compra is
  'ULT_CMPR da ocorrência usada para definir o vendedor atual do cliente.';
comment on column public.customers.vendedor_total_acumulado is
  'TOT_ACUM da ocorrência usada para definir o vendedor atual do cliente.';
comment on column public.customers.vendedor_percentual is
  'Percentual do cliente dentro do vendedor no relatório ABC.';
comment on column public.customers.vendedor_percentual_acumulado is
  'Percentual acumulado do cliente dentro do vendedor no relatório ABC.';
comment on column public.customers.abc_s is
  'Campo S do relatório ABC VENDEDOR/CLIENTE.';
comment on column public.customers.abc_c is
  'Campo C do relatório ABC VENDEDOR/CLIENTE.';
comment on column public.customers.abc_l is
  'Campo L do relatório ABC VENDEDOR/CLIENTE.';
comment on column public.customers.dados_vendedor_atualizados_em is
  'Data/hora da última carga do relatório ABC VENDEDOR/CLIENTE.';
