create table if not exists public.dukamp_expense_categories (
  code integer primary key,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.dukamp_expense_subcategories (
  code integer primary key,
  category_code integer not null references public.dukamp_expense_categories(code) on update cascade on delete restrict,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.dukamp_expense_monthly_values (
  year smallint not null check (year between 2000 and 2100),
  month smallint not null check (month between 1 and 12),
  subcategory_code integer not null references public.dukamp_expense_subcategories(code) on update cascade on delete restrict,
  amount numeric(16,2) not null default 0,
  source text not null default 'DESPESAS DUKAMP - 2026.xlsx',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (year, month, subcategory_code)
);

create index if not exists dukamp_expense_subcategories_category_idx
  on public.dukamp_expense_subcategories(category_code);
create index if not exists dukamp_expense_monthly_values_period_idx
  on public.dukamp_expense_monthly_values(year, month);

alter table public.dukamp_expense_categories enable row level security;
alter table public.dukamp_expense_subcategories enable row level security;
alter table public.dukamp_expense_monthly_values enable row level security;

revoke all on public.dukamp_expense_categories from anon, authenticated;
revoke all on public.dukamp_expense_subcategories from anon, authenticated;
revoke all on public.dukamp_expense_monthly_values from anon, authenticated;
grant select on public.dukamp_expense_categories to authenticated;
grant select on public.dukamp_expense_subcategories to authenticated;
grant select on public.dukamp_expense_monthly_values to authenticated;

create policy "Master admin reads expense categories"
on public.dukamp_expense_categories
for select
to authenticated
using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'dukamp8442@dukamp.local');

create policy "Master admin reads expense subcategories"
on public.dukamp_expense_subcategories
for select
to authenticated
using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'dukamp8442@dukamp.local');

create policy "Master admin reads monthly expenses"
on public.dukamp_expense_monthly_values
for select
to authenticated
using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'dukamp8442@dukamp.local');
