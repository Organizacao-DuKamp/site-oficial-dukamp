-- Estrutura do historico mensal do RELATORIO MARGEM VENDA do ERP.
-- Os dados comerciais sao importados diretamente no ambiente protegido e nao
-- devem ser versionados no repositorio publico.

create table if not exists public.seller_monthly_margin_reports (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
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
  unique (seller_user_id, report_year, report_month),
  check (period_end >= period_start)
);

comment on table public.seller_monthly_margin_reports is
  'Dados mensais por vendedor extraidos do RELATORIO MARGEM VENDA do ERP.';
comment on column public.seller_monthly_margin_reports.total_venda is
  'Valor do campo TOT_VENDA exibido ao vendedor no painel mensal.';

create index if not exists seller_monthly_margin_reports_period_idx
  on public.seller_monthly_margin_reports (report_year desc, report_month desc);

alter table public.seller_monthly_margin_reports enable row level security;
revoke all on table public.seller_monthly_margin_reports from public, anon, authenticated;
grant all on table public.seller_monthly_margin_reports to service_role;
