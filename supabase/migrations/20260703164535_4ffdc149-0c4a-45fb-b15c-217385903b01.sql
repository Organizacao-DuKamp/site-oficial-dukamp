
DO $$ BEGIN
  CREATE TYPE public.delivery_status AS ENUM ('preparando','a_caminho','entregue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status public.delivery_status NOT NULL DEFAULT 'preparando',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_notified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders(delivery_status);

-- Permite que o próprio usuário marque seu aviso de entrega como visualizado
DROP POLICY IF EXISTS "Users mark delivery notified" ON public.orders;
CREATE POLICY "Users mark delivery notified" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
