alter table public.customers
  add column if not exists roteiro text;

comment on column public.customers.roteiro is
  'Roteiro de entrega e observações operacionais do cliente.';

alter table public.customers enable row level security;
