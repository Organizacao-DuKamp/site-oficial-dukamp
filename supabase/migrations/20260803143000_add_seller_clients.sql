-- Associate an authenticated seller account with its public seller record and
-- assign customers to that seller. Access to the customer list is enforced in
-- the database; client-side filters are only an additional usability measure.
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_seller_id_idx ON public.profiles (seller_id);

CREATE POLICY "Sellers can view their own seller record"
  ON public.sellers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Sellers can view assigned customer profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sellers seller
      WHERE seller.id = profiles.seller_id
        AND seller.user_id = auth.uid()
        AND seller.active = TRUE
    )
  );

-- A customer must not be able to select a seller by editing their own profile.
-- Assignments are maintained by administrators or trusted service-role jobs.
CREATE OR REPLACE FUNCTION public.protect_profile_seller_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change the assigned seller';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_seller_id ON public.profiles;
CREATE TRIGGER protect_profile_seller_id
  BEFORE UPDATE OF seller_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_seller_id();
