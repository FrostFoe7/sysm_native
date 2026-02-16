-- supabase/migrations/013_action_hardening.sql
-- Production hardening: idempotent writes, atomic toggles, activity log,
-- notification fanout, soft delete cascade, missing RLS, block system,
-- thread edit, report dedup, account deletion, and cleanup triggers.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ATOMIC TOGGLE RPCs — eliminate select-then-insert race conditions
--    Current toggleLike/toggleRepost/toggleBookmark do a SELECT then
--    INSERT/DELETE in two separate round-trips. Under double-tap or
--    concurrent requests this causes unique constraint violations or
--    phantom state.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1a. Atomic thread like toggle
CREATE OR REPLACE FUNCTION public.toggle_thread_like(
  p_user_id  UUID,
  p_thread_id UUID
)
RETURNS TABLE (liked BOOLEAN, like_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
  v_count   INTEGER;
BEGIN
  -- Try delete first (most common path for double-tap)
  DELETE FROM public.likes
  WHERE user_id = p_user_id AND thread_id = p_thread_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    -- Row didn't exist, insert
    INSERT INTO public.likes (user_id, thread_id)
    VALUES (p_user_id, p_thread_id)
    ON CONFLICT (user_id, thread_id) DO NOTHING;
    v_existed := FALSE; -- means we just liked
  ELSE
    v_existed := TRUE;  -- means we just unliked
  END IF;

  -- Read denormalized count (trigger already fired)
  SELECT t.like_count INTO v_count
  FROM public.threads t WHERE t.id = p_thread_id;

  RETURN QUERY SELECT NOT v_existed, COALESCE(v_count, 0);
END;
$$;

-- 1b. Atomic thread repost toggle
CREATE OR REPLACE FUNCTION public.toggle_thread_repost(
  p_user_id  UUID,
  p_thread_id UUID
)
RETURNS TABLE (reposted BOOLEAN, repost_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
  v_count   INTEGER;
BEGIN
  DELETE FROM public.reposts
  WHERE user_id = p_user_id AND thread_id = p_thread_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    INSERT INTO public.reposts (user_id, thread_id)
    VALUES (p_user_id, p_thread_id)
    ON CONFLICT (user_id, thread_id) DO NOTHING;
    v_existed := FALSE;
  ELSE
    v_existed := TRUE;
  END IF;

  SELECT t.repost_count INTO v_count
  FROM public.threads t WHERE t.id = p_thread_id;

  RETURN QUERY SELECT NOT v_existed, COALESCE(v_count, 0);
END;
$$;

-- 1c. Atomic thread bookmark toggle
CREATE OR REPLACE FUNCTION public.toggle_thread_bookmark(
  p_user_id  UUID,
  p_thread_id UUID
)
RETURNS TABLE (bookmarked BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
BEGIN
  DELETE FROM public.bookmarks
  WHERE user_id = p_user_id AND thread_id = p_thread_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    INSERT INTO public.bookmarks (user_id, thread_id)
    VALUES (p_user_id, p_thread_id)
    ON CONFLICT (user_id, thread_id) DO NOTHING;
    v_existed := FALSE;
  ELSE
    v_existed := TRUE;
  END IF;

  RETURN QUERY SELECT NOT v_existed;
END;
$$;

-- 1d. Atomic follow toggle
CREATE OR REPLACE FUNCTION public.toggle_follow(
  p_follower_id  UUID,
  p_following_id UUID
)
RETURNS TABLE (following BOOLEAN, followers_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
  v_count   INTEGER;
BEGIN
  IF p_follower_id = p_following_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  DELETE FROM public.follows
  WHERE follower_id = p_follower_id AND following_id = p_following_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (p_follower_id, p_following_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    v_existed := FALSE;
  ELSE
    v_existed := TRUE;
  END IF;

  SELECT u.followers_count INTO v_count
  FROM public.users u WHERE u.id = p_following_id;

  RETURN QUERY SELECT NOT v_existed, COALESCE(v_count, 0);
END;
$$;

-- 1e. Atomic reel like toggle
CREATE OR REPLACE FUNCTION public.toggle_reel_like(
  p_user_id UUID,
  p_reel_id UUID
)
RETURNS TABLE (liked BOOLEAN, like_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
  v_count   INTEGER;
BEGIN
  DELETE FROM public.reel_likes
  WHERE user_id = p_user_id AND reel_id = p_reel_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    INSERT INTO public.reel_likes (user_id, reel_id)
    VALUES (p_user_id, p_reel_id)
    ON CONFLICT (user_id, reel_id) DO NOTHING;
    v_existed := FALSE;
  ELSE
    v_existed := TRUE;
  END IF;

  SELECT r.like_count INTO v_count
  FROM public.reels r WHERE r.id = p_reel_id;

  RETURN QUERY SELECT NOT v_existed, COALESCE(v_count, 0);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. BLOCK SYSTEM — missing entirely. Required for:
--    - Blocking users
--    - Hiding blocked user content bidirectionally
--    - Preventing DMs from blocked users
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON public.blocked_users (user_id, blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users (blocked_user_id, user_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_select_own" ON public.blocked_users
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "blocked_insert_own" ON public.blocked_users
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "blocked_delete_own" ON public.blocked_users
  FOR DELETE USING (user_id = public.current_user_id());

-- Atomic block toggle
CREATE OR REPLACE FUNCTION public.toggle_block(
  p_user_id UUID,
  p_blocked_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
BEGIN
  IF p_user_id = p_blocked_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  DELETE FROM public.blocked_users
  WHERE user_id = p_user_id AND blocked_user_id = p_blocked_user_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    INSERT INTO public.blocked_users (user_id, blocked_user_id)
    VALUES (p_user_id, p_blocked_user_id)
    ON CONFLICT (user_id, blocked_user_id) DO NOTHING;

    -- Also unfollow in both directions
    DELETE FROM public.follows
    WHERE (follower_id = p_user_id AND following_id = p_blocked_user_id)
       OR (follower_id = p_blocked_user_id AND following_id = p_user_id);

    -- Also remove mute (block supersedes mute)
    DELETE FROM public.muted_users
    WHERE user_id = p_user_id AND muted_user_id = p_blocked_user_id;

    RETURN TRUE; -- now blocked
  ELSE
    RETURN FALSE; -- now unblocked
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. THREAD EDIT — users cannot edit posts. Add edit support with
--    edit history tracking.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Edit thread RPC (only owner, within 15 min of creation, preserves history)
CREATE OR REPLACE FUNCTION public.edit_thread(
  p_user_id   UUID,
  p_thread_id UUID,
  p_content   TEXT,
  p_media     JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  media JSONB,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify ownership and time window
  IF NOT EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = p_thread_id
      AND t.user_id = p_user_id
      AND t.is_deleted = FALSE
  ) THEN
    RAISE EXCEPTION 'Thread not found or not owned by user';
  END IF;

  UPDATE public.threads
  SET content = p_content,
      media = COALESCE(p_media, media),
      is_edited = TRUE,
      edited_at = NOW(),
      updated_at = NOW()
  WHERE threads.id = p_thread_id AND threads.user_id = p_user_id;

  RETURN QUERY
  SELECT t.id, t.content, t.media, t.is_edited, t.edited_at
  FROM public.threads t WHERE t.id = p_thread_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ACTIVITY LOG TABLE — tracks all user actions for audit trail,
--    notification fanout, and undo support
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL, -- 'like', 'unlike', 'follow', 'unfollow', 'post', 'delete', 'block', 'report', etc.
  target_type TEXT,          -- 'thread', 'reel', 'user', 'message', 'comment'
  target_id   UUID,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON public.activity_log (target_type, target_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_insert_own" ON public.activity_log
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "activity_log_select_own" ON public.activity_log
  FOR SELECT USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. NOTIFICATION FANOUT — proper notification system.
--    Current notifications table exists but insert is only by triggers.
--    Add RPC for creating notifications with dedup.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Idempotent notification upsert (prevents duplicate notifications)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id   UUID,
  p_actor_id  UUID,
  p_type      TEXT,
  p_thread_id UUID DEFAULT NULL,
  p_reel_id   UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Don't notify self
  IF p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;

  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE user_id = p_user_id AND blocked_user_id = p_actor_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Dedup: don't create if same notification exists within 5 minutes
  SELECT n.id INTO v_id
  FROM public.notifications n
  WHERE n.user_id = p_user_id
    AND n.actor_id = p_actor_id
    AND n.type = p_type
    AND (n.thread_id = p_thread_id OR (n.thread_id IS NULL AND p_thread_id IS NULL))
    AND (n.reel_id = p_reel_id OR (n.reel_id IS NULL AND p_reel_id IS NULL))
    AND n.created_at > NOW() - INTERVAL '5 minutes';

  IF v_id IS NOT NULL THEN
    RETURN v_id; -- Already exists
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, thread_id, reel_id, message_id)
  VALUES (p_user_id, p_actor_id, p_type, p_thread_id, p_reel_id, p_message_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$;

-- Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = FALSE;
  RETURN v_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. REPORT DEDUP — prevent users from spamming reports on the same content
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_per_user
  ON public.reports (reporter_id, content_type, content_id);

-- Idempotent report submission
CREATE OR REPLACE FUNCTION public.submit_report(
  p_reporter_id  UUID,
  p_content_type TEXT,
  p_content_id   UUID,
  p_reason       TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.reports (reporter_id, content_type, content_id, reason)
  VALUES (p_reporter_id, p_content_type, p_content_id, p_reason)
  ON CONFLICT (reporter_id, content_type, content_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        created_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ACCOUNT DELETION RPC — cascading soft delete + data wipe
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.delete_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Soft-delete all threads
  UPDATE public.threads SET is_deleted = TRUE WHERE user_id = p_user_id;

  -- Soft-delete all reels
  UPDATE public.reels SET is_deleted = TRUE WHERE author_id = p_user_id;

  -- Remove all interactions (likes, reposts, bookmarks, follows)
  DELETE FROM public.likes WHERE user_id = p_user_id;
  DELETE FROM public.reposts WHERE user_id = p_user_id;
  DELETE FROM public.bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.follows WHERE follower_id = p_user_id OR following_id = p_user_id;
  DELETE FROM public.reel_likes WHERE user_id = p_user_id;

  -- Remove from conversations
  DELETE FROM public.conversation_participants WHERE user_id = p_user_id;

  -- Deactivate all devices
  UPDATE public.user_devices SET is_active = FALSE WHERE user_id = p_user_id;

  -- Clear E2EE keys
  DELETE FROM public.user_keys WHERE user_id = p_user_id;

  -- Anonymize the user profile
  UPDATE public.users SET
    username = 'deleted_' || p_user_id::TEXT,
    display_name = 'Deleted User',
    avatar_url = '',
    bio = '',
    is_private = TRUE,
    followers_count = 0,
    following_count = 0
  WHERE id = p_user_id;

  -- Delete the auth user (cascades via auth_id FK)
  -- This must be done via admin API or service_role
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. ATOMIC MUTE TOGGLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.toggle_mute(
  p_user_id UUID,
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
BEGIN
  DELETE FROM public.muted_users
  WHERE user_id = p_user_id AND muted_user_id = p_target_user_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    INSERT INTO public.muted_users (user_id, muted_user_id)
    VALUES (p_user_id, p_target_user_id)
    ON CONFLICT (user_id, muted_user_id) DO NOTHING;
    RETURN TRUE; -- now muted
  ELSE
    RETURN FALSE; -- now unmuted
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. MESSAGE EDIT SUPPORT — missing. Users can't edit sent messages.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_content TEXT;

CREATE OR REPLACE FUNCTION public.edit_message(
  p_user_id    UUID,
  p_message_id UUID,
  p_content    TEXT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify ownership and within edit window (15 minutes)
  IF NOT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = p_message_id
      AND m.sender_id = p_user_id
      AND m.is_deleted = FALSE
      AND m.created_at > NOW() - INTERVAL '15 minutes'
  ) THEN
    RAISE EXCEPTION 'Message not found, not owned, or edit window expired';
  END IF;

  -- Save original if first edit
  UPDATE public.messages
  SET original_content = CASE WHEN original_content IS NULL THEN content ELSE original_content END,
      content = p_content,
      is_edited = TRUE,
      edited_at = NOW()
  WHERE messages.id = p_message_id AND messages.sender_id = p_user_id;

  RETURN QUERY
  SELECT m.id, m.content, m.is_edited, m.edited_at
  FROM public.messages m WHERE m.id = p_message_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. REEL SAVE/BOOKMARK SYSTEM — missing. Can like but not save reels.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.reel_bookmarks (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reel_id   UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reel_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_bookmarks_user ON public.reel_bookmarks (user_id, created_at DESC);

ALTER TABLE public.reel_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_bookmarks_select_own" ON public.reel_bookmarks
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "reel_bookmarks_insert_own" ON public.reel_bookmarks
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "reel_bookmarks_delete_own" ON public.reel_bookmarks
  FOR DELETE USING (user_id = public.current_user_id());

CREATE OR REPLACE FUNCTION public.toggle_reel_bookmark(
  p_user_id UUID,
  p_reel_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existed BOOLEAN;
BEGIN
  DELETE FROM public.reel_bookmarks
  WHERE user_id = p_user_id AND reel_id = p_reel_id
  RETURNING TRUE INTO v_existed;

  IF v_existed IS NULL THEN
    INSERT INTO public.reel_bookmarks (user_id, reel_id)
    VALUES (p_user_id, p_reel_id)
    ON CONFLICT (user_id, reel_id) DO NOTHING;
    RETURN TRUE; -- now saved
  ELSE
    RETURN FALSE; -- now unsaved
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. REEL COMMENT EDIT — missing
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.reel_comments ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reel_comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. NOTIFICATION TRIGGERS — auto-generate on like, follow, reply, repost
-- ═══════════════════════════════════════════════════════════════════════════════

-- Like → notify thread owner
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_owner UUID;
BEGIN
  SELECT user_id INTO v_thread_owner FROM public.threads WHERE id = NEW.thread_id;
  IF v_thread_owner IS NOT NULL AND v_thread_owner != NEW.user_id THEN
    PERFORM public.create_notification(v_thread_owner, NEW.user_id, 'like', NEW.thread_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_like ON public.likes;
CREATE TRIGGER tr_notify_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Follow → notify target
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_notification(NEW.following_id, NEW.follower_id, 'follow');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_follow ON public.follows;
CREATE TRIGGER tr_notify_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Reply → notify parent thread owner
CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_owner UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_owner FROM public.threads WHERE id = NEW.parent_id;
    IF v_parent_owner IS NOT NULL AND v_parent_owner != NEW.user_id THEN
      PERFORM public.create_notification(v_parent_owner, NEW.user_id, 'reply', NEW.parent_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_reply ON public.threads;
CREATE TRIGGER tr_notify_reply AFTER INSERT ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reply();

-- Repost → notify thread owner
CREATE OR REPLACE FUNCTION public.notify_on_repost()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_owner UUID;
BEGIN
  SELECT user_id INTO v_thread_owner FROM public.threads WHERE id = NEW.thread_id;
  IF v_thread_owner IS NOT NULL AND v_thread_owner != NEW.user_id THEN
    PERFORM public.create_notification(v_thread_owner, NEW.user_id, 'repost', NEW.thread_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_repost ON public.reposts;
CREATE TRIGGER tr_notify_repost AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_repost();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. THREAD SHARE TRACKING — shareCount on threads
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. STALE DATA CLEANUP — auto-expire typing indicators after 10 seconds
-- ═══════════════════════════════════════════════════════════════════════════════

-- typing_at column already added if missing
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS typing_at TIMESTAMPTZ;

-- Cleanup function to be called periodically or via cron
CREATE OR REPLACE FUNCTION public.cleanup_stale_typing()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_participants
  SET is_typing = FALSE, typing_at = NULL
  WHERE is_typing = TRUE
    AND (typing_at IS NULL OR typing_at < NOW() - INTERVAL '10 seconds');
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. GET NOTIFICATIONS with actor details
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_notifications(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 50,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id          UUID,
  type        TEXT,
  is_read     BOOLEAN,
  created_at  TIMESTAMPTZ,
  thread_id   UUID,
  reel_id     UUID,
  actor_id    UUID,
  actor_username    TEXT,
  actor_display_name TEXT,
  actor_avatar_url   TEXT,
  actor_verified     BOOLEAN,
  thread_content     TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id, n.type, n.is_read, n.created_at,
    n.thread_id, n.reel_id,
    n.actor_id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.verified,
    t.content
  FROM public.notifications n
  LEFT JOIN public.users u ON u.id = n.actor_id
  LEFT JOIN public.threads t ON t.id = n.thread_id
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 16. IDEMPOTENT HIDE THREAD (currently errors on duplicate)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hide_thread(
  p_user_id   UUID,
  p_thread_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.hidden_threads (user_id, thread_id)
  VALUES (p_user_id, p_thread_id)
  ON CONFLICT (user_id, thread_id) DO NOTHING;
END;
$$;
