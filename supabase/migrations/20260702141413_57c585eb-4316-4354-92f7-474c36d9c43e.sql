
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS altura numeric,
  ADD COLUMN IF NOT EXISTS largura numeric,
  ADD COLUMN IF NOT EXISTS comprimento numeric,
  ADD COLUMN IF NOT EXISTS peso numeric;
