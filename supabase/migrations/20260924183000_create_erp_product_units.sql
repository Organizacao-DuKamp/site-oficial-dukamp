-- Unidades de medida do ERP Clipper, separadas das unidades da loja.
create table if not exists public.erp_product_units (
  code text primary key check (code ~ '^[A-Z0-9.]{1,5}$'),
  description text not null check (length(btrim(description)) > 0),
  decimal_places smallint not null check (decimal_places between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.erp_product_units_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código da unidade não pode ser alterado';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_product_units_updated_at on public.erp_product_units;
create trigger erp_product_units_updated_at before update on public.erp_product_units
  for each row execute function public.erp_product_units_set_updated_at();

alter table public.erp_product_units enable row level security;
revoke all on public.erp_product_units from public, anon, authenticated;
grant select, delete on public.erp_product_units to authenticated;
grant insert (code, description, decimal_places) on public.erp_product_units to authenticated;
grant update (description, decimal_places) on public.erp_product_units to authenticated;

drop policy if exists "Admins read ERP product units" on public.erp_product_units;
drop policy if exists "Admins insert ERP product units" on public.erp_product_units;
drop policy if exists "Admins update ERP product units" on public.erp_product_units;
drop policy if exists "Admins delete ERP product units" on public.erp_product_units;
create policy "Admins read ERP product units" on public.erp_product_units
  for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins insert ERP product units" on public.erp_product_units
  for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins update ERP product units" on public.erp_product_units
  for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins delete ERP product units" on public.erp_product_units
  for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

-- Catálogo inicial reproduzido da consulta do programa antigo. Preserva alterações existentes.
insert into public.erp_product_units (code, description, decimal_places) values
  ('BD', 'BALDE', 1),
  ('CX', 'CAIXA', 1),
  ('KG', 'KILO', 2),
  ('MT', 'METRO', 2),
  ('MT.', 'METROS MT5', 2),
  ('PA', 'PAR', 1),
  ('PC', 'PEÇA', 1),
  ('PR', 'PAR', 1),
  ('PT', 'PACOTE', 1),
  ('RL', 'ROLO', 1),
  ('SC', 'SACO', 1),
  ('UN', 'UNIDADE', 1)
on conflict (code) do nothing;
