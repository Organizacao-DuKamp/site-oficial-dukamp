revoke all privileges on table public.password_recovery_requests from authenticated;
grant select on table public.password_recovery_requests to authenticated;
revoke all privileges on table public.password_recovery_requests from anon;
