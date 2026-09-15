-- Source PDFs and financial values must never be committed to this public repository.
create table public.dukamp_bank_reports (
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  source_name text not null,
  source_sha256 text not null check (length(source_sha256) = 64),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  imported_at timestamptz not null default now(),
  primary key (year, month)
);
alter table public.dukamp_bank_reports enable row level security;
revoke all on public.dukamp_bank_reports from public, anon, authenticated;
grant select on public.dukamp_bank_reports to authenticated;
grant all on public.dukamp_bank_reports to service_role;
-- Reuse the existing strict expense-snapshot owner restriction, including UID.
do $$
declare owner_predicate text;
begin
  select qual into owner_predicate from pg_policies
  where schemaname = 'public' and tablename = 'dukamp_expense_snapshots'
    and policyname = 'expenses_owner_read';
  if owner_predicate is null then
    raise exception 'Existing financial owner policy is required';
  end if;
  execute format('create policy bank_reports_owner_read on public.dukamp_bank_reports for select to authenticated using (%s)', owner_predicate);
end $$;
comment on table public.dukamp_bank_reports is 'Private monthly PDF reports. All payload monetary amounts are integer BRL cents; summary rows must not be summed with detail rows.';
