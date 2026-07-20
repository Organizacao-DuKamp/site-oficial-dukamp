ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS card_installments smallint,
  ADD COLUMN IF NOT EXISTS payment_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_base_amount numeric(12,2);