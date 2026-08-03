-- Add the seller account type without changing existing profile values.
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'vendedor';

-- RLS permits users to edit their own profile details, so enforce the privileged
-- account_type field separately. Service-role jobs have no auth.uid() and remain
-- able to perform trusted maintenance.
CREATE OR REPLACE FUNCTION public.protect_profile_account_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type IS DISTINCT FROM OLD.account_type
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change account type';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_account_type ON public.profiles;
CREATE TRIGGER protect_profile_account_type
  BEFORE UPDATE OF account_type ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_account_type();
