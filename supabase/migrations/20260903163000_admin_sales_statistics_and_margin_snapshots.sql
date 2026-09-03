-- Vincula o cartão público do vendedor ao COD VEND do ERP e cria um histórico
-- separado dos snapshots dos PDFs. A tabela mensal continua com uma linha por
-- vendedor/mês para preservar compatibilidade com as telas existentes.

alter table public.sellers
  add column if not exists erp_seller_code text;

create index if not exists sellers_erp_seller_code_idx
  on public.sellers (erp_seller_code)
  where erp_seller_code is not null;

comment on column public.sellers.erp_seller_code is
  'Codigo COD VEND do ERP usado para vincular o cartao publico do vendedor aos relatorios e carteira.';

-- Mantém a tabela mensal no contrato legado: um registro por mês e vendedor.
drop index if exists public.seller_monthly_margin_reports_snapshot_code_idx;

create unique index if not exists seller_monthly_margin_reports_period_code_idx
  on public.seller_monthly_margin_reports (report_year, report_month, report_seller_code);

-- Histórico de cada arquivo/período importado. Isso permite comparar dias e
-- intervalos sem alterar o contrato da tabela mensal usada pelo painel atual.
create table if not exists public.seller_margin_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid references auth.users(id) on delete set null,
  report_year smallint not null check (report_year between 2000 and 2100),
  report_month smallint not null check (report_month between 1 and 12),
  period_start date not null,
  period_end date not null,
  report_seller_code text not null,
  report_seller_name text not null,
  total_venda numeric(16, 2) not null,
  devolucao numeric(16, 2) not null,
  aditivos numeric(16, 2) not null,
  sacarias numeric(16, 2) not null,
  balcao numeric(16, 2) not null,
  total_custo numeric(16, 2) not null,
  margem_percentual numeric(8, 2) not null,
  comissao_representante numeric(16, 2) not null,
  tonelagem numeric(16, 3) not null,
  margem_bruta numeric(16, 2) not null,
  margem_aditivos numeric(16, 2) not null,
  margem_aditivos_percentual numeric(8, 2) not null,
  margem_sacarias numeric(16, 2) not null,
  margem_sacarias_percentual numeric(8, 2) not null,
  margem_balcao numeric(16, 2) not null,
  margem_balcao_percentual numeric(8, 2) not null,
  source_file text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create unique index if not exists seller_margin_report_snapshots_period_code_idx
  on public.seller_margin_report_snapshots (period_start, period_end, report_seller_code);

create index if not exists seller_margin_report_snapshots_month_idx
  on public.seller_margin_report_snapshots (report_year desc, report_month desc, period_end desc);

-- Alimenta o histórico com o que já existe. Importações futuras passam a salvar
-- na tabela mensal e também nesta tabela de snapshots.
insert into public.seller_margin_report_snapshots (
  seller_user_id, report_year, report_month, period_start, period_end,
  report_seller_code, report_seller_name, total_venda, devolucao, aditivos,
  sacarias, balcao, total_custo, margem_percentual, comissao_representante,
  tonelagem, margem_bruta, margem_aditivos, margem_aditivos_percentual,
  margem_sacarias, margem_sacarias_percentual, margem_balcao,
  margem_balcao_percentual, source_file, created_at, updated_at
)
select
  seller_user_id, report_year, report_month, period_start, period_end,
  report_seller_code, report_seller_name, total_venda, devolucao, aditivos,
  sacarias, balcao, total_custo, margem_percentual, comissao_representante,
  tonelagem, margem_bruta, margem_aditivos, margem_aditivos_percentual,
  margem_sacarias, margem_sacarias_percentual, margem_balcao,
  margem_balcao_percentual, source_file, created_at, updated_at
from public.seller_monthly_margin_reports
on conflict (period_start, period_end, report_seller_code) do nothing;

alter table public.seller_margin_report_snapshots enable row level security;
revoke all on table public.seller_margin_report_snapshots from public, anon, authenticated;
grant all on table public.seller_margin_report_snapshots to service_role;

comment on table public.seller_margin_report_snapshots is
  'Historico por periodo dos PDFs de margem; usado para comparacoes diarias e por intervalo no administrativo.';
