-- Isolated, service-only integration. No ERP order, product, price or stock triggers.
CREATE TABLE public.mercado_livre_connections (
  account_id text PRIMARY KEY CHECK (account_id ~ '^[1-9][0-9]{0,19}$'),
  application_id text NOT NULL CHECK (application_id ~ '^[1-9][0-9]{0,19}$'),
  nickname text NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','reconnect_required','disconnected')),
  access_ciphertext text, refresh_ciphertext text,
  expires_at timestamptz NOT NULL,
  scopes text NOT NULL DEFAULT '',
  token_version integer NOT NULL DEFAULT 1,
  refresh_lease uuid, refresh_started_at timestamptz,
  connected_by uuid NOT NULL, connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), last_error text
);
CREATE TABLE public.mercado_livre_oauth_states (
  state_hash text PRIMARY KEY, browser_hash text NOT NULL,
  initiated_by uuid NOT NULL, verifier_ciphertext text NOT NULL, redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mercado_livre_oauth_expiry ON public.mercado_livre_oauth_states(expires_at);
CREATE TABLE public.mercado_livre_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE,
  account_id text NOT NULL REFERENCES public.mercado_livre_connections(account_id),
  application_id text NOT NULL, topic text NOT NULL, resource text NOT NULL,
  notification_id text, received_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','retry','done','dead','ignored')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(), lease uuid, lease_until timestamptz,
  last_error text, snapshot_ciphertext text, snapshot_hash text,
  created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE INDEX mercado_livre_events_due ON public.mercado_livre_events(available_at,created_at) WHERE status IN ('pending','retry','processing');
CREATE INDEX mercado_livre_events_account ON public.mercado_livre_events(account_id);
CREATE TABLE public.mercado_livre_rate_limits (
  key text NOT NULL, bucket timestamptz NOT NULL, hits integer NOT NULL,
  PRIMARY KEY(key,bucket)
);
CREATE TABLE public.mercado_livre_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid,
  action text NOT NULL, account_id text, created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mercado_livre_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_livre_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_livre_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_livre_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_livre_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mercado_livre_connections, public.mercado_livre_oauth_states, public.mercado_livre_events, public.mercado_livre_rate_limits, public.mercado_livre_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.mercado_livre_connections, public.mercado_livre_oauth_states, public.mercado_livre_events, public.mercado_livre_rate_limits, public.mercado_livre_audit TO service_role;

-- All RPCs are SECURITY INVOKER and callable only by service_role.
CREATE FUNCTION public.mercado_livre_limit(p_key text, p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_hits integer;
BEGIN
  IF length(p_key) > 100 OR p_limit < 1 OR p_limit > 1000 THEN RAISE EXCEPTION 'invalid limit'; END IF;
  INSERT INTO public.mercado_livre_rate_limits(key,bucket,hits) VALUES(p_key,date_trunc('minute',now()),1)
  ON CONFLICT(key,bucket) DO UPDATE SET hits=public.mercado_livre_rate_limits.hits+1 RETURNING hits INTO v_hits;
  RETURN v_hits <= p_limit;
END $$;

CREATE FUNCTION public.mercado_livre_save_connection(p_account_id text,p_application_id text,p_nickname text,p_access text,p_refresh text,p_expires_at timestamptz,p_scopes text,p_actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.mercado_livre_connections(account_id,application_id,nickname,access_ciphertext,refresh_ciphertext,expires_at,scopes,connected_by)
  VALUES(p_account_id,p_application_id,p_nickname,p_access,p_refresh,p_expires_at,p_scopes,p_actor)
  ON CONFLICT(account_id) DO UPDATE SET application_id=excluded.application_id,nickname=excluded.nickname,
    access_ciphertext=excluded.access_ciphertext,refresh_ciphertext=excluded.refresh_ciphertext,expires_at=excluded.expires_at,
    scopes=excluded.scopes,connected_by=p_actor,connected_at=now(),updated_at=now(),status='connected',last_error=NULL,
    token_version=public.mercado_livre_connections.token_version+1,refresh_lease=NULL,refresh_started_at=NULL;
  INSERT INTO public.mercado_livre_audit(actor_id,action,account_id) VALUES(p_actor,'connect',p_account_id);
END $$;

CREATE FUNCTION public.mercado_livre_disconnect(p_account_id text,p_actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.mercado_livre_connections SET status='disconnected',access_ciphertext=NULL,refresh_ciphertext=NULL,
    refresh_lease=NULL,refresh_started_at=NULL,token_version=token_version+1,updated_at=now() WHERE account_id=p_account_id;
  UPDATE public.mercado_livre_events SET status='ignored',lease=NULL,lease_until=NULL,last_error='account_disconnected'
    WHERE account_id=p_account_id AND status IN ('pending','retry','processing');
  INSERT INTO public.mercado_livre_audit(actor_id,action,account_id) VALUES(p_actor,'disconnect',p_account_id);
END $$;

CREATE FUNCTION public.mercado_livre_enqueue(p_event_key text,p_account_id text,p_application_id text,p_topic text,p_resource text,p_notification_id text,p_received_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.mercado_livre_connections WHERE account_id=p_account_id AND application_id=p_application_id AND status IN ('connected','reconnect_required')) THEN RETURN 'ignored'; END IF;
  IF EXISTS(SELECT 1 FROM public.mercado_livre_events WHERE event_key=p_event_key) THEN RETURN 'duplicate'; END IF;
  IF NOT public.mercado_livre_limit('webhook:'||p_account_id,600) THEN RETURN 'limited'; END IF;
  INSERT INTO public.mercado_livre_events(event_key,account_id,application_id,topic,resource,notification_id,received_at)
    VALUES(p_event_key,p_account_id,p_application_id,p_topic,p_resource,p_notification_id,p_received_at) ON CONFLICT(event_key) DO NOTHING;
  RETURN 'queued';
END $$;

CREATE FUNCTION public.mercado_livre_lock_refresh(p_account_id text,p_version integer,p_lease uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.mercado_livre_connections SET refresh_lease=p_lease,refresh_started_at=now()
    WHERE account_id=p_account_id AND token_version=p_version AND status='connected' AND refresh_lease IS NULL;
  RETURN FOUND;
END $$;

CREATE FUNCTION public.mercado_livre_claim_events(p_limit integer DEFAULT 3)
RETURNS SETOF public.mercado_livre_events LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  WITH due AS (
    SELECT e.id FROM public.mercado_livre_events e
    JOIN public.mercado_livre_connections c ON c.account_id=e.account_id AND c.application_id=e.application_id AND c.status='connected'
    WHERE ((e.status IN ('pending','retry') AND e.available_at <= now()) OR (e.status='processing' AND e.lease_until < now()))
      AND e.attempts < 8
    ORDER BY e.created_at FOR UPDATE OF e SKIP LOCKED LIMIT greatest(1,least(p_limit,5))
  ) UPDATE public.mercado_livre_events e SET status='processing',attempts=e.attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '2 minutes'
    FROM due WHERE e.id=due.id RETURNING e.*;
$$;

CREATE FUNCTION public.mercado_livre_maintenance()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.mercado_livre_oauth_states WHERE expires_at < now();
  DELETE FROM public.mercado_livre_rate_limits WHERE bucket < now()-interval '2 hours';
  DELETE FROM public.mercado_livre_events WHERE created_at < now()-interval '30 days' AND status IN ('done','dead','ignored');
  DELETE FROM public.mercado_livre_audit WHERE created_at < now()-interval '180 days';
  UPDATE public.mercado_livre_connections SET status='reconnect_required',last_error='refresh_result_unknown',refresh_lease=NULL,refresh_started_at=NULL,updated_at=now()
    WHERE refresh_lease IS NOT NULL AND refresh_started_at < now()-interval '2 minutes';
  UPDATE public.mercado_livre_events SET status='dead',last_error='attempts_exhausted',lease=NULL,lease_until=NULL
    WHERE status='processing' AND lease_until < now() AND attempts >= 8;
END $$;

REVOKE EXECUTE ON FUNCTION public.mercado_livre_limit(text,integer),public.mercado_livre_save_connection(text,text,text,text,text,timestamptz,text,uuid),public.mercado_livre_disconnect(text,uuid),public.mercado_livre_enqueue(text,text,text,text,text,text,timestamptz),public.mercado_livre_lock_refresh(text,integer,uuid),public.mercado_livre_claim_events(integer),public.mercado_livre_maintenance() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mercado_livre_limit(text,integer),public.mercado_livre_save_connection(text,text,text,text,text,timestamptz,text,uuid),public.mercado_livre_disconnect(text,uuid),public.mercado_livre_enqueue(text,text,text,text,text,text,timestamptz),public.mercado_livre_lock_refresh(text,integer,uuid),public.mercado_livre_claim_events(integer),public.mercado_livre_maintenance() TO service_role;
