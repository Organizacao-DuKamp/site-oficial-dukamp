-- Customer/seller conversations. Legacy tickets remain administrative tickets and
-- intentionally keep seller_id NULL, so assigning a seller never exposes history.
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE RESTRICT,
  ADD CONSTRAINT support_ticket_pair_complete CHECK (
    (customer_id IS NULL AND seller_id IS NULL) OR
    (customer_id IS NOT NULL AND seller_id IS NOT NULL)
  );

CREATE UNIQUE INDEX support_tickets_active_customer_seller_idx
  ON public.support_tickets (customer_id, seller_id)
  WHERE status <> 'closed' AND customer_id IS NOT NULL;
CREATE INDEX support_tickets_seller_order_idx
  ON public.support_tickets (seller_id, last_message_at DESC);

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS read_by_customer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_by_seller boolean NOT NULL DEFAULT false;

UPDATE public.support_messages
SET read_by_customer = read_by_user,
    read_by_seller = read_by_admin;

ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_sender_role_check;
ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_sender_role_check
  CHECK (sender_role IN ('user', 'customer', 'seller', 'admin'));
CREATE INDEX support_messages_ticket_order_idx
  ON public.support_messages (ticket_id, created_at, id);
CREATE INDEX support_messages_seller_unread_idx
  ON public.support_messages (ticket_id, created_at) WHERE NOT read_by_seller;
CREATE INDEX support_messages_customer_unread_idx
  ON public.support_messages (ticket_id, created_at) WHERE NOT read_by_customer;

CREATE POLICY "Sellers view assigned customer profiles" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = profiles.seller_id AND s.user_id = auth.uid()
  )
);

-- Close the old pair on reassignment. The customer retains access through
-- customer_id, while neither the newly assigned seller nor anyone else inherits it.
CREATE OR REPLACE FUNCTION public.close_conversations_on_seller_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.seller_id IS DISTINCT FROM NEW.seller_id THEN
    UPDATE public.support_tickets
       SET status = 'closed', closed_at = now(), updated_at = now()
     WHERE customer_id = NEW.id AND seller_id = OLD.seller_id AND status <> 'closed';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS profiles_close_old_seller_conversations ON public.profiles;
CREATE TRIGGER profiles_close_old_seller_conversations
  AFTER UPDATE OF seller_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.close_conversations_on_seller_change();

-- The database, not the browser, establishes sender identity and role.
CREATE OR REPLACE FUNCTION public.set_support_message_sender()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND OR t.status = 'closed' THEN RAISE EXCEPTION 'Conversation is unavailable'; END IF;
  NEW.sender_id := auth.uid();
  IF public.has_role(auth.uid(), 'admin') THEN
    NEW.sender_role := 'admin';
  ELSIF t.customer_id = auth.uid() OR (t.customer_id IS NULL AND t.user_id = auth.uid()) THEN
    NEW.sender_role := CASE WHEN t.customer_id IS NULL THEN 'user' ELSE 'customer' END;
  ELSIF EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = t.seller_id AND s.user_id = auth.uid()) THEN
    NEW.sender_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Not a conversation participant';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS set_support_message_sender ON public.support_messages;
CREATE TRIGGER set_support_message_sender BEFORE INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_support_message_sender();

CREATE OR REPLACE FUNCTION public.on_support_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      status = CASE WHEN status = 'closed' THEN status
        WHEN NEW.sender_role IN ('admin', 'seller') AND status = 'open' THEN 'in_progress'::public.ticket_status
        ELSE status END,
      updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END; $$;

DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users create own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users or admin update tickets" ON public.support_tickets;
CREATE POLICY "Conversation participants view tickets" ON public.support_tickets FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR
  COALESCE(customer_id, user_id) = auth.uid() OR
  EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
);
CREATE POLICY "Customers create assigned conversations" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (
  (customer_id = auth.uid() AND user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.seller_id = support_tickets.seller_id
  )) OR (customer_id IS NULL AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Participants update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR COALESCE(customer_id, user_id) = auth.uid() OR
  EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR COALESCE(customer_id, user_id) = auth.uid() OR
  EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "View messages of accessible tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Insert messages in open tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Update read flags on accessible messages" ON public.support_messages;
CREATE POLICY "Participants view messages" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (
    public.has_role(auth.uid(), 'admin') OR COALESCE(t.customer_id, t.user_id) = auth.uid() OR
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = t.seller_id AND s.user_id = auth.uid())
  )
));
CREATE POLICY "Participants insert messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.status <> 'closed' AND (
      public.has_role(auth.uid(), 'admin') OR COALESCE(t.customer_id, t.user_id) = auth.uid() OR
      EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = t.seller_id AND s.user_id = auth.uid())
    )
  )
);
CREATE POLICY "Participants update their read state" ON public.support_messages FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (
    public.has_role(auth.uid(), 'admin') OR COALESCE(t.customer_id, t.user_id) = auth.uid() OR
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = t.seller_id AND s.user_id = auth.uid())
  )
));

-- Tables are already in supabase_realtime; keep replica identity explicit and idempotent.
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
