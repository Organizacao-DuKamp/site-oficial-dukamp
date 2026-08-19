alter table public.customers
  add column if not exists observacao_vendedor text;

create table if not exists public.seller_sale_requests (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  seller_record_id uuid references public.sellers(id) on delete set null,
  seller_code text not null,
  seller_name text not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  customer_code text not null,
  customer_name text not null,
  sale_notes text not null,
  sale_value numeric(14,2) not null check (sale_value > 0),
  status text not null default 'new' check (status in ('new', 'seen')),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  seen_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_seller_sale_requests_status_created
  on public.seller_sale_requests (status, created_at desc);
create index if not exists idx_seller_sale_requests_seller
  on public.seller_sale_requests (seller_user_id, created_at desc);
create index if not exists idx_seller_sale_requests_customer
  on public.seller_sale_requests (customer_id, created_at desc);

alter table public.seller_sale_requests enable row level security;

revoke all on table public.seller_sale_requests from anon;
revoke all on table public.seller_sale_requests from authenticated;
grant select, update on table public.seller_sale_requests to authenticated;
grant all on table public.seller_sale_requests to service_role;

drop policy if exists "Admins can read seller sale requests" on public.seller_sale_requests;
create policy "Admins can read seller sale requests"
  on public.seller_sale_requests
  for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins can mark seller sale requests seen" on public.seller_sale_requests;
create policy "Admins can mark seller sale requests seen"
  on public.seller_sale_requests
  for update
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
