-- CMAFALTA.DBF (F:\DUKAMP\WORK): two active codes; FALTA memo pointers are blank.
-- The old, unreferenced CMAFALTA.DBT block is intentionally not imported.
create table if not exists public.erp_missing_merchandise (
  code smallint primary key check (code between 0 and 99),
  description varchar(40) not null check (length(btrim(description)) > 0),
  merchandise text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.erp_missing_merchandise_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código não pode ser alterado';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_missing_merchandise_updated_at on public.erp_missing_merchandise;
create trigger erp_missing_merchandise_updated_at
before update on public.erp_missing_merchandise
for each row execute function public.erp_missing_merchandise_set_updated_at();

alter table public.erp_missing_merchandise enable row level security;
revoke all on public.erp_missing_merchandise from public, anon, authenticated;
grant select, insert, update on public.erp_missing_merchandise to authenticated;

create policy "Admins read ERP missing merchandise" on public.erp_missing_merchandise
  for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins insert ERP missing merchandise" on public.erp_missing_merchandise
  for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins update ERP missing merchandise" on public.erp_missing_merchandise
  for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

insert into public.erp_missing_merchandise (code, description, merchandise)
values (98, 'MERCADORIAS FALTANTES', ''),
       (99, 'MERCADORIAS NOVAS', '')
on conflict (code) do nothing;

