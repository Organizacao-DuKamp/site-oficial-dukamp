ALTER TYPE public.delivery_status ADD VALUE IF NOT EXISTS 'pronto';
ALTER TYPE public.delivery_status ADD VALUE IF NOT EXISTS 'cancelada';
ALTER TABLE public.orders
  ADD COLUMN fulfillment_method text NOT NULL DEFAULT 'delivery' CHECK (fulfillment_method IN ('delivery','pickup')),
  ADD COLUMN pickup_location text CHECK (pickup_location IN ('rio_preto','monte_aprazivel')),
  ADD COLUMN pickup_ready_at timestamptz,
  ADD COLUMN pickup_deadline_at timestamptz,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancelled_by uuid,
  ADD COLUMN cancellation_reason text,
  ADD COLUMN refund_status text NOT NULL DEFAULT 'none' CHECK (refund_status IN ('none','requested','refunded')),
  ADD COLUMN refund_requested_at timestamptz,
  ADD COLUMN refund_completed_at timestamptz,
  ADD COLUMN refund_completed_by uuid;
ALTER TABLE public.orders ADD CONSTRAINT pickup_has_no_freight CHECK (fulfillment_method <> 'pickup' OR shipping_cost = 0);

CREATE SCHEMA IF NOT EXISTS dukamp_private;
REVOKE ALL ON SCHEMA dukamp_private FROM PUBLIC, anon, authenticated;
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_name text,
  actor_email text,
  actor_ip inet,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id text,
  changed_fields text[] NOT NULL DEFAULT '{}',
  before_data jsonb,
  after_data jsonb,
  session_id uuid,
  source text NOT NULL DEFAULT 'database'
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC, id);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs(actor_id,created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_table,created_at DESC);
CREATE UNIQUE INDEX audit_logs_login_session_idx ON public.audit_logs(session_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT,INSERT ON public.audit_logs TO service_role;
CREATE POLICY "Admins read audit" ON public.audit_logs FOR SELECT TO authenticated
 USING ((SELECT public.has_role((SELECT auth.uid()),'admin')) OR (SELECT public.is_master_admin((SELECT auth.uid()))));

CREATE FUNCTION dukamp_private.redact_audit_data(data jsonb) RETURNS jsonb
 LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE result jsonb; k text; v jsonb;
BEGIN
 IF data IS NULL THEN RETURN NULL; END IF;
 IF jsonb_typeof(data)='object' THEN
   result := '{}';
   FOR k,v IN SELECT * FROM jsonb_each(data) LOOP
     result := result || jsonb_build_object(k,CASE WHEN k ~* '(password|senha|token|secret|api_key|service_role|qr_code|cpf_cnpj)'
       OR (k='value' AND coalesce(data->>'key','') ~* '(password|senha|token|secret|api_key)')
       THEN '"[protegido]"'::jsonb ELSE dukamp_private.redact_audit_data(v) END);
   END LOOP;
   RETURN result;
 ELSIF jsonb_typeof(data)='array' THEN
   SELECT coalesce(jsonb_agg(dukamp_private.redact_audit_data(value)), '[]') INTO result FROM jsonb_array_elements(data);
   RETURN result;
 END IF;
 RETURN data;
END; $$;
REVOKE ALL ON FUNCTION dukamp_private.redact_audit_data(jsonb) FROM PUBLIC;

-- Trigger-only privileged function: captures direct SQL and API writes, even
-- when the browser bypasses the application interface. No callable public RPC.
CREATE FUNCTION dukamp_private.capture_audit() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b jsonb; a jsonb; fields text[]; actor uuid; actor_ip inet;
 h jsonb := coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}');
 caller text := coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',current_setting('role',true));
 who_name text; who_email text;
BEGIN
 b := CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END;
 a := CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END;
 SELECT coalesce(array_agg(k ORDER BY k),'{}') INTO fields FROM
   (SELECT jsonb_object_keys(coalesce(b,'{}')||coalesce(a,'{}')) k) keys
   WHERE (b->k) IS DISTINCT FROM (a->k) AND k NOT IN ('updated_at');
 IF TG_OP='UPDATE' AND cardinality(fields)=0 THEN RETURN NEW; END IF;
 actor := auth.uid();
 IF caller='service_role' THEN
   BEGIN actor := nullif(h->>'x-dukamp-actor-id','')::uuid; EXCEPTION WHEN invalid_text_representation THEN actor:=NULL; END;
   BEGIN actor_ip := nullif(h->>'x-dukamp-actor-ip','')::inet; EXCEPTION WHEN invalid_text_representation THEN actor_ip:=NULL; END;
 END IF;
 IF actor IS NOT NULL THEN
   SELECT full_name,email INTO who_name,who_email FROM public.profiles WHERE id=actor;
 END IF;
 INSERT INTO public.audit_logs(actor_id,actor_name,actor_email,actor_ip,action,entity_table,entity_id,changed_fields,before_data,after_data,source)
 VALUES(actor,who_name,who_email,actor_ip,lower(TG_OP),TG_TABLE_NAME,
   coalesce(a->>'id',b->>'id',a->>'key',b->>'key'),fields,
   dukamp_private.redact_audit_data(b),dukamp_private.redact_audit_data(a),
   CASE WHEN actor IS NULL THEN 'system' ELSE 'database' END);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
REVOKE ALL ON FUNCTION dukamp_private.capture_audit() FROM PUBLIC;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('audit_logs') LOOP
   EXECUTE format('CREATE TRIGGER dukamp_audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION dukamp_private.capture_audit()',t.tablename);
 END LOOP;
END; $$;

CREATE FUNCTION dukamp_private.enforce_fulfillment() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
 -- The old owner UPDATE policy is needed for delivery notices. It must not
 -- permit changing payment, stock, delivery state, ownership or totals.
 IF TG_OP='UPDATE' AND current_setting('role',true)='authenticated'
    AND NOT public.has_role(actor,'admin') AND NOT public.is_master_admin(actor) THEN
   IF (to_jsonb(NEW)-ARRAY['delivery_notified','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['delivery_notified','updated_at']) THEN
     RAISE EXCEPTION 'Order changes require the authorized order endpoint';
   END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.refund_status='refunded' THEN NEW.payment_status:='refunded'::public.payment_status; END IF;
 IF NEW.fulfillment_method='pickup' THEN
   NEW.shipping_cost:=0;
   NEW.shipping_service:='Retirar na loja';
   NEW.shipping_deadline_days:=0;
   IF NEW.delivery_status::text='a_caminho' THEN RAISE EXCEPTION 'Pickup orders cannot be shipped'; END IF;
   IF NEW.delivery_status::text='pronto' THEN
     IF NEW.payment_status::text<>'approved' THEN RAISE EXCEPTION 'Payment must be approved before pickup is ready'; END IF;
     IF NEW.pickup_location IS NULL THEN RAISE EXCEPTION 'Choose the pickup store'; END IF;
     IF TG_OP='INSERT' OR OLD.delivery_status::text<>'pronto' THEN
       -- Calendar days in Brazil: ready on the 5th means pickup through the 12th.
       NEW.pickup_ready_at:=now();
       NEW.pickup_deadline_at:=(((now() AT TIME ZONE 'America/Sao_Paulo')::date+8)::timestamp AT TIME ZONE 'America/Sao_Paulo')-interval '1 millisecond';
     ELSE NEW.pickup_ready_at:=OLD.pickup_ready_at; NEW.pickup_deadline_at:=OLD.pickup_deadline_at;
     END IF;
   ELSIF NEW.delivery_status::text='preparando' THEN
     NEW.pickup_ready_at:=NULL; NEW.pickup_deadline_at:=NULL;
   END IF;
 ELSIF NEW.delivery_status::text='pronto' THEN RAISE EXCEPTION 'Ready is only for store pickup';
 END IF;
 IF NEW.delivery_status::text='entregue' THEN
   IF TG_OP='INSERT' OR OLD.delivery_status::text<>'entregue' THEN NEW.delivered_at:=now(); NEW.delivery_notified:=false; END IF;
 ELSE NEW.delivered_at:=NULL; NEW.delivery_notified:=false;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION dukamp_private.enforce_fulfillment() FROM PUBLIC;
CREATE TRIGGER dukamp_order_fulfillment BEFORE INSERT OR UPDATE ON public.orders
 FOR EACH ROW EXECUTE FUNCTION dukamp_private.enforce_fulfillment();

-- Service-only transaction. The server validates the token before providing
-- actor identity. The row lock serializes cancellations and administration.
CREATE FUNCTION public.manage_order_fulfillment(
 p_order_id uuid,p_actor_id uuid,p_action text,p_status text DEFAULT NULL,
 p_pickup_location text DEFAULT NULL,p_reason text DEFAULT NULL,p_request_refund boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; admin boolean; BEGIN
 IF p_actor_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 admin:= public.has_role(p_actor_id,'admin') OR public.is_master_admin(p_actor_id);
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF NOT admin AND o.user_id IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF p_action='cancel' THEN
   IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Provide a cancellation reason'; END IF;
   IF o.refund_status='refunded' THEN RAISE EXCEPTION 'Order already refunded'; END IF;
   IF NOT admin AND o.delivery_status::text='entregue' AND NOT p_request_refund THEN RAISE EXCEPTION 'For a delivered order, request a refund'; END IF;
   IF p_request_refund AND o.payment_status::text<>'approved' THEN RAISE EXCEPTION 'Refund requires a confirmed payment'; END IF;
   UPDATE public.orders SET delivery_status='cancelada'::public.delivery_status,cancelled_at=coalesce(cancelled_at,now()),
     cancelled_by=p_actor_id,cancellation_reason=trim(p_reason),
     refund_status=CASE WHEN p_request_refund THEN 'requested' ELSE refund_status END,
     refund_requested_at=CASE WHEN p_request_refund THEN coalesce(refund_requested_at,now()) ELSE refund_requested_at END
    WHERE id=p_order_id;
 ELSIF p_action='status' THEN
   IF NOT admin THEN RAISE EXCEPTION 'Admin required'; END IF;
   IF p_status NOT IN ('preparando','pronto','a_caminho','entregue') OR p_status IS NULL THEN RAISE EXCEPTION 'Invalid status'; END IF;
   IF o.refund_status<>'none' THEN RAISE EXCEPTION 'Resolve the refund before resuming delivery'; END IF;
   UPDATE public.orders SET delivery_status=p_status::public.delivery_status,
     pickup_location=coalesce(p_pickup_location,pickup_location),
     cancelled_at=NULL,cancelled_by=NULL,cancellation_reason=NULL WHERE id=p_order_id;
 ELSIF p_action='location' THEN
   IF NOT admin OR o.fulfillment_method<>'pickup' THEN RAISE EXCEPTION 'Admin pickup order required'; END IF;
   IF p_pickup_location NOT IN ('rio_preto','monte_aprazivel') OR p_pickup_location IS NULL THEN RAISE EXCEPTION 'Invalid pickup store'; END IF;
   UPDATE public.orders SET pickup_location=p_pickup_location WHERE id=p_order_id;
 ELSIF p_action='refunded' THEN
   IF NOT admin OR o.refund_status<>'requested' THEN RAISE EXCEPTION 'Requested refund and admin required'; END IF;
   UPDATE public.orders SET refund_status='refunded',refund_completed_at=now(),refund_completed_by=p_actor_id,
     payment_status='refunded'::public.payment_status,delivery_status='cancelada'::public.delivery_status WHERE id=p_order_id;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 RETURN jsonb_build_object('ok',true,'delivery_status',o.delivery_status,'refund_status',o.refund_status);
END; $$;
REVOKE ALL ON FUNCTION public.manage_order_fulfillment(uuid,uuid,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_order_fulfillment(uuid,uuid,text,text,text,text,boolean) TO service_role;
