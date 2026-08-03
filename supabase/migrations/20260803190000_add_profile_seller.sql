ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_id UUID NULL REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_seller_id ON public.profiles(seller_id);

CREATE OR REPLACE FUNCTION public.validate_active_profile_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.sellers
       WHERE id = NEW.seller_id AND active = TRUE
     ) THEN
    RAISE EXCEPTION 'seller_id must reference an active seller';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_active_profile_seller ON public.profiles;
CREATE TRIGGER validate_active_profile_seller
  BEFORE INSERT OR UPDATE OF seller_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_active_profile_seller();
