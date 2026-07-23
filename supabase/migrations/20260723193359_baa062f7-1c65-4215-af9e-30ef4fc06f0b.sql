ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_base_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_fee numeric,
  ADD COLUMN IF NOT EXISTS card_installments integer;