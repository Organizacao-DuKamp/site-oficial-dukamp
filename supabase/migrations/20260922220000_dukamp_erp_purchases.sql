-- ERP Dukamp: primeiro módulo operacional (Compras).
-- O arquivo legado permanece imutável; estas tabelas passam a receber operações novas.

create table if not exists public.dukamp_erp_suppliers (
  id uuid primary key default gen_random_uuid(),
  legacy_code integer unique,
  legal_name text not null,
  trade_name text,
  tax_id text,
  state_registration text,
  email text,
  phone text,
  contact_name text,
  address text,
  city_id integer,
  district text,
  postal_code text,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dukamp_erp_products (
  id uuid primary key default gen_random_uuid(),
  legacy_code integer not null unique,
  website_product_id uuid references public.products(id) on delete set null,
  supplier_id uuid references public.dukamp_erp_suppliers(id) on delete set null,
  name text not null,
  complement text,
  unit text not null default 'UN',
  classification text,
  ncm text,
  tax_code integer,
  icms_rate numeric(8,4) not null default 0,
  ipi_rate numeric(8,4) not null default 0,
  sale_price numeric(15,3) not null default 0,
  cost_price numeric(15,3) not null default 0,
  average_cost numeric(15,3) not null default 0,
  target_margin numeric(8,4) not null default 0,
  stock numeric(15,3) not null default 0,
  warehouse_stock numeric(15,3) not null default 0,
  factory_stock numeric(15,3) not null default 0,
  minimum_stock numeric(15,3) not null default 0,
  maximum_stock numeric(15,3) not null default 0,
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.dukamp_purchase_order_number_seq;

create table if not exists public.dukamp_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.dukamp_purchase_order_number_seq'),
  supplier_id uuid not null references public.dukamp_erp_suppliers(id) on delete restrict,
  issue_date date not null default current_date,
  expected_date date,
  status text not null default 'draft' check (status in ('draft','approved','partial','received','cancelled')),
  payment_terms text,
  freight_amount numeric(15,2) not null default 0,
  discount_amount numeric(15,2) not null default 0,
  extra_amount numeric(15,2) not null default 0,
  total_amount numeric(15,2) not null default 0,
  supplier_order_number text,
  transport text,
  contact_name text,
  notes text,
  has_pending_issues boolean not null default false,
  advance_payment_date date,
  legacy_source boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dukamp_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.dukamp_purchase_orders(id) on delete cascade,
  line_number integer not null,
  product_id uuid references public.dukamp_erp_products(id) on delete restrict,
  description text not null,
  unit text not null default 'UN',
  quantity_ordered numeric(15,3) not null check (quantity_ordered > 0),
  quantity_received numeric(15,3) not null default 0 check (quantity_received >= 0),
  unit_price numeric(15,4) not null check (unit_price >= 0),
  discount_percent numeric(8,4) not null default 0,
  ipi_percent numeric(8,4) not null default 0,
  total_amount numeric(15,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, line_number),
  check (quantity_received <= quantity_ordered)
);

create table if not exists public.dukamp_goods_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number bigint generated always as identity unique,
  supplier_id uuid not null references public.dukamp_erp_suppliers(id) on delete restrict,
  order_id uuid references public.dukamp_purchase_orders(id) on delete restrict,
  invoice_number text not null,
  invoice_series text,
  issue_date date,
  received_at timestamptz not null default now(),
  status text not null default 'posted' check (status in ('draft','posted','cancelled')),
  merchandise_amount numeric(15,2) not null default 0,
  freight_amount numeric(15,2) not null default 0,
  expense_amount numeric(15,2) not null default 0,
  discount_amount numeric(15,2) not null default 0,
  icms_amount numeric(15,2) not null default 0,
  invoice_amount numeric(15,2) not null default 0,
  nfe_key text,
  notes text,
  legacy_source boolean not null default false,
  legacy_segment integer,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dukamp_goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.dukamp_goods_receipts(id) on delete cascade,
  order_item_id uuid references public.dukamp_purchase_order_items(id) on delete restrict,
  line_number integer not null,
  product_id uuid references public.dukamp_erp_products(id) on delete restrict,
  description text not null,
  unit text not null default 'UN',
  quantity numeric(15,3) not null check (quantity > 0),
  unit_cost numeric(15,4) not null check (unit_cost >= 0),
  real_cost numeric(15,4) not null default 0,
  total_amount numeric(15,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (receipt_id, line_number)
);

create table if not exists public.dukamp_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.dukamp_erp_products(id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase','sale','transfer','adjustment','return')),
  quantity numeric(15,3) not null,
  unit_cost numeric(15,4),
  reference_type text,
  reference_id uuid,
  notes text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.dukamp_accounts_payable (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.dukamp_erp_suppliers(id) on delete restrict,
  purchase_receipt_id uuid references public.dukamp_goods_receipts(id) on delete restrict,
  legacy_ap_number integer unique,
  title_number text not null,
  description text,
  issue_date date not null default current_date,
  due_date date not null,
  amount numeric(15,2) not null check (amount >= 0),
  open_amount numeric(15,2) not null check (open_amount >= 0),
  discount_amount numeric(15,2) not null default 0,
  interest_amount numeric(15,2) not null default 0,
  paid_at date,
  status text not null default 'open' check (status in ('open','partial','paid','cancelled')),
  payment_method text,
  expense_group integer,
  notes text,
  source_type text not null default 'manual' check (source_type in ('legacy','purchase_receipt','manual')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dukamp_erp_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dukamp_erp_products_name_idx on public.dukamp_erp_products using gin (to_tsvector('portuguese', name));
create index if not exists dukamp_purchase_orders_supplier_idx on public.dukamp_purchase_orders(supplier_id, issue_date desc);
create index if not exists dukamp_purchase_orders_status_idx on public.dukamp_purchase_orders(status, expected_date);
create index if not exists dukamp_purchase_items_product_idx on public.dukamp_purchase_order_items(product_id);
create index if not exists dukamp_receipts_supplier_idx on public.dukamp_goods_receipts(supplier_id, received_at desc);
create unique index if not exists dukamp_receipts_legacy_idx on public.dukamp_goods_receipts(legacy_segment, supplier_id, invoice_number) where legacy_source;
create index if not exists dukamp_inventory_product_date_idx on public.dukamp_inventory_movements(product_id, occurred_at desc);
create index if not exists dukamp_payables_due_idx on public.dukamp_accounts_payable(status, due_date);

-- Carga inicial do estado legado para as entidades operacionais.
insert into public.dukamp_erp_suppliers (
  legacy_code, legal_name, trade_name, tax_id, state_registration, email, phone,
  contact_name, address, city_id, district, postal_code, notes
)
select
  fcod, coalesce(nullif(trim(fnome), ''), 'Fornecedor ' || fcod), nullif(trim(fnomfan), ''),
  nullif(trim(fcgc), ''), nullif(trim(finsc), ''), nullif(trim(femail), ''),
  nullif(trim(ffone::text), ''), nullif(trim(fcontat), ''), nullif(trim(fend), ''),
  fcid, nullif(trim(fbair), ''), nullif(trim(fcep::text), ''), nullif(trim(fobserv), '')
from public.dukamp_legacy_cpaforne
where fcod is not null
on conflict (legacy_code) do nothing;

insert into public.dukamp_erp_products (
  legacy_code, website_product_id, supplier_id, name, complement, unit, classification,
  ncm, tax_code, icms_rate, ipi_rate, sale_price, cost_price, average_cost,
  target_margin, stock, warehouse_stock, factory_stock, minimum_stock, maximum_stock,
  location, active
)
select
  e.codpro, p.id, s.id, coalesce(nullif(trim(e.nompro), ''), 'Produto ' || e.codpro),
  nullif(trim(e.comple), ''), coalesce(nullif(trim(e.unipro), ''), 'UN'),
  nullif(trim(e.classi), ''), nullif(trim(e.clafis::text), ''), e.codtri,
  coalesce(e.alqicm, 0), coalesce(e.peripi, 0), coalesce(e.pretab, 0),
  coalesce(nullif(e.cusrea, 0), e.ultcus, 0), coalesce(e.cusmed, 0),
  coalesce(e.mrgvnd, 0), coalesce(e.salest, 0), coalesce(e.saldep, 0),
  coalesce(e.salfab, 0), coalesce(e.estmin, 0), coalesce(e.estmax, 0),
  nullif(trim(e.local), ''), true
from public.dukamp_legacy_efaprodu e
left join public.products p on p.code = e.codpro::text
left join public.dukamp_erp_suppliers s on s.legacy_code = e.codfor
where e.codpro is not null
on conflict (legacy_code) do nothing;

insert into public.dukamp_purchase_orders (
  order_number, supplier_id, issue_date, expected_date, status, payment_terms,
  discount_amount, extra_amount, supplier_order_number, transport, contact_name,
  notes, has_pending_issues, advance_payment_date, legacy_source
)
select
  p.pcnroped, s.id, coalesce(p.pcdatemi, current_date), p.pcprvent, 'draft',
  concat_ws('/', nullif(p.pcconpg1, 0), nullif(p.pcconpg2, 0), nullif(p.pcconpg3, 0), nullif(p.pcconpg4, 0)),
  coalesce(p.pcvlrdsc, 0), coalesce(p.pcvlrdsp, 0), nullif(trim(p.pcpedfor), ''),
  nullif(trim(p.pctransp), ''), nullif(trim(p.pccontat), ''), nullif(trim(p.pcobserv), ''),
  upper(coalesce(p.pcpenden, 'N')) = 'S', p.pcpgtant, true
from public.dukamp_legacy_cmapedid p
join public.dukamp_erp_suppliers s on s.legacy_code = p.pccodfor
where p.pcnroped is not null
on conflict (order_number) do nothing;

insert into public.dukamp_purchase_order_items (
  order_id, line_number, product_id, description, unit, quantity_ordered,
  quantity_received, unit_price, discount_percent, ipi_percent, total_amount
)
select
  o.id, i.pciteped, pr.id, coalesce(nullif(trim(i.pcdespro), ''), pr.name, 'Item ' || i.pciteped),
  coalesce(pr.unit, 'UN'), greatest(coalesce(i.pcqtdpro, 0), 0.001),
  least(greatest(coalesce(i.pcqtdent, 0), 0), greatest(coalesce(i.pcqtdpro, 0), 0.001)),
  greatest(coalesce(i.pcvlruni, 0), 0), coalesce(i.pcdscit1, 0), coalesce(i.pcperipi, 0),
  round((greatest(coalesce(i.pcqtdpro, 0), 0.001) * greatest(coalesce(i.pcvlruni, 0), 0)
    * (1 - coalesce(i.pcdscit1, 0) / 100) * (1 + coalesce(i.pcperipi, 0) / 100))::numeric, 2)
from public.dukamp_legacy_cmaitped i
join public.dukamp_purchase_orders o on o.order_number = i.pcnropdi
left join public.dukamp_erp_products pr on pr.legacy_code = i.pccodpro
where i.pciteped is not null
on conflict (order_id, line_number) do nothing;

update public.dukamp_purchase_orders o
set total_amount = coalesce(x.items_total, 0) + o.freight_amount + o.extra_amount - o.discount_amount,
    status = case
      when x.item_count = 0 then 'draft'
      when x.received_count = x.item_count then 'received'
      when x.received_count > 0 then 'partial'
      else 'approved'
    end
from (
  select order_id, sum(total_amount) items_total, count(*) item_count,
         count(*) filter (where quantity_received >= quantity_ordered) received_count
  from public.dukamp_purchase_order_items group by order_id
) x
where o.id = x.order_id
  and o.legacy_source
  and (
    o.total_amount is distinct from coalesce(x.items_total, 0) + o.freight_amount + o.extra_amount - o.discount_amount
    or o.status is distinct from case
      when x.item_count = 0 then 'draft'
      when x.received_count = x.item_count then 'received'
      when x.received_count > 0 then 'partial'
      else 'approved'
    end
  );

select setval(
  'public.dukamp_purchase_order_number_seq',
  greatest(coalesce((select max(order_number) from public.dukamp_purchase_orders), 0) + 1, 1),
  false
);

insert into public.dukamp_goods_receipts (
  supplier_id, invoice_number, issue_date, received_at, status, merchandise_amount,
  freight_amount, expense_amount, discount_amount, icms_amount, invoice_amount,
  nfe_key, legacy_source, legacy_segment
)
select
  s.id, n.nronff, n.datemi, coalesce(n.datdig, n.datemi, current_date)::timestamp,
  'posted', greatest(coalesce(n.valnot, 0) - coalesce(n.valfre, 0) - coalesce(n.valdsp, 0) + coalesce(n.valdsc, 0), 0),
  coalesce(n.valfre, 0), coalesce(n.valdsp, 0), coalesce(n.valdsc, 0), coalesce(n.valicm, 0),
  coalesce(n.valnot, 0), nullif(trim(n.chave_nfe), ''), true, n.segmen
from public.dukamp_legacy_cmanoten n
join public.dukamp_erp_suppliers s on s.legacy_code = n.codfor
where n.nronff is not null
on conflict do nothing;

-- Um item antigo não possui cabeçalho em CMANOTEN. Cria uma entrada de recuperação
-- para não descartar esse registro durante a normalização.
insert into public.dukamp_goods_receipts (
  supplier_id, invoice_number, status, merchandise_amount, invoice_amount,
  notes, legacy_source, legacy_segment
)
select
  s.id, i.nronff, 'posted', coalesce(sum(i.totite), 0), coalesce(sum(i.totite), 0),
  'Cabeçalho ausente no DBF de notas de entrada; recuperado pelos itens.', true, i.segmen
from public.dukamp_legacy_cmaitent i
join public.dukamp_erp_suppliers s on s.legacy_code = i.codfor
where i.nronff is not null
  and not exists (
    select 1 from public.dukamp_goods_receipts r
    where r.supplier_id = s.id and r.invoice_number = i.nronff and r.legacy_source
  )
group by s.id, i.nronff, i.segmen
on conflict do nothing;

insert into public.dukamp_goods_receipt_items (
  receipt_id, line_number, product_id, description, unit, quantity,
  unit_cost, real_cost, total_amount
)
select
  r.id,
  row_number() over (partition by r.id order by i.nroite, i._row_id)::integer,
  p.id, coalesce(nullif(trim(i.nompro), ''), p.name, 'Item ' || coalesce(i.nroite, 0)),
  coalesce(p.unit, 'UN'), greatest(coalesce(i.quapro, 0), 0.001),
  greatest(coalesce(i.prerec, i.cstpro, 0), 0), greatest(coalesce(i.cstrea, i.cstpro, 0), 0),
  coalesce(nullif(i.totite, 0), i.quapro * coalesce(i.prerec, i.cstpro, 0), 0)
from public.dukamp_legacy_cmaitent i
join public.dukamp_erp_suppliers s on s.legacy_code = i.codfor
join public.dukamp_goods_receipts r on r.supplier_id = s.id
  and r.invoice_number = i.nronff
  and coalesce(r.legacy_segment, 0) = coalesce(i.segmen, 0)
  and r.legacy_source
left join public.dukamp_erp_products p on p.legacy_code = i.codpro
where i.nroite is not null
on conflict (receipt_id, line_number) do nothing;

insert into public.dukamp_accounts_payable (
  supplier_id, legacy_ap_number, title_number, description, issue_date, due_date,
  amount, open_amount, discount_amount, interest_amount, paid_at, status,
  payment_method, expense_group, notes, source_type
)
select
  s.id, p.pnroap, coalesce(nullif(trim(p.pnrtit), ''), p.pnroap::text), nullif(trim(p.pdescr), ''),
  coalesce(p.pemiss, p.pdtins, current_date), coalesce(p.pvecto, p.pemiss, current_date),
  greatest(coalesce(p.pvrtit, 0), 0), greatest(coalesce(p.pvrabe, 0), 0), coalesce(p.pdesvc, 0),
  coalesce(p.pjuros, 0), p.ppagto,
  case when upper(coalesce(p.ppago, 'N')) = 'S' or coalesce(p.pvrabe, 0) = 0 then 'paid'
       when coalesce(p.pvrabe, 0) < coalesce(p.pvrtit, 0) then 'partial' else 'open' end,
  nullif(trim(p.ptippg), ''), p.pgrucm, nullif(trim(p.pobser), ''), 'legacy'
from public.dukamp_legacy_cpatitup p
left join public.dukamp_erp_suppliers s on s.legacy_code = p.pforne
where p.pnroap is not null
on conflict (legacy_ap_number) do nothing;

-- Segurança: todos os administradores, conforme o escopo definido para a área Dukamp.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'dukamp_erp_suppliers','dukamp_erp_products','dukamp_purchase_orders',
    'dukamp_purchase_order_items','dukamp_goods_receipts','dukamp_goods_receipt_items',
    'dukamp_inventory_movements','dukamp_accounts_payable','dukamp_erp_audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('drop policy if exists %I on public.%I', 'Admins manage ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))',
      'Admins manage ' || table_name, table_name
    );
  end loop;
end $$;

revoke insert, update, delete on public.dukamp_erp_audit_log from authenticated;
grant usage, select on sequence public.dukamp_purchase_order_number_seq to authenticated, service_role;
grant usage, select on all sequences in schema public to service_role;

drop trigger if exists dukamp_erp_suppliers_updated on public.dukamp_erp_suppliers;
create trigger dukamp_erp_suppliers_updated before update on public.dukamp_erp_suppliers
for each row execute function public.tg_set_updated_at();
drop trigger if exists dukamp_erp_products_updated on public.dukamp_erp_products;
create trigger dukamp_erp_products_updated before update on public.dukamp_erp_products
for each row execute function public.tg_set_updated_at();
drop trigger if exists dukamp_purchase_orders_updated on public.dukamp_purchase_orders;
create trigger dukamp_purchase_orders_updated before update on public.dukamp_purchase_orders
for each row execute function public.tg_set_updated_at();
drop trigger if exists dukamp_purchase_order_items_updated on public.dukamp_purchase_order_items;
create trigger dukamp_purchase_order_items_updated before update on public.dukamp_purchase_order_items
for each row execute function public.tg_set_updated_at();
drop trigger if exists dukamp_goods_receipts_updated on public.dukamp_goods_receipts;
create trigger dukamp_goods_receipts_updated before update on public.dukamp_goods_receipts
for each row execute function public.tg_set_updated_at();
drop trigger if exists dukamp_accounts_payable_updated on public.dukamp_accounts_payable;
create trigger dukamp_accounts_payable_updated before update on public.dukamp_accounts_payable
for each row execute function public.tg_set_updated_at();

create or replace function public.dukamp_create_purchase_order(
  _supplier_id uuid,
  _issue_date date,
  _expected_date date,
  _payment_terms text,
  _freight_amount numeric,
  _discount_amount numeric,
  _extra_amount numeric,
  _supplier_order_number text,
  _transport text,
  _contact_name text,
  _notes text,
  _items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  item record;
  line_no integer := 0;
  items_total numeric := 0;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso negado'; end if;
  if not exists (select 1 from public.dukamp_erp_suppliers where id = _supplier_id and active) then
    raise exception 'Fornecedor inválido ou inativo';
  end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Inclua ao menos um item no pedido';
  end if;

  insert into public.dukamp_purchase_orders (
    supplier_id, issue_date, expected_date, payment_terms, freight_amount,
    discount_amount, extra_amount, supplier_order_number, transport, contact_name,
    notes, created_by
  ) values (
    _supplier_id, coalesce(_issue_date, current_date), _expected_date, nullif(trim(_payment_terms), ''),
    greatest(coalesce(_freight_amount, 0), 0), greatest(coalesce(_discount_amount, 0), 0),
    greatest(coalesce(_extra_amount, 0), 0), nullif(trim(_supplier_order_number), ''),
    nullif(trim(_transport), ''), nullif(trim(_contact_name), ''), nullif(trim(_notes), ''), auth.uid()
  ) returning id into new_order_id;

  for item in
    select * from jsonb_to_recordset(_items) as x(
      product_id uuid, description text, unit text, quantity numeric,
      unit_price numeric, discount_percent numeric, ipi_percent numeric
    )
  loop
    if item.quantity is null or item.quantity <= 0 or item.unit_price is null or item.unit_price < 0 then
      raise exception 'Quantidade ou preço inválido no item %', line_no + 1;
    end if;
    line_no := line_no + 1;
    insert into public.dukamp_purchase_order_items (
      order_id, line_number, product_id, description, unit, quantity_ordered,
      unit_price, discount_percent, ipi_percent, total_amount
    ) values (
      new_order_id, line_no, item.product_id, coalesce(nullif(trim(item.description), ''), 'Item ' || line_no),
      coalesce(nullif(trim(item.unit), ''), 'UN'), item.quantity, item.unit_price,
      greatest(coalesce(item.discount_percent, 0), 0), greatest(coalesce(item.ipi_percent, 0), 0),
      round((item.quantity * item.unit_price * (1 - greatest(coalesce(item.discount_percent, 0), 0) / 100)
        * (1 + greatest(coalesce(item.ipi_percent, 0), 0) / 100))::numeric, 2)
    );
  end loop;

  select coalesce(sum(total_amount), 0) into items_total
  from public.dukamp_purchase_order_items where order_id = new_order_id;
  update public.dukamp_purchase_orders
  set total_amount = items_total + freight_amount + extra_amount - discount_amount
  where id = new_order_id;
  return new_order_id;
end;
$$;

create or replace function public.dukamp_set_purchase_order_status(_order_id uuid, _status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare current_status text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso negado'; end if;
  select status into current_status from public.dukamp_purchase_orders where id = _order_id for update;
  if current_status is null then raise exception 'Pedido não encontrado'; end if;
  if _status = 'approved' and current_status = 'draft' then
    update public.dukamp_purchase_orders set status='approved', approved_by=auth.uid(), approved_at=now() where id=_order_id;
  elsif _status = 'cancelled' and current_status in ('draft','approved') then
    if exists (select 1 from public.dukamp_purchase_order_items where order_id=_order_id and quantity_received > 0) then
      raise exception 'Pedido com recebimento não pode ser cancelado';
    end if;
    update public.dukamp_purchase_orders set status='cancelled', cancelled_by=auth.uid(), cancelled_at=now() where id=_order_id;
  else
    raise exception 'Transição de status inválida: % para %', current_status, _status;
  end if;
end;
$$;

create or replace function public.dukamp_receive_purchase_order(
  _order_id uuid,
  _invoice_number text,
  _issue_date date,
  _nfe_key text,
  _freight_amount numeric,
  _expense_amount numeric,
  _discount_amount numeric,
  _due_date date,
  _items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_order public.dukamp_purchase_orders%rowtype;
  order_item public.dukamp_purchase_order_items%rowtype;
  receipt_id uuid;
  item record;
  line_no integer := 0;
  merchandise_total numeric := 0;
  invoice_total numeric := 0;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso negado'; end if;
  select * into purchase_order from public.dukamp_purchase_orders where id=_order_id for update;
  if purchase_order.id is null then raise exception 'Pedido não encontrado'; end if;
  if purchase_order.status not in ('approved','partial') then raise exception 'Apenas pedidos aprovados podem ser recebidos'; end if;
  if nullif(trim(_invoice_number), '') is null then raise exception 'Informe o número da nota'; end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then raise exception 'Informe os itens recebidos'; end if;

  insert into public.dukamp_goods_receipts (
    supplier_id, order_id, invoice_number, issue_date, freight_amount,
    expense_amount, discount_amount, nfe_key, created_by
  ) values (
    purchase_order.supplier_id, purchase_order.id, trim(_invoice_number), _issue_date,
    greatest(coalesce(_freight_amount,0),0), greatest(coalesce(_expense_amount,0),0),
    greatest(coalesce(_discount_amount,0),0), nullif(trim(_nfe_key),''), auth.uid()
  ) returning id into receipt_id;

  for item in
    select * from jsonb_to_recordset(_items) as x(order_item_id uuid, quantity numeric, unit_cost numeric)
  loop
    select * into order_item from public.dukamp_purchase_order_items
    where id=item.order_item_id and order_id=_order_id for update;
    if order_item.id is null then raise exception 'Item do pedido não encontrado'; end if;
    if item.quantity is null or item.quantity <= 0
       or order_item.quantity_received + item.quantity > order_item.quantity_ordered then
      raise exception 'Quantidade recebida inválida para %', order_item.description;
    end if;
    line_no := line_no + 1;
    insert into public.dukamp_goods_receipt_items (
      receipt_id, order_item_id, line_number, product_id, description, unit,
      quantity, unit_cost, real_cost, total_amount
    ) values (
      receipt_id, order_item.id, line_no, order_item.product_id, order_item.description,
      order_item.unit, item.quantity, greatest(coalesce(item.unit_cost, order_item.unit_price),0),
      greatest(coalesce(item.unit_cost, order_item.unit_price),0),
      round((item.quantity * greatest(coalesce(item.unit_cost, order_item.unit_price),0))::numeric,2)
    );
    update public.dukamp_purchase_order_items
    set quantity_received=quantity_received + item.quantity where id=order_item.id;
    merchandise_total := merchandise_total + item.quantity * greatest(coalesce(item.unit_cost, order_item.unit_price),0);

    if order_item.product_id is not null then
      update public.dukamp_erp_products
      set stock=stock + item.quantity,
          cost_price=greatest(coalesce(item.unit_cost, order_item.unit_price),0),
          average_cost=case when stock + item.quantity = 0 then average_cost
            else ((stock * average_cost) + (item.quantity * greatest(coalesce(item.unit_cost, order_item.unit_price),0))) / (stock + item.quantity) end
      where id=order_item.product_id;
      insert into public.dukamp_inventory_movements (
        product_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by
      ) values (
        order_item.product_id, 'purchase', item.quantity,
        greatest(coalesce(item.unit_cost, order_item.unit_price),0), 'goods_receipt', receipt_id,
        'Recebimento NF ' || trim(_invoice_number), auth.uid()
      );
    end if;
  end loop;

  invoice_total := round(merchandise_total + greatest(coalesce(_freight_amount,0),0)
    + greatest(coalesce(_expense_amount,0),0) - greatest(coalesce(_discount_amount,0),0), 2);
  update public.dukamp_goods_receipts
  set merchandise_amount=round(merchandise_total,2), invoice_amount=invoice_total where id=receipt_id;

  update public.dukamp_purchase_orders
  set status=case when exists (
    select 1 from public.dukamp_purchase_order_items
    where order_id=_order_id and quantity_received < quantity_ordered
  ) then 'partial' else 'received' end
  where id=_order_id;

  if _due_date is not null and invoice_total > 0 then
    insert into public.dukamp_accounts_payable (
      supplier_id, purchase_receipt_id, title_number, description, issue_date,
      due_date, amount, open_amount, source_type, created_by
    ) values (
      purchase_order.supplier_id, receipt_id, trim(_invoice_number),
      'Compra pedido ' || purchase_order.order_number, coalesce(_issue_date,current_date),
      _due_date, invoice_total, invoice_total, 'purchase_receipt', auth.uid()
    );
  end if;
  return receipt_id;
end;
$$;

create or replace function public.dukamp_purchasing_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso negado'; end if;
  return jsonb_build_object(
    'suppliers', (select count(*) from public.dukamp_erp_suppliers where active),
    'products', (select count(*) from public.dukamp_erp_products where active),
    'orders_open', (select count(*) from public.dukamp_purchase_orders where status in ('draft','approved','partial')),
    'orders_overdue', (select count(*) from public.dukamp_purchase_orders where status in ('approved','partial') and expected_date < current_date),
    'orders_open_value', (select coalesce(sum(total_amount),0) from public.dukamp_purchase_orders where status in ('draft','approved','partial')),
    'payables_open', (select count(*) from public.dukamp_accounts_payable where status in ('open','partial')),
    'payables_overdue', (select count(*) from public.dukamp_accounts_payable where status in ('open','partial') and due_date < current_date),
    'payables_open_value', (select coalesce(sum(open_amount),0) from public.dukamp_accounts_payable where status in ('open','partial')),
    'negative_stock', (select count(*) from public.dukamp_erp_products where active and stock < 0),
    'below_minimum_stock', (select count(*) from public.dukamp_erp_products where active and minimum_stock > 0 and stock < minimum_stock)
  );
end;
$$;

create or replace function public.dukamp_audit_erp_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dukamp_erp_audit_log(actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(), tg_op, tg_table_name,
    coalesce((case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', ''),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return case when tg_op='DELETE' then old else new end;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'dukamp_erp_suppliers','dukamp_erp_products','dukamp_purchase_orders',
    'dukamp_purchase_order_items','dukamp_goods_receipts','dukamp_goods_receipt_items',
    'dukamp_inventory_movements','dukamp_accounts_payable'
  ] loop
    execute format('drop trigger if exists dukamp_audit_change on public.%I', table_name);
    execute format('create trigger dukamp_audit_change after insert or update or delete on public.%I for each row execute function public.dukamp_audit_erp_change()', table_name);
  end loop;
end $$;

revoke all on function public.dukamp_create_purchase_order(uuid,date,date,text,numeric,numeric,numeric,text,text,text,text,jsonb) from public, anon;
grant execute on function public.dukamp_create_purchase_order(uuid,date,date,text,numeric,numeric,numeric,text,text,text,text,jsonb) to authenticated, service_role;
revoke all on function public.dukamp_set_purchase_order_status(uuid,text) from public, anon;
grant execute on function public.dukamp_set_purchase_order_status(uuid,text) to authenticated, service_role;
revoke all on function public.dukamp_receive_purchase_order(uuid,text,date,text,numeric,numeric,numeric,date,jsonb) from public, anon;
grant execute on function public.dukamp_receive_purchase_order(uuid,text,date,text,numeric,numeric,numeric,date,jsonb) to authenticated, service_role;
revoke all on function public.dukamp_purchasing_dashboard() from public, anon;
grant execute on function public.dukamp_purchasing_dashboard() to authenticated, service_role;

notify pgrst, 'reload schema';
