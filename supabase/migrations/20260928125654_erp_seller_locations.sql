-- Local da unidade DuKamp responsável pelo vendedor; independente de sua
-- região de atuação comercial em sellers.region.
create table if not exists public.erp_seller_locations (
  seller_code text primary key check (seller_code ~ '^[0-9]{1,10}$'),
  location text not null check (location in ('monte-aprazivel', 'sao-jose-do-rio-preto')),
  updated_at timestamptz not null default now()
);

alter table public.erp_seller_locations enable row level security;
revoke all on public.erp_seller_locations from public, anon, authenticated;
grant all on public.erp_seller_locations to service_role;

comment on table public.erp_seller_locations is
  'Classificação administrativa do local da DuKamp para relatórios do ERP, vinculada pelo COD VEND.';
