-- Vendedor responsável dos clientes conforme relatório ABC VENDEDOR/CLIENTE de 17/08/2026.
-- A carga seguinte atualiza somente clientes já existentes, identificados por codigo.

alter table public.customers
  add column if not exists vendedor_codigo text,
  add column if not exists vendedor_nome text,
  add column if not exists dados_vendedor_atualizados_em timestamptz;

comment on column public.customers.vendedor_codigo is
  'Código do vendedor responsável segundo o relatório ABC VENDEDOR/CLIENTE mais recente importado.';
comment on column public.customers.vendedor_nome is
  'Nome do vendedor responsável segundo o relatório ABC VENDEDOR/CLIENTE mais recente importado.';
comment on column public.customers.dados_vendedor_atualizados_em is
  'Data/hora da última carga do relatório ABC VENDEDOR/CLIENTE.';
