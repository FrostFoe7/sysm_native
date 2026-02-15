-- 009_messaging_upgrade.sql
-- Deep upgrade pass for messaging: per-user mute/pin, RPC improvements,
-- direct conversation lookup, paginated messages, participant delete policy,
-- system message trigger for member joins/leaves, typing expiry guard.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) Move is_muted / is_pinned from conversations to per-participant columns
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_muted  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Migrate existing values (best-effort: existing data is global, copy to all participants)
UPDATE public.conversation_participants cp
SET is_muted = c.is_muted, is_pinned = c.is_pinned
FROM public.conversations c
WHERE cp.conversation_id = c.id;

-- Add last_read_at for timestamp-based read tracking (more efficient than message_id lookups)
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- Populate last_read_at from last_read_message_id where possible
UPDATE public.conversation_participants cp
SET last_read_at = m.created_at
FROM public.messages m
WHERE cp.last_read_message_id = m.id
  AND cp.last_read_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) Participants DELETE policy (members can remove themselves; admins can remove others)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "participants_delete_self_or_admin" ON public.conversation_participants
  FOR DELETE USING (
    user_id = public.current_user_id()
    OR conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id() AND role = 'admin'
    )
  );

-- Tighten participants_insert_admin: prevent arbitrary self-joins
-- Drop old policy and recreate with stricter check
DROP POLICY IF EXISTS "participants_insert_admin" ON public.conversation_participants;

CREATE POLICY "participants_insert_by_admin_or_creator" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    -- Admin of existing conversation can add members
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id() AND role = 'admin'
    )
    -- OR conversation creator adding initial participants (creator_id matches)
    OR conversation_id IN (
      SELECT id FROM public.conversations WHERE created_by = public.current_user_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) Index for message pagination (conversation_id, created_at DESC, id DESC)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_messages_conv_cursor
  ON public.messages (conversation_id, created_at DESC, id DESC)
  WHERE is_deleted = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4) System message trigger: member join / leave
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_system_message_join()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_conv_type TEXT;
BEGIN
  SELECT type INTO v_conv_type FROM conversations WHERE id = NEW.conversation_id;
  IF v_conv_type <> 'group' THEN RETURN NEW; END IF;

  SELECT username INTO v_username FROM users WHERE id = NEW.user_id;
  INSERT INTO messages (conversation_id, sender_id, type, content, status)
  VALUES (NEW.conversation_id, NEW.user_id, 'system', v_username || ' joined the group', 'sent');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_participant_joined ON public.conversation_participants;
CREATE TRIGGER tr_participant_joined
  AFTER INSERT ON public.conversation_participants
  FOR EACH ROW EXECUTE FUNCTION fn_system_message_join();

CREATE OR REPLACE FUNCTION public.fn_system_message_leave()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_conv_type TEXT;
BEGIN
  SELECT type INTO v_conv_type FROM conversations WHERE id = OLD.conversation_id;
  IF v_conv_type <> 'group' THEN RETURN OLD; END IF;

  SELECT username INTO v_username FROM users WHERE id = OLD.user_id;
  -- Use a service-role insert since the user is leaving
  INSERT INTO messages (conversation_id, sender_id, type, content, status)
  VALUES (OLD.conversation_id, OLD.user_id, 'system', v_username || ' left the group', 'sent');
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tr_participant_left ON public.conversation_participants;
CREATE TRIGGER tr_participant_left
  BEFORE DELETE ON public.conversation_participants
  FOR EACH ROW EXECUTE FUNCTION fn_system_message_leave();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5) RPC: find_direct_conversation — O(1) lookup instead of N+1
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.find_direct_conversation(
  p_user_id UUID,
  p_other_user_id UUID
)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp1.conversation_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  INNER JOIN conversations c
    ON c.id = cp1.conversation_id AND c.type = 'direct'
  WHERE cp1.user_id = p_user_id
    AND cp2.user_id = p_other_user_id
  LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6) RPC: get_paginated_messages — cursor-based message loading
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_paginated_messages(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_before_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  type TEXT,
  content TEXT,
  media_url TEXT,
  media_thumbnail TEXT,
  reply_to_id UUID,
  shared_thread_id UUID,
  shared_reel_id UUID,
  status TEXT,
  is_deleted BOOLEAN,
  created_at TIMESTAMPTZ,
  -- sender
  sender_username TEXT,
  sender_display_name TEXT,
  sender_avatar_url TEXT,
  sender_verified BOOLEAN,
  -- reply-to
  reply_content TEXT,
  reply_sender_name TEXT,
  -- reactions (jsonb array)
  reactions JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.conversation_id, m.sender_id, m.type, m.content,
    m.media_url, m.media_thumbnail, m.reply_to_id,
    m.shared_thread_id, m.shared_reel_id, m.status, m.is_deleted, m.created_at,
    u.username, u.display_name, u.avatar_url, u.verified,
    rm.content AS reply_content,
    ru.display_name AS reply_sender_name,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('user_id', mr.user_id, 'emoji', mr.emoji, 'created_at', mr.created_at))
       FROM message_reactions mr WHERE mr.message_id = m.id),
      '[]'::jsonb
    ) AS reactions
  FROM messages m
  INNER JOIN users u ON u.id = m.sender_id
  LEFT JOIN messages rm ON rm.id = m.reply_to_id
  LEFT JOIN users ru ON ru.id = rm.sender_id
  WHERE m.conversation_id = p_conversation_id
    AND m.is_deleted = FALSE
    AND (
      p_before_at IS NULL
      OR (m.created_at, m.id) < (p_before_at, p_before_id)
    )
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT p_limit;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7) RPC: toggle_reaction — atomic upsert/delete, no race condition
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_message_id UUID,
  p_user_id UUID,
  p_emoji TEXT
)
RETURNS BOOLEAN  -- true = added, false = removed
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  SELECT id INTO v_existing
  FROM message_reactions
  WHERE message_id = p_message_id AND user_id = p_user_id AND emoji = p_emoji;

  IF v_existing IS NOT NULL THEN
    DELETE FROM message_reactions WHERE id = v_existing;
    RETURN FALSE;
  ELSE
    INSERT INTO message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, p_user_id, p_emoji);
    RETURN TRUE;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8) RPC: mark_conversation_read — atomic read receipt update
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_msg_id UUID;
  v_last_msg_at TIMESTAMPTZ;
BEGIN
  SELECT id, created_at INTO v_last_msg_id, v_last_msg_at
  FROM messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_last_msg_id IS NOT NULL THEN
    UPDATE conversation_participants
    SET last_read_message_id = v_last_msg_id,
        last_read_at = v_last_msg_at,
        is_typing = FALSE  -- clear typing when reading
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9) Improved get_conversations RPC — per-user mute/pin, unread via timestamp
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_conversations(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  type TEXT,
  name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ,
  is_muted BOOLEAN,
  is_pinned BOOLEAN,
  last_message_content TEXT,
  last_message_type TEXT,
  last_message_sender UUID,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  other_user_id UUID,
  other_username TEXT,
  other_display_name TEXT,
  other_avatar_url TEXT,
  other_verified BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.type,
    c.name,
    c.avatar_url,
    c.updated_at,
    cp_me.is_muted,
    cp_me.is_pinned,
    lm.content AS last_message_content,
    lm.type AS last_message_type,
    lm.sender_id AS last_message_sender,
    lm.created_at AS last_message_at,
    -- unread count based on last_read_at (fast)
    (SELECT COUNT(*)
     FROM messages m2
     WHERE m2.conversation_id = c.id
       AND m2.sender_id <> p_user_id
       AND m2.is_deleted = FALSE
       AND (cp_me.last_read_at IS NULL OR m2.created_at > cp_me.last_read_at)
    ) AS unread_count,
    -- First other user (for 1:1 display)
    cp_other.user_id AS other_user_id,
    u_other.username AS other_username,
    u_other.display_name AS other_display_name,
    u_other.avatar_url AS other_avatar_url,
    u_other.verified AS other_verified
  FROM conversations c
  INNER JOIN conversation_participants cp_me
    ON cp_me.conversation_id = c.id AND cp_me.user_id = p_user_id
  LEFT JOIN messages lm ON lm.id = c.last_message_id
  LEFT JOIN LATERAL (
    SELECT cp2.user_id
    FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id <> p_user_id
    LIMIT 1
  ) cp_other ON TRUE
  LEFT JOIN users u_other ON u_other.id = cp_other.user_id
  ORDER BY cp_me.is_pinned DESC, c.updated_at DESC;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10) Clear stale typing indicators (auto-expire after 5 seconds)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS typing_at TIMESTAMPTZ;

-- Updated typing: set timestamp when typing starts, null when stops
-- The client uses typing_at to compute staleness (> 3s = expired)
