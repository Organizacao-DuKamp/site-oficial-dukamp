-- Áreas de produtos e seus responsáveis no ERP Clipper.
create table if not exists public.erp_product_areas (
  code text primary key check (code ~ '^[0-9]{3,4}$'),
  description text not null default '',
  responsible_code text not null default '' check (responsible_code = '' or responsible_code ~ '^[0-9]{1,6}$'),
  responsible_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.erp_product_areas_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código da área não pode ser alterado';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_product_areas_updated_at on public.erp_product_areas;
create trigger erp_product_areas_updated_at before update on public.erp_product_areas
  for each row execute function public.erp_product_areas_set_updated_at();

alter table public.erp_product_areas enable row level security;
revoke all on public.erp_product_areas from public, anon, authenticated;
grant select, delete on public.erp_product_areas to authenticated;
grant insert (code, description, responsible_code, responsible_name) on public.erp_product_areas to authenticated;
grant update (description, responsible_code, responsible_name) on public.erp_product_areas to authenticated;

drop policy if exists "Admins read ERP product areas" on public.erp_product_areas;
drop policy if exists "Admins insert ERP product areas" on public.erp_product_areas;
drop policy if exists "Admins update ERP product areas" on public.erp_product_areas;
drop policy if exists "Admins delete ERP product areas" on public.erp_product_areas;
create policy "Admins read ERP product areas" on public.erp_product_areas
  for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins insert ERP product areas" on public.erp_product_areas
  for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins update ERP product areas" on public.erp_product_areas
  for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins delete ERP product areas" on public.erp_product_areas
  for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

-- Transcrição das consultas anexadas. Algumas grafias aparecem abreviadas/cortadas no original.
-- A descrição da área 5380 não aparece no anexo, portanto permanece vazia.
insert into public.erp_product_areas (code, description, responsible_code, responsible_name) values
  ('001', 'PRODUTO ACABADO', '908', 'EVERTON'),
  ('002', 'ALMOXARIFADO', '924', 'GABRIEL PAC'),
  ('003', 'VACINAS', '403', 'TASSIO LULI'),
  ('004', 'LOJA VET', '925', 'LEONARDO RE'),
  ('005', 'LOJA 1,2,3 E 4', '207', 'GERVAZIO DA'),
  ('006', 'LOJA 5,6,7 E 8', '388', 'ENEIAS NEVE'),
  ('007', 'LOJA 9,10 E 11', '380', 'LELO MAZETI'),
  ('008', 'LOJA CALC,PREST', '208', 'ANDRESSA MA'),
  ('009', 'BARRACAO', '404', 'ABNER'),
  ('015', 'INSUMOS', '908', 'EVERTON'),
  ('016', 'MATERIA-PRIMA', '908', 'EVERTON'),
  ('017', 'EPI - FABRICA', '908', 'EVERTON'),
  ('101', 'SAC. DUKAMP', '908', 'EVERTON'),
  ('268', 'ALMOXARIFADO', '268', 'CASIANO DE'),
  ('5380', '', '1', 'DUKAMP (VEN')
on conflict (code) do nothing;
