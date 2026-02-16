-- supabase/migrations/015_final_hard_delete_and_explore_fix.sql
-- 1. FIX SCHEMA CONSTRAINTS: Ensure hard deletes cascade to replies
-- This ensures that when a thread is deleted, all its replies (recursive) are also removed.

ALTER TABLE public.threads 
  DROP CONSTRAINT IF EXISTS threads_parent_id_fkey,
  DROP CONSTRAINT IF EXISTS threads_root_id_fkey;

ALTER TABLE public.threads
  ADD CONSTRAINT threads_parent_id_fkey 
  FOREIGN KEY (parent_id) 
  REFERENCES public.threads(id) 
  ON DELETE CASCADE;

ALTER TABLE public.threads
  ADD CONSTRAINT threads_root_id_fkey 
  FOREIGN KEY (root_id) 
  REFERENCES public.threads(id) 
  ON DELETE CASCADE;

-- 2. ROBUST DELETE RPC
-- Performing deletion via RPC ensures ownership check and bypasses RLS visibility issues.

CREATE OR REPLACE FUNCTION public.delete_thread(
  p_user_id   UUID,
  p_thread_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_owner_id FROM public.threads WHERE id = p_thread_id;

  IF v_owner_id IS NULL OR v_owner_id != p_user_id THEN
    RETURN FALSE;
  END IF;

  -- Delete the thread (cascades to replies)
  DELETE FROM public.threads WHERE id = p_thread_id;

  RETURN TRUE;
END;
$$;

-- 3. FIX EXPLORE FEED RPC
-- Solves potential 400 Bad Request by ensuring return types and parameters match the service.

DROP FUNCTION IF EXISTS public.rpc_explore_feed(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.rpc_explore_feed(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 30,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  content_type        TEXT,
  content_id          UUID,
  thread_content      TEXT,
  thread_media        JSONB,
  thread_reply_count  INTEGER,
  thread_like_count   INTEGER,
  thread_repost_count INTEGER,
  reel_video_url      TEXT,
  reel_thumbnail_url  TEXT,
  reel_caption        TEXT,
  reel_like_count     INTEGER,
  reel_comment_count  INTEGER,
  reel_view_count     INTEGER,
  reel_duration       REAL,
  reel_aspect_ratio   REAL,
  author_id           UUID,
  author_username     TEXT,
  author_display_name TEXT,
  author_avatar_url   TEXT,
  author_verified     BOOLEAN,
  created_at          TIMESTAMPTZ,
  is_liked            BOOLEAN,
  engagement_24h      BIGINT,
  velocity            REAL,
  final_score         REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- ── Thread candidates (NOT followed) ──────────────────────────────────────
  thread_candidates AS (
    SELECT
      'thread'::TEXT AS content_type,
      t.id AS content_id,
      t.content AS thread_content,
      t.media AS thread_media,
      t.reply_count AS thread_reply_count,
      t.like_count AS thread_like_count,
      t.repost_count AS thread_repost_count,
      NULL::TEXT AS reel_video_url,
      NULL::TEXT AS reel_thumbnail_url,
      NULL::TEXT AS reel_caption,
      NULL::INTEGER AS reel_like_count,
      NULL::INTEGER AS reel_comment_count,
      NULL::INTEGER AS reel_view_count,
      NULL::REAL AS reel_duration,
      NULL::REAL AS reel_aspect_ratio,
      t.user_id AS author_id,
      u.username AS author_username,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      u.verified AS author_verified,
      t.created_at,
      EXISTS(SELECT 1 FROM public.likes l WHERE l.user_id = p_user_id AND l.thread_id = t.id) AS is_liked,
      -- Engagement 24h
      (SELECT COUNT(*) FROM public.interactions i WHERE i.thread_id = t.id AND i.created_at > NOW() - INTERVAL '24 hours') AS engagement_24h,
      -- Velocity (simplified)
      0.0::REAL AS velocity,
      ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.created_at DESC) AS author_rank
    FROM public.threads t
    INNER JOIN public.users u ON u.id = t.user_id
    WHERE t.parent_id IS NULL
      AND t.is_deleted = FALSE
      -- Exclude followed users
      AND NOT EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = p_user_id AND f.following_id = t.user_id)
      -- Exclude self
      AND t.user_id != p_user_id
      -- Exclude muted
      AND NOT EXISTS (SELECT 1 FROM public.muted_users mu WHERE mu.user_id = p_user_id AND mu.muted_user_id = t.user_id)
      -- Exclude hidden
      AND NOT EXISTS (SELECT 1 FROM public.hidden_threads ht WHERE ht.user_id = p_user_id AND ht.thread_id = t.id)
  ),
  -- ── Reel candidates (NOT followed) ──────────────────────────────
  reel_candidates AS (
    SELECT
      'reel'::TEXT AS content_type,
      r.id AS content_id,
      NULL::TEXT AS thread_content,
      NULL::JSONB AS thread_media,
      NULL::INTEGER AS thread_reply_count,
      NULL::INTEGER AS thread_like_count,
      NULL::INTEGER AS thread_repost_count,
      r.video_url AS reel_video_url,
      r.thumbnail_url AS reel_thumbnail_url,
      r.caption AS reel_caption,
      r.like_count AS reel_like_count,
      r.comment_count AS reel_comment_count,
      r.view_count AS reel_view_count,
      r.duration AS reel_duration,
      r.aspect_ratio AS reel_aspect_ratio,
      r.author_id,
      u.username AS author_username,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      u.verified AS author_verified,
      r.created_at,
      EXISTS(SELECT 1 FROM public.reel_likes rl WHERE rl.user_id = p_user_id AND rl.reel_id = r.id) AS is_liked,
      (SELECT COUNT(*) FROM public.interactions i WHERE i.reel_id = r.id AND i.created_at > NOW() - INTERVAL '24 hours') AS engagement_24h,
      0.0::REAL AS velocity,
      ROW_NUMBER() OVER (PARTITION BY r.author_id ORDER BY r.created_at DESC) AS author_rank
    FROM public.reels r
    INNER JOIN public.users u ON u.id = r.author_id
    WHERE r.is_deleted = FALSE
      AND r.author_id != p_user_id
      AND NOT EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = p_user_id AND f.following_id = r.author_id)
  ),
  -- ── Combined + scored ─────────────────────────────────────────────────────
  combined AS (
    SELECT *,
      (
        (COALESCE(engagement_24h, 0) * 2.0)
        + 1.0
      )::REAL AS final_score
    FROM (
      SELECT * FROM thread_candidates WHERE author_rank <= 2
      UNION ALL
      SELECT * FROM reel_candidates WHERE author_rank <= 2
    ) all_content
  )
  SELECT
    c.content_type, c.content_id,
    c.thread_content, c.thread_media, c.thread_reply_count, c.thread_like_count, c.thread_repost_count,
    c.reel_video_url, c.reel_thumbnail_url, c.reel_caption,
    c.reel_like_count, c.reel_comment_count, c.reel_view_count,
    c.reel_duration, c.reel_aspect_ratio,
    c.author_id, c.author_username, c.author_display_name, c.author_avatar_url, c.author_verified,
    c.created_at, c.is_liked,
    c.engagement_24h, c.velocity, c.final_score
  FROM combined c
  ORDER BY c.final_score DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
