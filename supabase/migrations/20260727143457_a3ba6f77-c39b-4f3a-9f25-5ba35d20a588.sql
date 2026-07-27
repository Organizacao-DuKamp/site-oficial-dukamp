ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_consumer_price numeric,
  ADD COLUMN IF NOT EXISTS sale_producer_price numeric,
  ADD COLUMN IF NOT EXISTS sale_consumer_pix_price numeric,
  ADD COLUMN IF NOT EXISTS sale_producer_pix_price numeric;