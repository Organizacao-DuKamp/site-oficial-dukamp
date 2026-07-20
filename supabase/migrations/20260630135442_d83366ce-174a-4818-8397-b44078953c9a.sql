ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS consumer_pix_price numeric,
  ADD COLUMN IF NOT EXISTS reseller_pix_price numeric,
  ADD COLUMN IF NOT EXISTS producer_pix_price numeric;

UPDATE public.products SET consumer_pix_price = pix_price WHERE consumer_pix_price IS NULL AND pix_price IS NOT NULL;