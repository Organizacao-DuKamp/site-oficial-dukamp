
-- Add 'empresa' to enums
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'empresa';
ALTER TYPE public.requested_account_type ADD VALUE IF NOT EXISTS 'empresa';

-- Drop restrictive check to allow empresa flow (CNPJ required for empresa, CPF for produtor)
ALTER TABLE public.account_requests DROP CONSTRAINT IF EXISTS cnpj_or_cpf_per_uf;

-- Extra property/company fields
ALTER TABLE public.account_requests
  ADD COLUMN IF NOT EXISTS fazenda text,
  ADD COLUMN IF NOT EXISTS cnpj_propriedade text,
  ADD COLUMN IF NOT EXISTS nome_propriedade text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS municipio_propriedade text,
  ADD COLUMN IF NOT EXISTS estado_propriedade text,
  ADD COLUMN IF NOT EXISTS cobranca_rua text,
  ADD COLUMN IF NOT EXISTS cobranca_bairro text,
  ADD COLUMN IF NOT EXISTS cobranca_numero text,
  ADD COLUMN IF NOT EXISTS cobranca_municipio text,
  ADD COLUMN IF NOT EXISTS cobranca_cep text,
  ADD COLUMN IF NOT EXISTS cobranca_telefone text,
  ADD COLUMN IF NOT EXISTS cobranca_email text,
  ADD COLUMN IF NOT EXISTS is_apartamento boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS apartamento_info text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fazenda text,
  ADD COLUMN IF NOT EXISTS cnpj_propriedade text,
  ADD COLUMN IF NOT EXISTS nome_propriedade text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS municipio_propriedade text,
  ADD COLUMN IF NOT EXISTS estado_propriedade text,
  ADD COLUMN IF NOT EXISTS cobranca_rua text,
  ADD COLUMN IF NOT EXISTS cobranca_bairro text,
  ADD COLUMN IF NOT EXISTS cobranca_numero text,
  ADD COLUMN IF NOT EXISTS cobranca_municipio text,
  ADD COLUMN IF NOT EXISTS cobranca_cep text,
  ADD COLUMN IF NOT EXISTS cobranca_telefone text,
  ADD COLUMN IF NOT EXISTS cobranca_email text,
  ADD COLUMN IF NOT EXISTS is_apartamento boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS apartamento_info text;

-- Update approval function to copy new fields
CREATE OR REPLACE FUNCTION public.approve_account_request(_request_id uuid, _reviewer uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        fazenda = req.fazenda,
        cnpj_propriedade = req.cnpj_propriedade,
        nome_propriedade = req.nome_propriedade,
        inscricao_estadual = req.inscricao_estadual,
        municipio_propriedade = req.municipio_propriedade,
        estado_propriedade = req.estado_propriedade,
        cobranca_rua = req.cobranca_rua,
        cobranca_bairro = req.cobranca_bairro,
        cobranca_numero = req.cobranca_numero,
        cobranca_municipio = req.cobranca_municipio,
        cobranca_cep = req.cobranca_cep,
        cobranca_telefone = req.cobranca_telefone,
        cobranca_email = req.cobranca_email,
        is_apartamento = req.is_apartamento,
        apartamento_info = req.apartamento_info,
        approval_notified = FALSE
  WHERE id = req.user_id;

  UPDATE public.account_requests
    SET status = 'approved',
        reviewed_by = _reviewer,
        reviewed_at = now()
  WHERE id = _request_id;
END;
$function$;
