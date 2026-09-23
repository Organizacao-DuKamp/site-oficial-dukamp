create table public.dukamp_stock_items (
  code text primary key check (code ~ '^[0-9]{6}$'),
  name text not null check (name !~* '(XX|ZZ)'),
  unit text not null,
  stock numeric(15,2) not null default 0,
  cost numeric(15,2),
  total_cost numeric(15,2),
  sale_price numeric(15,2),
  total_sale numeric(15,2),
  avg_sales numeric(15,2),
  avg_total numeric(15,2),
  minimum numeric(15,2),
  brand text,
  supplier_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dukamp_stock_items enable row level security;
revoke all on public.dukamp_stock_items from public, anon, authenticated;
grant select, insert, update on public.dukamp_stock_items to authenticated;
create policy "Admins read Dukamp stock" on public.dukamp_stock_items
  for select to authenticated using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins insert Dukamp stock" on public.dukamp_stock_items
  for insert to authenticated with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins update Dukamp stock" on public.dukamp_stock_items
  for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create index dukamp_stock_items_name_idx on public.dukamp_stock_items (name);
