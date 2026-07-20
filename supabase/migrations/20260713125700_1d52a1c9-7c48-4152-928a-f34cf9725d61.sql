DROP POLICY IF EXISTS "Public can view active sellers" ON public.sellers;

CREATE POLICY "Anyone can view active sellers"
ON public.sellers
FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins can view all sellers"
ON public.sellers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));