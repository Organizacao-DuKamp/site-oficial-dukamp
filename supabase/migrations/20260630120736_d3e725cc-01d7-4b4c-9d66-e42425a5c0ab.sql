
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Admin manage user_roles (insert/delete) to promote/demote
DROP POLICY IF EXISTS "admin manage roles insert" ON public.user_roles;
CREATE POLICY "admin manage roles insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin manage roles delete" ON public.user_roles;
CREATE POLICY "admin manage roles delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
