-- Connect the public seller card to the account that owns the seller area and
-- let customers optionally choose that seller.
ALTER TABLE public.sellers
  ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

-- The UNIQUE constraint above already creates an index used to enforce the
-- one-account-per-seller rule. Keep a clearly named lookup index as requested.
CREATE INDEX sellers_user_id_idx ON public.sellers (user_id);
CREATE INDEX profiles_seller_id_idx ON public.profiles (seller_id);

-- A seller needs to find their own record even if an administrator has made
-- it inactive. This is also required by the linked-profile policy below.
CREATE POLICY "Sellers can view own record"
  ON public.sellers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Existing profile policies continue to give customers access only to their
-- own row and administrators access to every row. This additional policy gives
-- a seller read-only access to customers that explicitly selected them.
CREATE POLICY "Sellers can view linked profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sellers
      WHERE sellers.id = profiles.seller_id
        AND sellers.user_id = auth.uid()
    )
  );

-- RLS limits a customer to their own profile row. The trigger additionally
-- validates the selected seller and ensures privileged profile attributes
-- cannot be smuggled into the same update as a seller selection.
CREATE OR REPLACE FUNCTION public.validate_profile_seller_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NOT DISTINCT FROM OLD.seller_id THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.sellers
       WHERE id = NEW.seller_id AND active = TRUE
     ) THEN
    RAISE EXCEPTION 'The selected seller is inactive or does not exist'
      USING ERRCODE = 'check_violation';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.account_type IS DISTINCT FROM OLD.account_type
       OR NEW.approval_notified IS DISTINCT FROM OLD.approval_notified
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
     ) THEN
    RAISE EXCEPTION 'Privileged profile fields cannot be changed with seller selection'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_seller_link
  BEFORE UPDATE OF seller_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_seller_link();
