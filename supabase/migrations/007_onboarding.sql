-- ═══════════════════════════════════════════════════════════════════════════════
-- 007 — Onboarding schema additions
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add onboarding state columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_onboarded        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interests           TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS website             TEXT    DEFAULT '';

-- Index to quickly find incomplete onboarding profiles
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON public.users (is_onboarded) WHERE is_onboarded = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS for onboarding columns
-- ═══════════════════════════════════════════════════════════════════════════════

-- Users can update their own onboarding state (existing UPDATE policy covers this)
-- Storage policies (avatars bucket) should be configured through Supabase dashboard

-- ═══════════════════════════════════════════════════════════════════════════════
-- Function: Auto-create profile on auth signup (trigger)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, username, display_name, avatar_url, bio, is_onboarded, onboarding_step)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    '',
    '',
    FALSE,
    0
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════════
-- Check username availability RPC
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users WHERE lower(username) = lower(p_username)
  );
END;
$$;
