ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS tracking_status text,
  ADD COLUMN IF NOT EXISTS correios_prepostagem_id text,
  ADD COLUMN IF NOT EXISTS shipping_label_url text,
  ADD COLUMN IF NOT EXISTS shipping_service_code text,
  ADD COLUMN IF NOT EXISTS shipping_error text,
  ADD COLUMN IF NOT EXISTS tracking_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS label_created_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_correios_prepostagem_id_key
  ON public.orders (correios_prepostagem_id)
  WHERE correios_prepostagem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_tracking_code_idx
  ON public.orders (tracking_code)
  WHERE tracking_code IS NOT NULL;