
-- 1. Account type enum
CREATE TYPE public.account_type AS ENUM ('cliente', 'revendedor', 'produtor', 'admin');

-- 2. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN account_type public.account_type NOT NULL DEFAULT 'cliente',
  ADD COLUMN uf TEXT,
  ADD COLUMN cnpj TEXT,
  ADD COLUMN cpf TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN contact_email TEXT;

-- Backfill: existing admins get account_type='admin', everyone else 'cliente'
UPDATE public.profiles p
SET account_type = 'admin'
WHERE EXISTS (
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id = p.id AND r.role = 'admin'
);

-- 3. Account requests table
CREATE TYPE public.account_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.requested_account_type AS ENUM ('revendedor', 'produtor');

CREATE TABLE public.account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_type public.requested_account_type NOT NULL,
  uf TEXT NOT NULL,
  cnpj TEXT,
  cpf TEXT,
  phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  status public.account_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cnpj_or_cpf_per_uf CHECK (
    (uf = 'SP' AND cnpj IS NOT NULL AND length(cnpj) > 0)
    OR (uf <> 'SP' AND cpf IS NOT NULL AND length(cpf) > 0)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_requests TO authenticated;
GRANT ALL ON public.account_requests TO service_role;

ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users insert own account request"
  ON public.account_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own requests
CREATE POLICY "Users view own account request"
  ON public.account_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can update (approve/reject)
CREATE POLICY "Admins update account requests"
  ON public.account_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins delete account requests"
  ON public.account_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_account_requests_updated_at
  BEFORE UPDATE ON public.account_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. Products: add reseller / producer prices (keep legacy price)
ALTER TABLE public.products
  ADD COLUMN consumer_price NUMERIC(12,2),
  ADD COLUMN reseller_price NUMERIC(12,2),
  ADD COLUMN producer_price NUMERIC(12,2);

-- Backfill consumer_price from legacy price
UPDATE public.products SET consumer_price = price WHERE consumer_price IS NULL;

-- 5. Allow profile updates of account_type ONLY via admin (RLS).
-- Existing profile policies remain; add admin-can-update policy if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins update any profile'
  ) THEN
    CREATE POLICY "Admins update any profile"
      ON public.profiles FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 6. Helper function: apply approved request
CREATE OR REPLACE FUNCTION public.approve_account_request(_request_id UUID, _reviewer UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.account_requests%ROWTYPE;
  new_type public.account_type;
BEGIN
  IF NOT public.has_role(_reviewer, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve requests';
  END IF;

  SELECT * INTO req FROM public.account_requests WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  new_type := req.requested_type::text::public.account_type;

  UPDATE public.profiles
    SET account_type = new_type,
        uf = req.uf,
        cnpj = req.cnpj,
        cpf = req.cpf,
        phone = req.phone,
        contact_email = req.contact_email
  WHERE id = req.user_id;

  UPDATE public.account_requests
    SET status = 'approved',
        reviewed_by = _reviewer,
        reviewed_at = now()
  WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_account_request(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_account_request(UUID, UUID) TO authenticated;
