-- Snapshot ABC CLIENTE emitido em 25/08/2026.
-- Preserva o cadastro completo já existente e adiciona os campos específicos
-- deste relatório. Os lotes seguintes fazem UPSERT por codigo.
alter table public.customers
  add column if not exists abc_posicao integer,
  add column if not exists abc_total_acumulado numeric(16, 2),
  add column if not exists abc_percentual numeric(8, 2),
  add column if not exists abc_percentual_acumulado numeric(8, 2),
  add column if not exists abc_s text,
  add column if not exists abc_c text,
  add column if not exists abc_l text,
  add column if not exists abc_periodo_inicio date,
  add column if not exists abc_periodo_fim date,
  add column if not exists abc_na_carteira_atual boolean not null default false,
  add column if not exists dados_abc_atualizados_em timestamptz;

comment on column public.customers.abc_total_acumulado is
  'TOT_ACUM do relatório ABC CLIENTE mais recente.';
comment on column public.customers.abc_na_carteira_atual is
  'True quando o cliente pertence ao snapshot ABC CLIENTE mais recente importado.';
comment on column public.customers.dados_abc_atualizados_em is
  'Data/hora da última carga do relatório ABC CLIENTE.';

create index if not exists customers_current_abc_seller_idx
  on public.customers (vendedor_codigo, abc_na_carteira_atual)
  where abc_na_carteira_atual = true;
