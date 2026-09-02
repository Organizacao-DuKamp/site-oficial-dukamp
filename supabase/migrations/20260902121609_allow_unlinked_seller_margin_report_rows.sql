-- Permite importar todas as linhas do relatório do ERP, mesmo quando
-- o vendedor ainda não possui uma conta ativa no site.
alter table public.seller_monthly_margin_reports
  alter column seller_user_id drop not null;

alter table public.seller_monthly_margin_reports
  drop constraint if exists seller_monthly_margin_reports_seller_user_id_report_year_report_month_key;

create unique index if not exists seller_monthly_margin_reports_period_code_idx
  on public.seller_monthly_margin_reports (report_year, report_month, report_seller_code);

comment on column public.seller_monthly_margin_reports.seller_user_id is
  'Conta do vendedor quando houver; nulo para linhas importadas ainda sem conta vinculada.';
