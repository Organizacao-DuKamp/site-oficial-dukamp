-- Seller is an auth-level account role in installations where the database enum
-- predates that value. Do not cast "vendedor" to public.account_type.
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS show_on_team boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_registered_sellers()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, COALESCE(NULLIF(BTRIM(p.full_name), ''), p.email) AS name
  FROM public.sellers AS s
  JOIN auth.users AS u ON u.id = s.user_id
  JOIN public.profiles AS p ON p.id = u.id
  WHERE s.active = TRUE
    AND u.raw_user_meta_data ->> 'account_type_override' = 'vendedor'
  ORDER BY COALESCE(NULLIF(BTRIM(p.full_name), ''), p.email);
$$;

REVOKE ALL ON FUNCTION public.get_registered_sellers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registered_sellers() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_active_profile_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.sellers AS s
       JOIN auth.users AS u ON u.id = s.user_id
       WHERE s.id = NEW.seller_id
         AND s.active = TRUE
         AND u.raw_user_meta_data ->> 'account_type_override' = 'vendedor'
     ) THEN
    RAISE EXCEPTION 'seller_id must reference an active registered seller account';
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.sellers (user_id, name, slug, active, show_on_team)
SELECT
  p.id,
  COALESCE(NULLIF(BTRIM(p.full_name), ''), p.email, 'Vendedor'),
  'conta-' || p.id::text,
  true,
  false
FROM public.profiles AS p
JOIN auth.users AS u ON u.id = p.id
WHERE u.raw_user_meta_data ->> 'account_type_override' = 'vendedor'
  AND NOT EXISTS (SELECT 1 FROM public.sellers AS s WHERE s.user_id = p.id)
ON CONFLICT (slug) DO NOTHING;
