-- Pedidos de compra do ERP, separados dos pedidos de clientes do e-commerce.
create sequence if not exists public.erp_purchase_order_code_seq
  as integer minvalue 1 maxvalue 99999 start with 1;

create table if not exists public.erp_purchase_orders (
  code text primary key default lpad(nextval('public.erp_purchase_order_code_seq'::regclass)::text, 5, '0')
    check (code ~ '^[0-9]{5}$'),
  supplier_code text,
  supplier_name text not null check (length(btrim(supplier_name)) > 0),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.erp_purchase_order_code_seq owned by public.erp_purchase_orders.code;

create or replace function public.erp_purchase_orders_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código do pedido não pode ser alterado';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_purchase_orders_updated_at on public.erp_purchase_orders;
create trigger erp_purchase_orders_updated_at before update on public.erp_purchase_orders
  for each row execute function public.erp_purchase_orders_set_updated_at();

create index if not exists erp_purchase_orders_supplier_name_idx on public.erp_purchase_orders (supplier_name);
create index if not exists erp_purchase_orders_supplier_code_idx on public.erp_purchase_orders (supplier_code);

alter table public.erp_purchase_orders enable row level security;
revoke all on public.erp_purchase_orders from public, anon, authenticated;
grant select, delete on public.erp_purchase_orders to authenticated;
grant insert (supplier_code, supplier_name, details, items) on public.erp_purchase_orders to authenticated;
grant update (supplier_code, supplier_name, details, items) on public.erp_purchase_orders to authenticated;
grant usage on sequence public.erp_purchase_order_code_seq to authenticated;

drop policy if exists "Admins read ERP purchase orders" on public.erp_purchase_orders;
drop policy if exists "Admins insert ERP purchase orders" on public.erp_purchase_orders;
drop policy if exists "Admins update ERP purchase orders" on public.erp_purchase_orders;
drop policy if exists "Admins delete ERP purchase orders" on public.erp_purchase_orders;
create policy "Admins read ERP purchase orders" on public.erp_purchase_orders
  for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins insert ERP purchase orders" on public.erp_purchase_orders
  for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins update ERP purchase orders" on public.erp_purchase_orders
  for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins delete ERP purchase orders" on public.erp_purchase_orders
  for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
