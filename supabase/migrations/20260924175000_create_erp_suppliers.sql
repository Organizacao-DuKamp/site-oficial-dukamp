-- Fornecedores do ERP Clipper, separados dos cadastros públicos da loja.
create sequence if not exists public.erp_supplier_code_seq
  as integer minvalue 1 maxvalue 99999 start with 1;

create table if not exists public.erp_suppliers (
  code text primary key default lpad(nextval('public.erp_supplier_code_seq'::regclass)::text, 5, '0')
    check (code ~ '^[0-9]{5}$'),
  name text not null check (length(btrim(name)) > 0),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.erp_supplier_code_seq owned by public.erp_suppliers.code;

create or replace function public.erp_suppliers_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código do fornecedor não pode ser alterado';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_suppliers_updated_at on public.erp_suppliers;
create trigger erp_suppliers_updated_at before update on public.erp_suppliers
  for each row execute function public.erp_suppliers_set_updated_at();

create index if not exists erp_suppliers_name_idx on public.erp_suppliers (name);

alter table public.erp_suppliers enable row level security;
revoke all on public.erp_suppliers from public, anon, authenticated;
grant select, delete on public.erp_suppliers to authenticated;
grant insert (name, details) on public.erp_suppliers to authenticated;
grant update (name, details) on public.erp_suppliers to authenticated;
grant usage on sequence public.erp_supplier_code_seq to authenticated;

drop policy if exists "Admins read ERP suppliers" on public.erp_suppliers;
drop policy if exists "Admins insert ERP suppliers" on public.erp_suppliers;
drop policy if exists "Admins update ERP suppliers" on public.erp_suppliers;
drop policy if exists "Admins delete ERP suppliers" on public.erp_suppliers;
create policy "Admins read ERP suppliers" on public.erp_suppliers
  for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins insert ERP suppliers" on public.erp_suppliers
  for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins update ERP suppliers" on public.erp_suppliers
  for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins delete ERP suppliers" on public.erp_suppliers
  for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
