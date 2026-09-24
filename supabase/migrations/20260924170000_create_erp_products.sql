-- ERP Compras: cadastro separado do catálogo publicado na loja.
create sequence if not exists public.erp_product_code_seq
  as integer minvalue 900001 maxvalue 999999 start with 900001;

create table if not exists public.erp_products (
  code text primary key default lpad(nextval('public.erp_product_code_seq'::regclass)::text, 6, '0')
    check (code ~ '^[0-9]{6}$'),
  name text not null check (length(btrim(name)) > 0),
  product_data jsonb not null default '{}'::jsonb check (jsonb_typeof(product_data) = 'object'),
  pricing_data jsonb not null default '{}'::jsonb check (jsonb_typeof(pricing_data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.erp_product_code_seq owned by public.erp_products.code;

create or replace function public.erp_products_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código do produto não pode ser alterado';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_products_updated_at on public.erp_products;
create trigger erp_products_updated_at before update on public.erp_products
  for each row execute function public.erp_products_set_updated_at();

create index if not exists erp_products_name_idx on public.erp_products (name);

alter table public.erp_products enable row level security;
revoke all on public.erp_products from public, anon, authenticated;
grant select, delete on public.erp_products to authenticated;
grant insert (name, product_data, pricing_data) on public.erp_products to authenticated;
grant update (name, product_data, pricing_data) on public.erp_products to authenticated;
grant usage on sequence public.erp_product_code_seq to authenticated;

drop policy if exists "Admins read ERP products" on public.erp_products;
drop policy if exists "Admins insert ERP products" on public.erp_products;
drop policy if exists "Admins update ERP products" on public.erp_products;
drop policy if exists "Admins delete ERP products" on public.erp_products;

create policy "Admins read ERP products" on public.erp_products
  for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins insert ERP products" on public.erp_products
  for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins update ERP products" on public.erp_products
  for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Admins delete ERP products" on public.erp_products
  for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

insert into public.erp_products (name, product_data, pricing_data)
select 'PRODUTO TESTE ERP A', '{"unidade":"UN","grupo":"TESTE","fornecedor":"FORNECEDOR TESTE"}'::jsonb,
  '{"custo_real":"36,19","custo_final":"36,19","prazo_venda":"84"}'::jsonb
where not exists (select 1 from public.erp_products where name = 'PRODUTO TESTE ERP A');

insert into public.erp_products (name, product_data, pricing_data)
select 'PRODUTO TESTE ERP B', '{"unidade":"CX","grupo":"TESTE","marca":"DUKAMP TESTE"}'::jsonb,
  '{"custo_real":"25,00","custo_final":"25,00","prazo_venda":"30"}'::jsonb
where not exists (select 1 from public.erp_products where name = 'PRODUTO TESTE ERP B');
