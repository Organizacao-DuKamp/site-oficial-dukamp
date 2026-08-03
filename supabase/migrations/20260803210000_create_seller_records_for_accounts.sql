-- Seller accounts need an internal sellers row because customer/chat relations
-- still reference sellers.id. Internal rows must not become public team cards.
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS show_on_team boolean NOT NULL DEFAULT true;

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
