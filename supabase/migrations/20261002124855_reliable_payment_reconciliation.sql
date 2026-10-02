-- Only trusted server code may apply a status read from Mercado Pago.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mp_status_updated_at timestamptz;
-- Previously approved orders already went through the old stock handler.
UPDATE public.orders SET stock_deducted_at = updated_at
 WHERE payment_status = 'approved' AND stock_deducted_at IS NULL;

CREATE OR REPLACE FUNCTION public.reconcile_mercadopago_payment(
  p_order_id uuid, p_payment_id text, p_status text, p_amount numeric,
  p_provider_updated_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_newly_paid boolean := false;
  v_item record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_payment_id IS NULL OR p_payment_id !~ '^[0-9]+$'
     OR p_amount IS NULL OR round(p_amount, 2) <> round(v_order.total, 2)
     OR p_provider_updated_at IS NULL THEN
    RAISE EXCEPTION 'Invalid provider payment';
  END IF;
  IF v_order.mp_payment_id IS NOT NULL AND v_order.mp_payment_id <> p_payment_id THEN
    RAISE EXCEPTION 'Payment does not belong to this order';
  END IF;
  IF p_status NOT IN ('pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded') THEN
    RAISE EXCEPTION 'Unsupported payment status';
  END IF;
  -- Concurrent webhook/poll responses may arrive out of order.
  IF v_order.mp_status_updated_at > p_provider_updated_at THEN
    RETURN jsonb_build_object('payment_status', v_order.payment_status, 'newly_paid', false);
  END IF;
  IF p_status = 'approved' AND v_order.stock_deducted_at IS NULL THEN
    -- Lock products in a stable order to avoid deadlocks between different orders.
    FOR v_item IN SELECT product_id, sum(quantity) AS quantity FROM public.order_items
      WHERE order_id = p_order_id AND product_id IS NOT NULL GROUP BY product_id ORDER BY product_id
    LOOP
      UPDATE public.products SET stock = greatest(0, stock - v_item.quantity::integer)
       WHERE id = v_item.product_id;
    END LOOP;
    v_newly_paid := true;
  END IF;
  UPDATE public.orders SET payment_status = p_status::public.payment_status,
    mp_payment_id = p_payment_id, mp_status_updated_at = p_provider_updated_at,
    stock_deducted_at = CASE WHEN v_newly_paid THEN now() ELSE stock_deducted_at END
   WHERE id = p_order_id;
  RETURN jsonb_build_object('payment_status', p_status, 'newly_paid', v_newly_paid);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_mercadopago_payment(uuid,text,text,numeric,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_mercadopago_payment(uuid,text,text,numeric,timestamptz) TO service_role;
