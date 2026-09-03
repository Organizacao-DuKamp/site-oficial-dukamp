-- Vincula o cartão público do vendedor ao COD VEND do ERP e preserva
-- snapshots sucessivos do relatório de margem para permitir evolução diária.

alter table public.sellers
  add column if not exists erp_seller_code text;

create index if not exists sellers_erp_seller_code_idx
  on public.sellers (erp_seller_code)
  where erp_seller_code is not null;

comment on column public.sellers.erp_seller_code is
  'Codigo COD VEND do ERP usado para vincular o cartao publico do vendedor aos relatorios e carteira.';

-- Antes havia apenas uma linha por mês/código, então um PDF novo substituía o
-- snapshot anterior. O período final passa a fazer parte da chave para manter
-- o histórico diário/intervalos importados.
drop index if exists public.seller_monthly_margin_reports_period_code_idx;

create unique index if not exists seller_monthly_margin_reports_snapshot_code_idx
  on public.seller_monthly_margin_reports (period_start, period_end, report_seller_code);
