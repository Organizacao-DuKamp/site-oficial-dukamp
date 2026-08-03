-- Sales quotes are accepted exclusively through accept_sales_quote(), which locks the
-- quote row and performs every validation and the status transition in one transaction.
CREATE TYPE public.sales_quote_status AS ENUM ('draft', 'sent', 'accepted', 'expired', 'cancelled');

CREATE TABLE public.sales_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id),
  status public.sales_quote_status NOT NULL DEFAULT 'draft',
  valid_until timestamptz NOT NULL,
  accepted_at timestamptz,
  -- Frozen only when accepted, so retries can restore exactly the same local cart.
  accepted_cart_items jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.sales_quotes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  quoted_unit_price numeric(12,2) NOT NULL CHECK (quoted_unit_price > 0),
  UNIQUE (quote_id, product_id)
);

ALTER TABLE public.sales_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own sales quotes" ON public.sales_quotes
  FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customers view own sales quote items" ON public.sales_quote_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sales_quotes q WHERE q.id = quote_id AND q.customer_id = auth.uid())
  );

GRANT SELECT ON public.sales_quotes, public.sales_quote_items TO authenticated;
GRANT ALL ON public.sales_quotes, public.sales_quote_items TO service_role;

CREATE INDEX sales_quotes_customer_idx ON public.sales_quotes (customer_id, status);
CREATE INDEX sales_quote_items_quote_idx ON public.sales_quote_items (quote_id);

CREATE OR REPLACE FUNCTION public.accept_sales_quote(_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.sales_quotes%ROWTYPE;
  account public.account_type;
  invalid_product text;
  cart_items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para aceitar este orçamento.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO q FROM public.sales_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR q.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Orçamento não encontrado ou não pertence à sua conta.' USING ERRCODE = '42501';
  END IF;

  -- Idempotent retry: never append or create a second acceptance.
  IF q.status = 'accepted' THEN
    RETURN jsonb_build_object(
      'quote_id', q.id, 'status', 'accepted', 'already_accepted', true,
      'items', COALESCE(q.accepted_cart_items, '[]'::jsonb)
    );
  END IF;

  IF q.status <> 'sent' THEN
    RAISE EXCEPTION 'Este orçamento não está disponível para aceite (status: %).', q.status;
  END IF;
  IF q.valid_until < now() THEN
    RAISE EXCEPTION 'Este orçamento venceu. Solicite um novo orçamento ao vendedor.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = q.seller_id AND s.active) THEN
    RAISE EXCEPTION 'O vendedor deste orçamento não está mais disponível. Entre em contato com a Dukamp.';
  END IF;

  SELECT COALESCE(p.account_type, 'cliente'::public.account_type)
    INTO account FROM public.profiles p WHERE p.id = auth.uid();
  account := COALESCE(account, 'cliente'::public.account_type);

  -- Report the first actionable invalidity instead of silently dropping an item.
  SELECT CASE
    WHEN p.id IS NULL THEN 'Um produto deste orçamento foi removido. Solicite um novo orçamento.'
    WHEN NOT COALESCE(p.active, false) THEN format('O produto "%s" foi removido e invalidou o orçamento.', p.name)
    WHEN COALESCE(p.stock, 0) < qi.quantity THEN format('O produto "%s" está sem estoque suficiente.', p.name)
    WHEN round(qi.quoted_unit_price, 2) <> round(
      CASE
        WHEN account = 'produtor' AND COALESCE(p.on_sale, false)
          THEN COALESCE(p.sale_producer_price, p.producer_price, p.consumer_price, p.price)
        WHEN account = 'produtor' THEN COALESCE(p.producer_price, p.consumer_price, p.price)
        WHEN COALESCE(p.on_sale, false) THEN COALESCE(p.sale_consumer_price, p.consumer_price, p.price)
        ELSE COALESCE(p.consumer_price, p.price)
      END, 2)
      THEN format('O preço do produto "%s" foi alterado e invalidou o orçamento.', p.name)
  END INTO invalid_product
  FROM public.sales_quote_items qi
  LEFT JOIN public.products p ON p.id = qi.product_id
  WHERE qi.quote_id = q.id
    AND (p.id IS NULL OR NOT COALESCE(p.active, false) OR COALESCE(p.stock, 0) < qi.quantity OR
      round(qi.quoted_unit_price, 2) <> round(
        CASE
          WHEN account = 'produtor' AND COALESCE(p.on_sale, false) THEN COALESCE(p.sale_producer_price, p.producer_price, p.consumer_price, p.price)
          WHEN account = 'produtor' THEN COALESCE(p.producer_price, p.consumer_price, p.price)
            WHEN COALESCE(p.on_sale, false) THEN COALESCE(p.sale_consumer_price, p.consumer_price, p.price)
          ELSE COALESCE(p.consumer_price, p.price)
        END, 2))
  LIMIT 1;

  IF invalid_product IS NOT NULL THEN RAISE EXCEPTION '%', invalid_product; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_quote_items WHERE quote_id = q.id) THEN
    RAISE EXCEPTION 'Este orçamento não possui produtos e não pode ser aceito.';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'price', qi.quoted_unit_price,
    'image', p.images[1], 'quantity', qi.quantity
  ) ORDER BY qi.id)
  INTO cart_items
  FROM public.sales_quote_items qi JOIN public.products p ON p.id = qi.product_id
  WHERE qi.quote_id = q.id;

  UPDATE public.sales_quotes SET
    status = 'accepted', accepted_at = now(), accepted_cart_items = cart_items, updated_at = now()
  WHERE id = q.id;

  RETURN jsonb_build_object(
    'quote_id', q.id, 'status', 'accepted', 'already_accepted', false, 'items', cart_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_sales_quote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_sales_quote(uuid) TO authenticated;
