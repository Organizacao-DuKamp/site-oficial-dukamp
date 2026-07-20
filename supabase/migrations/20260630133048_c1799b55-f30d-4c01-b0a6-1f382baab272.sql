ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_notified BOOLEAN NOT NULL DEFAULT TRUE;

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
        contact_email = req.contact_email,
        approval_notified = FALSE
  WHERE id = req.user_id;

  UPDATE public.account_requests
    SET status = 'approved',
        reviewed_by = _reviewer,
        reviewed_at = now()
  WHERE id = _request_id;
END;
$$;