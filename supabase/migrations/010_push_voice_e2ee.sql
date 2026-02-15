-- supabase/migrations/010_push_voice_e2ee.sql
-- Push notifications, voice notes, and E2EE support

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. USER DEVICES — push notification token storage
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_devices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform       TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX idx_user_devices_user ON public.user_devices(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_devices_token ON public.user_devices(expo_push_token);

-- RLS policies
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_select_own" ON public.user_devices
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "devices_insert_own" ON public.user_devices
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "devices_update_own" ON public.user_devices
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "devices_delete_own" ON public.user_devices
  FOR DELETE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Service role can read all devices (for edge function push delivery)
CREATE POLICY "devices_select_service" ON public.user_devices
  FOR SELECT USING (auth.role() = 'service_role');

-- Enable realtime for user_devices (last_seen_at tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_devices;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. VOICE NOTE COLUMNS on messages table
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_ms INTEGER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CHAT-AUDIO storage bucket
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-audio', 'chat-audio', FALSE, 10485760, -- 10 MB
  ARRAY['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-audio
CREATE POLICY "chat_audio_select_participant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-audio'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = ((storage.foldername(name))[1])::uuid
        AND cp.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "chat_audio_insert_participant" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-audio'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = ((storage.foldername(name))[1])::uuid
        AND cp.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "chat_audio_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-audio'
    AND (storage.foldername(name))[2] = (SELECT id::text FROM public.users WHERE auth_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. E2EE KEY MANAGEMENT — user_keys + conversation_keys
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  public_key     TEXT NOT NULL,          -- base64-encoded public key (X25519 or RSA-OAEP)
  key_version    INTEGER NOT NULL DEFAULT 1,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_version)
);

CREATE INDEX idx_user_keys_user_active ON public.user_keys(user_id) WHERE is_active = TRUE;

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read public keys
CREATE POLICY "user_keys_select_authenticated" ON public.user_keys
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users insert their own key
CREATE POLICY "user_keys_insert_own" ON public.user_keys
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users update (deactivate) their own keys
CREATE POLICY "user_keys_update_own" ON public.user_keys
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Conversation-level encryption keys (for group chats)
CREATE TABLE IF NOT EXISTS public.conversation_keys (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  encrypted_key     TEXT NOT NULL,       -- symmetric key encrypted with user's public key
  key_version       INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id, key_version)
);

CREATE INDEX idx_conv_keys_conv_user ON public.conversation_keys(conversation_id, user_id);

ALTER TABLE public.conversation_keys ENABLE ROW LEVEL SECURITY;

-- Participants can read their own encrypted keys
CREATE POLICY "conv_keys_select_own" ON public.conversation_keys
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Admins can insert keys for any participant in their conversation
CREATE POLICY "conv_keys_insert_admin" ON public.conversation_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_keys.conversation_id
        AND cp.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        AND cp.role = 'admin'
    )
  );

-- Admins can update (rotate) keys
CREATE POLICY "conv_keys_update_admin" ON public.conversation_keys
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_keys.conversation_id
        AND cp.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        AND cp.role = 'admin'
    )
  );

-- E2EE columns on messages (encrypted_content replaces plaintext content)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT,     -- encrypted message body
  ADD COLUMN IF NOT EXISTS encrypted_key     TEXT,     -- per-message symmetric key, encrypted with recipient public key
  ADD COLUMN IF NOT EXISTS key_version       INTEGER,  -- which key version was used
  ADD COLUMN IF NOT EXISTS is_encrypted      BOOLEAN NOT NULL DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. PUSH NOTIFICATION TRACKING — prevent duplicates
-- ═══════════════════════════════════════════════════════════════════════════════

-- RPC to get push targets for a message (all participants except sender, not muted)
CREATE OR REPLACE FUNCTION public.get_push_targets(
  p_conversation_id UUID,
  p_sender_id UUID
)
RETURNS TABLE (
  user_id UUID,
  expo_push_token TEXT,
  platform TEXT,
  display_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cp.user_id,
    ud.expo_push_token,
    ud.platform,
    u.display_name
  FROM public.conversation_participants cp
  JOIN public.user_devices ud ON ud.user_id = cp.user_id AND ud.is_active = TRUE
  JOIN public.users u ON u.id = cp.user_id
  WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id != p_sender_id
    AND COALESCE(cp.is_muted, FALSE) = FALSE
  -- exclude blocked users (if block table exists, add join here)
$$;

-- RPC to get sender info for push payload
CREATE OR REPLACE FUNCTION public.get_sender_info(p_user_id UUID)
RETURNS TABLE (display_name TEXT, avatar_url TEXT, username TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT u.display_name, u.avatar_url, u.username
  FROM public.users u WHERE u.id = p_user_id;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. RPC: upsert device token (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.upsert_device_token(
  p_user_id UUID,
  p_expo_push_token TEXT,
  p_platform TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.user_devices (user_id, expo_push_token, platform, last_seen_at)
  VALUES (p_user_id, p_expo_push_token, p_platform, now())
  ON CONFLICT (user_id, expo_push_token)
  DO UPDATE SET
    last_seen_at = now(),
    is_active = TRUE,
    platform = p_platform
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RPC: deactivate device (logout / revoke)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.deactivate_device(
  p_user_id UUID,
  p_expo_push_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_devices
  SET is_active = FALSE
  WHERE user_id = p_user_id AND expo_push_token = p_expo_push_token;
END;
$$;
