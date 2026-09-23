create or replace function public.is_master_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select _user_id in (
    'fd53c206-dd10-4b36-aa7b-28e4d12ad85b'::uuid,
    'd73787af-d738-494d-a6bb-07c984b80cae'::uuid
  )
$$;

drop policy if exists "bank_reports_owner_read" on public.dukamp_bank_reports;
create policy "bank_reports_owner_read"
on public.dukamp_bank_reports
for select
to authenticated
using ((select public.is_master_admin((select auth.uid()))));

drop policy if exists "expenses_owner_read" on public.dukamp_expense_snapshots;
create policy "expenses_owner_read"
on public.dukamp_expense_snapshots
for select
to authenticated
using ((select public.is_master_admin((select auth.uid()))));

drop policy if exists "Master admin reads expense categories" on public.dukamp_expense_categories;
create policy "Master admin reads expense categories"
on public.dukamp_expense_categories
for select
to authenticated
using ((select public.is_master_admin((select auth.uid()))));

drop policy if exists "Master admin reads expense subcategories" on public.dukamp_expense_subcategories;
create policy "Master admin reads expense subcategories"
on public.dukamp_expense_subcategories
for select
to authenticated
using ((select public.is_master_admin((select auth.uid()))));

drop policy if exists "Master admin reads monthly expenses" on public.dukamp_expense_monthly_values;
create policy "Master admin reads monthly expenses"
on public.dukamp_expense_monthly_values
for select
to authenticated
using ((select public.is_master_admin((select auth.uid()))));
