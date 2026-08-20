create table if not exists public.password_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  account_name text,
  submitted_cpf text not null,
  submitted_birth_date date not null,
  submitted_phone text not null,
  account_cpf text,
  account_phone text,
  browser_token_hash text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','used','expired')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint password_recovery_token_hash_length check (length(browser_token_hash) = 64)
);

alter table public.password_recovery_requests enable row level security;

create index if not exists password_recovery_requests_user_status_idx
  on public.password_recovery_requests (user_id, status, created_at desc);
create index if not exists password_recovery_requests_email_idx
  on public.password_recovery_requests (lower(email), created_at desc);
create unique index if not exists password_recovery_requests_token_hash_uidx
  on public.password_recovery_requests (browser_token_hash);

create policy "Admins view password recovery requests"
  on public.password_recovery_requests
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

revoke all on table public.password_recovery_requests from anon;
grant select on table public.password_recovery_requests to authenticated;
