-- A restrição original foi criada com um nome maior que o limite do
-- PostgreSQL e recebeu o nome truncado abaixo.
alter table public.seller_monthly_margin_reports
  drop constraint if exists seller_monthly_margin_reports_seller_user_id_report_year_re_key;
