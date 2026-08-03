-- Ensure databases created before seller accounts can associate an auth user
-- with the corresponding public seller record. This is intentionally a new,
-- uniquely-versioned migration so it also repairs environments where one of
-- the older seller migrations was not recorded/applied.
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS show_on_team BOOLEAN NOT NULL DEFAULT TRUE;

-- PostgREST may otherwise keep serving its previous view of the table briefly.
NOTIFY pgrst, 'reload schema';
