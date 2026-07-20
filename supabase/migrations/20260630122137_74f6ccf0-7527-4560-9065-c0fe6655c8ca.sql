
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND email = 'dukamp8442@dukamp.local')
$$;
REVOKE EXECUTE ON FUNCTION public.is_master_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_master_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "admin manage roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "admin manage roles delete" ON public.user_roles;

CREATE POLICY "master admin insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "master admin delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_master_admin(auth.uid()));
