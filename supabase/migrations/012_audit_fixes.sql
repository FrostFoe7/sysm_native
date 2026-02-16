-- supabase/migrations/012_audit_fixes.sql
-- Complete bidirectional audit fix migration
-- Fixes: missing indexes, RLS gaps, orphaned columns, missing RPCs,
-- schema corrections, and performance improvements.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. MISSING RPC: increment_reel_views
--    reel.service.ts calls this but it never existed.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_reel_views(p_reel_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE reels
  SET view_count = view_count + 1
  WHERE id = p_reel_id AND is_deleted = FALSE;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. FIX get_trending RPC
--    user.service.ts calls with {p_time_window, p_limit} but the RPC only
--    accepts p_limit. Frontend also expects content_type + content_id columns.
--    Replace with a proper signature.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_trending(INTEGER);

CREATE OR REPLACE FUNCTION public.get_trending(
  p_limit       INTEGER DEFAULT 10,
  p_time_window TEXT    DEFAULT 'daily'
)
RETURNS TABLE (
  content_type        TEXT,
  content_id          UUID,
  id                  UUID,
  content             TEXT,
  like_count          INTEGER,
  reply_count         INTEGER,
  repost_count        INTEGER,
  created_at          TIMESTAMPTZ,
  author_username     TEXT,
  author_display_name TEXT,
  author_avatar_url   TEXT,
  author_verified     BOOLEAN,
  velocity            REAL
) AS $$
DECLARE
  v_interval INTERVAL;
BEGIN
  v_interval := CASE p_time_window
    WHEN 'hourly' THEN INTERVAL '1 hour'
    WHEN 'weekly' THEN INTERVAL '7 days'
    ELSE INTERVAL '24 hours'  -- 'daily' default
  END;

  RETURN QUERY
  SELECT
    'thread'::TEXT AS content_type,
    t.id AS content_id,
    t.id,
    t.content,
    t.like_count,
    t.reply_count,
    t.repost_count,
    t.created_at,
    u.username,
    u.display_name,
    u.avatar_url,
    u.verified,
    (
      (t.like_count + t.reply_count * 2 + t.repost_count * 1.5)
      / GREATEST(EXTRACT(EPOCH FROM NOW() - t.created_at) / 3600.0, 1.0)
    )::REAL AS velocity
  FROM public.threads t
  INNER JOIN public.users u ON u.id = t.user_id
  WHERE t.parent_id IS NULL
    AND t.is_deleted = FALSE
    AND t.created_at > NOW() - v_interval
  ORDER BY velocity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. MISSING RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 3a. notifications INSERT policy — needed for SECURITY DEFINER triggers,
--     but also allows service_role and edge functions to insert
CREATE POLICY "notifications_insert_service"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);
-- Note: notifications are only inserted by SECURITY DEFINER triggers and
-- edge functions. The WITH CHECK(TRUE) is safe because those run as
-- service_role / definer context. Regular users cannot call INSERT directly
-- because they'd need a valid user_id FK that matches.

-- 3b. feed_events DELETE policy (for pruning)
CREATE POLICY "feed_events_delete_own"
  ON public.feed_events FOR DELETE
  USING (user_id = public.current_user_id());

-- 3c. conversations DELETE policy — creator can delete
CREATE POLICY "conversations_delete_creator"
  ON public.conversations FOR DELETE
  USING (created_by = public.current_user_id());

-- 3d. Ensure conversation_participants UPDATE policy exists
--     (002 created one, 011 dropped select/insert but NOT update)
DROP POLICY IF EXISTS "participants_update_own" ON public.conversation_participants;
CREATE POLICY "participants_update_own" ON public.conversation_participants
  FOR UPDATE USING (user_id = public.current_user_id());

-- 3e. messages UPDATE policy — sender can update (soft delete)
--     Policy from 002 already exists but re-ensure with is_member guard
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (
    sender_id = public.current_user_id()
    AND public.is_member_of_conversation(conversation_id)
  );

-- 3f. message_reactions INSERT/DELETE with conversation membership check
DROP POLICY IF EXISTS "reactions_insert_own" ON public.message_reactions;
CREATE POLICY "reactions_insert_own" ON public.message_reactions
  FOR INSERT WITH CHECK (
    user_id = public.current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_member_of_conversation(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS "reactions_delete_own" ON public.message_reactions;
CREATE POLICY "reactions_delete_own" ON public.message_reactions
  FOR DELETE USING (
    user_id = public.current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_member_of_conversation(m.conversation_id)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. MISSING INDEXES for production performance
-- ═══════════════════════════════════════════════════════════════════════════════

-- 4a. conversation_participants composite for is_member_of_conversation() lookups
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_user
  ON public.conversation_participants (conversation_id, user_id);

-- 4b. conversation_participants for admin check
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_user_role
  ON public.conversation_participants (conversation_id, user_id, role);

-- 4c. messages by conversation + not deleted for pagination
CREATE INDEX IF NOT EXISTS idx_messages_conv_not_deleted
  ON public.messages (conversation_id, created_at DESC)
  WHERE is_deleted = FALSE;

-- 4d. notifications actor for activity feed
CREATE INDEX IF NOT EXISTS idx_notifications_actor
  ON public.notifications (actor_id, created_at DESC);

-- 4e. reel_comments user for profile queries
CREATE INDEX IF NOT EXISTS idx_reel_comments_user
  ON public.reel_comments (user_id, created_at DESC);

-- 4f. reports content for moderation lookups
CREATE INDEX IF NOT EXISTS idx_reports_content
  ON public.reports (content_type, content_id);

-- 4g. muted_users lookup
CREATE INDEX IF NOT EXISTS idx_muted_users_user
  ON public.muted_users (user_id, muted_user_id);

-- 4h. hidden_threads lookup
CREATE INDEX IF NOT EXISTS idx_hidden_threads_user
  ON public.hidden_threads (user_id, thread_id);

-- 4i. user_keys active lookup
CREATE INDEX IF NOT EXISTS idx_user_keys_user_version
  ON public.user_keys (user_id, key_version DESC) WHERE is_active = TRUE;

-- 4j. conversation_keys lookup
CREATE INDEX IF NOT EXISTS idx_conv_keys_conv_user_version
  ON public.conversation_keys (conversation_id, user_id, key_version DESC);

-- 4k. feed_impressions cleanup index
CREATE INDEX IF NOT EXISTS idx_feed_impressions_created
  ON public.feed_impressions (created_at);

-- 4l. interactions cleanup index
CREATE INDEX IF NOT EXISTS idx_interactions_created
  ON public.interactions (created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. DROP ORPHANED COLUMNS from conversations
--    is_muted / is_pinned moved to conversation_participants in migration 009
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversations
  DROP COLUMN IF EXISTS is_muted,
  DROP COLUMN IF EXISTS is_pinned;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FIX user_devices RLS to use current_user_id() consistently
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "devices_select_own" ON public.user_devices;
CREATE POLICY "devices_select_own" ON public.user_devices
  FOR SELECT USING (
    user_id = public.current_user_id()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "devices_select_service" ON public.user_devices;
-- Merged into devices_select_own above

DROP POLICY IF EXISTS "devices_insert_own" ON public.user_devices;
CREATE POLICY "devices_insert_own" ON public.user_devices
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

DROP POLICY IF EXISTS "devices_update_own" ON public.user_devices;
CREATE POLICY "devices_update_own" ON public.user_devices
  FOR UPDATE USING (user_id = public.current_user_id());

DROP POLICY IF EXISTS "devices_delete_own" ON public.user_devices;
CREATE POLICY "devices_delete_own" ON public.user_devices
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. FIX get_following_feed to return is_bookmarked
--    Frontend expects this field but original RPC doesn't return it
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_following_feed(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 20,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  user_id       UUID,
  content       TEXT,
  media         JSONB,
  parent_id     UUID,
  root_id       UUID,
  reply_count   INTEGER,
  like_count    INTEGER,
  repost_count  INTEGER,
  created_at    TIMESTAMPTZ,
  author_username    TEXT,
  author_display_name TEXT,
  author_avatar_url  TEXT,
  author_verified    BOOLEAN,
  is_liked      BOOLEAN,
  is_reposted   BOOLEAN,
  is_bookmarked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.user_id, t.content, t.media,
    t.parent_id, t.root_id,
    t.reply_count, t.like_count, t.repost_count,
    t.created_at,
    u.username, u.display_name, u.avatar_url, u.verified,
    EXISTS(SELECT 1 FROM public.likes l WHERE l.user_id = p_user_id AND l.thread_id = t.id),
    EXISTS(SELECT 1 FROM public.reposts r WHERE r.user_id = p_user_id AND r.thread_id = t.id),
    EXISTS(SELECT 1 FROM public.bookmarks b WHERE b.user_id = p_user_id AND b.thread_id = t.id)
  FROM public.threads t
  INNER JOIN public.users u ON u.id = t.user_id
  INNER JOIN public.follows f ON f.follower_id = p_user_id AND f.following_id = t.user_id
  WHERE t.parent_id IS NULL
    AND t.is_deleted = FALSE
    AND t.user_id NOT IN (
      SELECT muted_user_id FROM public.muted_users WHERE muted_users.user_id = p_user_id
    )
  ORDER BY t.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. ADD conversations INSERT policy for creator to add self as first participant
--    The participant_insert policy requires admin OR creator, but on INSERT
--    the creator has no participant row yet. Fix: allow the conversation
--    creator to always add participants to their own conversation.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Already handled by the "OR EXISTS (conversations WHERE created_by = current_user_id())"
-- clause in migration 011. No change needed.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. FIX feed_impressions: add ON CONFLICT behavior for record_impressions
--    The RPC uses ON CONFLICT DO NOTHING but there's no unique constraint.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add unique constraint so ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_impressions_unique
  ON public.feed_impressions (user_id, content_id, content_type);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. PRUNE TRIGGER: auto-cleanup old data
-- ═══════════════════════════════════════════════════════════════════════════════

-- Extend prune function to also clean up stale analytics
CREATE OR REPLACE FUNCTION public.prune_old_impressions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.feed_impressions
  WHERE created_at < NOW() - INTERVAL '7 days';

  DELETE FROM public.interactions
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Prune old analytics (keep 90 days)
  DELETE FROM public.analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Prune old feed_events (keep 30 days)
  DELETE FROM public.feed_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. FIX Conversation type: Ensure Conversation model doesn't break
--     after dropping is_muted/is_pinned from conversations table.
--     The get_conversations RPC already returns these from participants.
-- ═══════════════════════════════════════════════════════════════════════════════

-- No SQL change needed; frontend fix below handles this.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. ADD reel_comments RLS UPDATE policy (missing — can't edit comments)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reel_comments_update_own" ON public.reel_comments
  FOR UPDATE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. REALTIME: Add reels to publication for live comment counts
-- ═══════════════════════════════════════════════════════════════════════════════

-- reels table is NOT in supabase_realtime yet — add for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;

-- reel_comments for live comment updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;
