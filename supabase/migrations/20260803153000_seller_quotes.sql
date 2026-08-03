-- Seller-created quotes. All lifecycle changes happen in the RPCs below so the
-- checks, catalog price snapshot and status transition share one transaction.
CREATE TYPE public.seller_quote_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');

CREATE TABLE public.seller_clients (
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, client_id),
  CONSTRAINT seller_client_distinct CHECK (seller_id <> client_id)
);

CREATE TABLE public.seller_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  client_id uuid NOT NULL REFERENCES public.profiles(id),
  status public.seller_quote_status NOT NULL DEFAULT 'draft',
  notes text,
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  seller_name_snapshot text,
  client_name_snapshot text,
  client_email_snapshot text,
  CONSTRAINT quote_validity_after_creation CHECK (valid_until > created_at),
  CONSTRAINT quote_parties_distinct CHECK (seller_id <> client_id)
);

CREATE TABLE public.seller_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.seller_quotes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  product_name_snapshot text,
  unit_price_snapshot numeric(12,2) CHECK (unit_price_snapshot >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, product_id)
);

CREATE INDEX seller_quotes_seller_idx ON public.seller_quotes (seller_id, created_at DESC);
CREATE INDEX seller_quotes_client_unread_idx ON public.seller_quotes (client_id, sent_at DESC)
  WHERE status = 'sent' AND viewed_at IS NULL;
CREATE INDEX seller_quote_items_quote_idx ON public.seller_quote_items (quote_id);

ALTER TABLE public.seller_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linked parties read seller clients" ON public.seller_clients FOR SELECT TO authenticated
  USING (auth.uid() IN (seller_id, client_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage seller clients" ON public.seller_clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "parties read quotes" ON public.seller_quotes FOR SELECT TO authenticated
  USING (auth.uid() = seller_id OR (auth.uid() = client_id AND status <> 'draft') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "parties read quote items" ON public.seller_quote_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_quotes q WHERE q.id = quote_id AND
    (q.seller_id = auth.uid() OR (q.client_id = auth.uid() AND q.status <> 'draft') OR public.has_role(auth.uid(), 'admin'))));

-- No direct quote/item writes are granted: callers must use these audited RPCs.
GRANT SELECT ON public.seller_clients, public.seller_quotes, public.seller_quote_items TO authenticated;
GRANT ALL ON public.seller_clients, public.seller_quotes, public.seller_quote_items TO service_role;

CREATE OR REPLACE FUNCTION public.quote_price_for_account(p public.products, account public.account_type)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE account
    WHEN 'revendedor' THEN coalesce(p.reseller_price, p.consumer_price, p.price)
    WHEN 'produtor' THEN coalesce(p.producer_price, p.consumer_price, p.price)
    WHEN 'empresa' THEN coalesce(p.reseller_price, p.consumer_price, p.price)
    ELSE coalesce(p.consumer_price, p.price)
  END
$$;

CREATE OR REPLACE FUNCTION public.create_seller_quote(_client_id uuid, _notes text, _valid_until timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE quote_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_type = 'vendedor') THEN
    RAISE EXCEPTION 'Apenas vendedores podem criar orçamentos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM seller_clients WHERE seller_id = auth.uid() AND client_id = _client_id AND active) THEN
    RAISE EXCEPTION 'Cliente não está vinculado ao vendedor';
  END IF;
  IF _valid_until <= now() THEN RAISE EXCEPTION 'Validade deve estar no futuro'; END IF;
  INSERT INTO seller_quotes (seller_id, client_id, notes, valid_until, client_name_snapshot, client_email_snapshot)
    SELECT auth.uid(), p.id, nullif(trim(_notes), ''), _valid_until, p.full_name, p.email
    FROM profiles p WHERE p.id = _client_id RETURNING id INTO quote_id;
  RETURN quote_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_seller_quote(_quote_id uuid, _notes text, _valid_until timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _valid_until <= now() THEN RAISE EXCEPTION 'Validade deve estar no futuro'; END IF;
  UPDATE seller_quotes SET notes = nullif(trim(_notes), ''), valid_until = _valid_until, updated_at = now()
    WHERE id = _quote_id AND seller_id = auth.uid() AND status = 'draft'
      AND EXISTS (SELECT 1 FROM seller_clients WHERE seller_id = auth.uid() AND client_id = seller_quotes.client_id AND active);
  IF NOT FOUND THEN RAISE EXCEPTION 'Rascunho não encontrado, já enviado ou cliente desvinculado'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.list_my_seller_clients()
RETURNS TABLE (id uuid, full_name text, email text) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email FROM seller_clients sc JOIN profiles p ON p.id = sc.client_id
  WHERE sc.seller_id = auth.uid() AND sc.active ORDER BY p.full_name NULLS LAST, p.email
$$;

CREATE OR REPLACE FUNCTION public.save_seller_quote_item(_quote_id uuid, _product_id uuid, _quantity integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  PERFORM 1 FROM seller_quotes WHERE id = _quote_id AND seller_id = auth.uid() AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rascunho não encontrado ou já enviado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = _product_id AND active AND stock >= _quantity) THEN
    RAISE EXCEPTION 'Produto indisponível ou estoque insuficiente';
  END IF;
  INSERT INTO seller_quote_items (quote_id, product_id, quantity) VALUES (_quote_id, _product_id, _quantity)
    ON CONFLICT (quote_id, product_id) DO UPDATE SET quantity = excluded.quantity;
  UPDATE seller_quotes SET updated_at = now() WHERE id = _quote_id;
END $$;

CREATE OR REPLACE FUNCTION public.remove_seller_quote_item(_quote_id uuid, _product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM seller_quotes WHERE id = _quote_id AND seller_id = auth.uid() AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rascunho não encontrado ou já enviado'; END IF;
  DELETE FROM seller_quote_items WHERE quote_id = _quote_id AND product_id = _product_id;
  UPDATE seller_quotes SET updated_at = now() WHERE id = _quote_id;
END $$;

CREATE OR REPLACE FUNCTION public.send_seller_quote(_quote_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q seller_quotes%rowtype; invalid_count integer;
BEGIN
  SELECT * INTO q FROM seller_quotes WHERE id = _quote_id AND seller_id = auth.uid() AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rascunho não encontrado ou já enviado'; END IF;
  IF q.valid_until <= now() THEN RAISE EXCEPTION 'Orçamento vencido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM seller_clients WHERE seller_id = q.seller_id AND client_id = q.client_id AND active) THEN
    RAISE EXCEPTION 'Vínculo com cliente não está ativo';
  END IF;
  SELECT count(*) INTO invalid_count FROM seller_quote_items i JOIN products p ON p.id = i.product_id
    WHERE i.quote_id = q.id AND (NOT p.active OR p.stock < i.quantity);
  IF invalid_count > 0 OR NOT EXISTS (SELECT 1 FROM seller_quote_items WHERE quote_id = q.id) THEN
    RAISE EXCEPTION 'Revise produtos, estoque e quantidades';
  END IF;
  UPDATE seller_quote_items i SET product_name_snapshot = p.name,
    unit_price_snapshot = public.quote_price_for_account(p, c.account_type)
    FROM products p, profiles c WHERE i.quote_id = q.id AND p.id = i.product_id AND c.id = q.client_id;
  IF EXISTS (SELECT 1 FROM seller_quote_items WHERE quote_id = q.id AND unit_price_snapshot IS NULL) THEN
    RAISE EXCEPTION 'Preço não configurado para o tipo de conta do cliente';
  END IF;
  UPDATE seller_quotes sq SET status = 'sent', sent_at = now(), updated_at = now(),
    seller_name_snapshot = (SELECT full_name FROM profiles WHERE id = q.seller_id) WHERE sq.id = q.id;
END $$;

CREATE OR REPLACE FUNCTION public.mark_seller_quote_viewed(_quote_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE seller_quotes SET viewed_at = coalesce(viewed_at, now()), updated_at = now()
    WHERE id = _quote_id AND client_id = auth.uid() AND status = 'sent';
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento enviado não encontrado'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.respond_seller_quote(_quote_id uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE seller_quotes SET status = CASE WHEN _accept THEN 'accepted'::seller_quote_status ELSE 'declined'::seller_quote_status END,
    viewed_at = coalesce(viewed_at, now()), accepted_at = CASE WHEN _accept THEN now() END,
    declined_at = CASE WHEN NOT _accept THEN now() END, updated_at = now()
    WHERE id = _quote_id AND client_id = auth.uid() AND status = 'sent' AND valid_until > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento já respondido ou vencido'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.create_seller_quote(uuid,text,timestamptz), public.update_seller_quote(uuid,text,timestamptz), public.save_seller_quote_item(uuid,uuid,integer),
  public.remove_seller_quote_item(uuid,uuid), public.send_seller_quote(uuid), public.mark_seller_quote_viewed(uuid),
  public.respond_seller_quote(uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_seller_clients() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_seller_quote(uuid,text,timestamptz), public.update_seller_quote(uuid,text,timestamptz), public.save_seller_quote_item(uuid,uuid,integer),
  public.remove_seller_quote_item(uuid,uuid), public.send_seller_quote(uuid), public.mark_seller_quote_viewed(uuid),
  public.respond_seller_quote(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_seller_clients() TO authenticated;
