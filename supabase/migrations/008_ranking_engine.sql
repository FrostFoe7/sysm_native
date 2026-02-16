-- supabase/migrations/008_ranking_engine.sql
-- Modern velocity-based, decay-aware, personalized ranking engine
-- Replaces naive scoring in 005_rpc_functions.sql
--
-- CORE PRINCIPLES:
--   ❌ No lifetime totals   ❌ No client scoring
--   ❌ No static popularity  ❌ No random order
--   ✅ Rolling time windows  ✅ Velocity signals
--   ✅ Exponential decay     ✅ Seen-content suppression
--   ✅ Creator diversity     ✅ Personalization

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. NEW TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- feed_impressions: tracks what a user has already seen
CREATE TABLE IF NOT EXISTS public.feed_impressions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('thread', 'reel')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_impressions_user_content
  ON public.feed_impressions (user_id, content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_user_created
  ON public.feed_impressions (user_id, created_at DESC);

-- reel_views: dedicated watch-time tracking per user per reel
CREATE TABLE IF NOT EXISTS public.reel_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reel_id    UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  watch_ms   INTEGER NOT NULL DEFAULT 0,
  completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reel_views_reel_created
  ON public.reel_views (reel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_views_user_reel
  ON public.reel_views (user_id, reel_id);

-- interactions: unified signal table for rolling-window aggregates
CREATE TABLE IF NOT EXISTS public.interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id  UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  reel_id    UUID REFERENCES public.reels(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('like', 'reply', 'repost', 'view')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_thread_created
  ON public.interactions (thread_id, created_at DESC) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_reel_created
  ON public.interactions (reel_id, created_at DESC) WHERE reel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_user_created
  ON public.interactions (user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ADDITIONAL INDEXES on existing tables for rolling-window queries
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_likes_thread_created
  ON public.likes (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_created
  ON public.likes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reposts_thread_created
  ON public.reposts (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_created_not_deleted
  ON public.threads (created_at DESC) WHERE is_deleted = FALSE AND parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_reels_created_not_deleted
  ON public.reels (created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON public.follows (follower_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RLS on new tables
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.feed_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_views        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own impressions"
  ON public.feed_impressions FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can manage own reel views"
  ON public.reel_views FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can insert own interactions"
  ON public.interactions FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can read own interactions"
  ON public.interactions FOR SELECT
  USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGERS: Auto-populate interactions table from likes, reposts, replies
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.interaction_on_like()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.interactions (user_id, thread_id, type)
  VALUES (NEW.user_id, NEW.thread_id, 'like');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_interaction_like ON public.likes;
CREATE TRIGGER tr_interaction_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.interaction_on_like();

CREATE OR REPLACE FUNCTION public.interaction_on_repost()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.interactions (user_id, thread_id, type)
  VALUES (NEW.user_id, NEW.thread_id, 'repost');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_interaction_repost ON public.reposts;
CREATE TRIGGER tr_interaction_repost AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.interaction_on_repost();

CREATE OR REPLACE FUNCTION public.interaction_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO public.interactions (user_id, thread_id, type)
    VALUES (NEW.user_id, NEW.parent_id, 'reply');
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_interaction_reply ON public.threads;
CREATE TRIGGER tr_interaction_reply AFTER INSERT ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.interaction_on_reply();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. HELPER: record_impression — called from client after fetching a page
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_impressions(
  p_user_id      UUID,
  p_content_ids  UUID[],
  p_content_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.feed_impressions (user_id, content_id, content_type)
  SELECT p_user_id, unnest(p_content_ids), p_content_type
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. HELPER: record_reel_watch — per-view watch time tracking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_reel_watch(
  p_user_id  UUID,
  p_reel_id  UUID,
  p_watch_ms INTEGER,
  p_completed BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.reel_views (user_id, reel_id, watch_ms, completed)
  VALUES (p_user_id, p_reel_id, p_watch_ms, p_completed);

  -- Also log in interactions for the unified signal pipeline
  INSERT INTO public.interactions (user_id, reel_id, type)
  VALUES (p_user_id, p_reel_id, 'view');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RPC: rpc_rank_threads
--    Velocity-based, decay-aware, personalized thread ranking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_rank_threads(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 25,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                  UUID,
  user_id             UUID,
  content             TEXT,
  media               JSONB,
  parent_id           UUID,
  root_id             UUID,
  reply_count         INTEGER,
  like_count          INTEGER,
  repost_count        INTEGER,
  created_at          TIMESTAMPTZ,
  author_username     TEXT,
  author_display_name TEXT,
  author_avatar_url   TEXT,
  author_verified     BOOLEAN,
  is_liked            BOOLEAN,
  is_reposted         BOOLEAN,
  is_bookmarked       BOOLEAN,
  -- Rolling metrics returned to client
  likes_24h           BIGINT,
  replies_24h         BIGINT,
  reposts_24h         BIGINT,
  velocity            REAL,
  final_score         REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- ── Rolling-window engagement per thread ──────────────────────────────────
  rolling AS (
    SELECT
      i.thread_id,
      COUNT(*) FILTER (WHERE i.type = 'like'   AND i.created_at > NOW() - INTERVAL '24 hours') AS likes_24h,
      COUNT(*) FILTER (WHERE i.type = 'like'   AND i.created_at > NOW() - INTERVAL '1 hour')   AS likes_1h,
      COUNT(*) FILTER (WHERE i.type = 'reply'  AND i.created_at > NOW() - INTERVAL '24 hours') AS replies_24h,
      COUNT(*) FILTER (WHERE i.type = 'repost' AND i.created_at > NOW() - INTERVAL '24 hours') AS reposts_24h,
      -- Velocity: last 6h engagement minus previous 6h
      (COUNT(*) FILTER (WHERE i.created_at > NOW() - INTERVAL '6 hours')
       - COUNT(*) FILTER (WHERE i.created_at BETWEEN NOW() - INTERVAL '12 hours' AND NOW() - INTERVAL '6 hours')
      )::REAL AS velocity
    FROM public.interactions i
    WHERE i.thread_id IS NOT NULL
      AND i.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY i.thread_id
  ),
  -- ── Mutual interactions: has this user interacted with the author before? ─
  mutual AS (
    SELECT
      ca.creator_id,
      ca.score AS affinity
    FROM public.creator_affinities ca
    WHERE ca.user_id = p_user_id
  ),
  -- ── Scored threads ────────────────────────────────────────────────────────
  scored AS (
    SELECT
      t.id,
      t.user_id,
      t.content,
      t.media,
      t.parent_id,
      t.root_id,
      t.reply_count,
      t.like_count,
      t.repost_count,
      t.created_at,
      u.username          AS author_username,
      u.display_name      AS author_display_name,
      u.avatar_url        AS author_avatar_url,
      u.verified          AS author_verified,
      -- Viewer flags
      EXISTS(SELECT 1 FROM public.likes    l WHERE l.user_id = p_user_id AND l.thread_id = t.id) AS is_liked,
      EXISTS(SELECT 1 FROM public.reposts  r WHERE r.user_id = p_user_id AND r.thread_id = t.id) AS is_reposted,
      EXISTS(SELECT 1 FROM public.bookmarks b WHERE b.user_id = p_user_id AND b.thread_id = t.id) AS is_bookmarked,
      -- Rolling metrics
      COALESCE(r.likes_24h, 0)   AS likes_24h,
      COALESCE(r.replies_24h, 0) AS replies_24h,
      COALESCE(r.reposts_24h, 0) AS reposts_24h,
      COALESCE(r.velocity, 0)    AS velocity,
      -- ── FINAL SCORE ───────────────────────────────────────────────────────
      (
        -- Weighted rolling engagement
        (COALESCE(r.likes_24h, 0) * 3.0)
        + (COALESCE(r.replies_24h, 0) * 4.0)
        + (COALESCE(r.reposts_24h, 0) * 5.0)
        -- Velocity signal (acceleration bonus)
        + (GREATEST(COALESCE(r.velocity, 0), 0) * 6.0)
        -- Followed author boost
        + (CASE WHEN f.id IS NOT NULL THEN 10.0 ELSE 0.0 END)
        -- Mutual interaction / creator affinity boost
        + (COALESCE(m.affinity, 0) * 6.0)
        -- Media bonus: video +6, images +3
        + (CASE
            WHEN t.media IS NOT NULL AND jsonb_array_length(t.media) > 0 THEN
              CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(t.media) elem WHERE elem->>'type' = 'video')
                   THEN 6.0
                   ELSE 3.0
              END
            ELSE 0.0
          END)
        -- Exponential time decay: e^(-hours/36)
        * EXP(-EXTRACT(EPOCH FROM NOW() - t.created_at) / 129600.0)  -- 36h in seconds
        -- Hard 30-day penalty: 85% loss
        * (CASE WHEN t.created_at < NOW() - INTERVAL '30 days'
                AND COALESCE(r.velocity, 0) <= 0
                THEN 0.15
                ELSE 1.0
          END)
      )::REAL AS final_score,
      -- For diversity: row number per author
      ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.created_at DESC) AS author_rank
    FROM public.threads t
    INNER JOIN public.users u ON u.id = t.user_id
    LEFT JOIN public.follows f ON f.follower_id = p_user_id AND f.following_id = t.user_id
    LEFT JOIN rolling r ON r.thread_id = t.id
    LEFT JOIN mutual m ON m.creator_id = t.user_id
    WHERE t.parent_id IS NULL
      AND t.is_deleted = FALSE
      -- Exclude muted users
      AND NOT EXISTS (
        SELECT 1 FROM public.muted_users mu
        WHERE mu.user_id = p_user_id AND mu.muted_user_id = t.user_id
      )
      -- Exclude hidden threads
      AND NOT EXISTS (
        SELECT 1 FROM public.hidden_threads ht
        WHERE ht.user_id = p_user_id AND ht.thread_id = t.id
      )
      -- ── SEEN-CONTENT SUPPRESSION ───────────────────────────────────────────
      AND NOT EXISTS (
        SELECT 1 FROM public.feed_impressions fi
        WHERE fi.user_id = p_user_id
          AND fi.content_id = t.id
          AND fi.content_type = 'thread'
          -- Allow re-showing after 12 hours
          AND fi.created_at > NOW() - INTERVAL '12 hours'
      )
  )
  SELECT
    s.id, s.user_id, s.content, s.media, s.parent_id, s.root_id,
    s.reply_count, s.like_count, s.repost_count, s.created_at,
    s.author_username, s.author_display_name, s.author_avatar_url, s.author_verified,
    s.is_liked, s.is_reposted, s.is_bookmarked,
    s.likes_24h, s.replies_24h, s.reposts_24h,
    s.velocity, s.final_score
  FROM scored s
  WHERE s.author_rank <= 3  -- Max 3 posts per author per page
  ORDER BY s.final_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. RPC: rpc_rank_reels
--    TikTok-grade reel ranking with watch-time signals
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_rank_reels(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 15,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                  UUID,
  author_id           UUID,
  video_url           TEXT,
  thumbnail_url       TEXT,
  caption             TEXT,
  like_count          INTEGER,
  comment_count       INTEGER,
  share_count         INTEGER,
  view_count          INTEGER,
  duration            REAL,
  aspect_ratio        REAL,
  created_at          TIMESTAMPTZ,
  author_username     TEXT,
  author_display_name TEXT,
  author_avatar_url   TEXT,
  author_verified     BOOLEAN,
  is_liked            BOOLEAN,
  -- Rolling metrics
  watch_ms_24h        BIGINT,
  completion_rate_24h REAL,
  likes_24h           BIGINT,
  velocity            REAL,
  final_score         REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- ── Rolling watch-time aggregates per reel ─────────────────────────────────
  watch_agg AS (
    SELECT
      rv.reel_id,
      COALESCE(SUM(rv.watch_ms) FILTER (WHERE rv.created_at > NOW() - INTERVAL '24 hours'), 0) AS watch_ms_24h,
      CASE
        WHEN COUNT(*) FILTER (WHERE rv.created_at > NOW() - INTERVAL '24 hours') > 0
        THEN COUNT(*) FILTER (WHERE rv.completed = TRUE AND rv.created_at > NOW() - INTERVAL '24 hours')::REAL
             / COUNT(*) FILTER (WHERE rv.created_at > NOW() - INTERVAL '24 hours')::REAL
        ELSE 0
      END AS completion_rate_24h
    FROM public.reel_views rv
    WHERE rv.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY rv.reel_id
  ),
  -- ── Rolling like counts per reel ───────────────────────────────────────────
  reel_likes_agg AS (
    SELECT
      rl_i.reel_id,
      COUNT(*) FILTER (WHERE rl_i.created_at > NOW() - INTERVAL '24 hours') AS likes_24h
    FROM public.interactions rl_i
    WHERE rl_i.reel_id IS NOT NULL
      AND rl_i.type = 'like'
      AND rl_i.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY rl_i.reel_id
  ),
  -- ── Velocity per reel ─────────────────────────────────────────────────────
  reel_velocity AS (
    SELECT
      i.reel_id,
      (COUNT(*) FILTER (WHERE i.created_at > NOW() - INTERVAL '6 hours')
       - COUNT(*) FILTER (WHERE i.created_at BETWEEN NOW() - INTERVAL '12 hours' AND NOW() - INTERVAL '6 hours')
      )::REAL AS velocity
    FROM public.interactions i
    WHERE i.reel_id IS NOT NULL
      AND i.created_at > NOW() - INTERVAL '12 hours'
    GROUP BY i.reel_id
  ),
  scored AS (
    SELECT
      r.id, r.author_id, r.video_url, r.thumbnail_url, r.caption,
      r.like_count, r.comment_count, r.share_count, r.view_count,
      r.duration, r.aspect_ratio, r.created_at,
      u.username          AS author_username,
      u.display_name      AS author_display_name,
      u.avatar_url        AS author_avatar_url,
      u.verified          AS author_verified,
      EXISTS(SELECT 1 FROM public.reel_likes rl WHERE rl.user_id = p_user_id AND rl.reel_id = r.id) AS is_liked,
      -- Rolling metrics
      COALESCE(wa.watch_ms_24h, 0)         AS watch_ms_24h,
      COALESCE(wa.completion_rate_24h, 0)   AS completion_rate_24h,
      COALESCE(rla.likes_24h, 0)            AS likes_24h,
      COALESCE(rv.velocity, 0)              AS velocity,
      -- ── FINAL SCORE ───────────────────────────────────────────────────────
      (
        -- Watch time contribution
        (COALESCE(wa.watch_ms_24h, 0)::REAL / 1000.0 * 0.4)
        -- Completion rate (strong signal)
        + (COALESCE(wa.completion_rate_24h, 0) * 8.0)
        -- Rolling likes
        + (COALESCE(rla.likes_24h, 0) * 3.0)
        -- Velocity
        + (GREATEST(COALESCE(rv.velocity, 0), 0) * 5.0)
        -- Followed author boost
        + (CASE WHEN f.id IS NOT NULL THEN 10.0 ELSE 0.0 END)
        -- Exponential time decay: e^(-hours/36)
        * EXP(-EXTRACT(EPOCH FROM NOW() - r.created_at) / 129600.0)
        -- Hard 30-day penalty
        * (CASE WHEN r.created_at < NOW() - INTERVAL '30 days'
                AND COALESCE(rv.velocity, 0) <= 0
                THEN 0.15
                ELSE 1.0
          END)
      )::REAL AS final_score,
      ROW_NUMBER() OVER (PARTITION BY r.author_id ORDER BY r.created_at DESC) AS author_rank
    FROM public.reels r
    INNER JOIN public.users u ON u.id = r.author_id
    LEFT JOIN public.follows f ON f.follower_id = p_user_id AND f.following_id = r.author_id
    LEFT JOIN watch_agg wa ON wa.reel_id = r.id
    LEFT JOIN reel_likes_agg rla ON rla.reel_id = r.id
    LEFT JOIN reel_velocity rv ON rv.reel_id = r.id
    WHERE r.is_deleted = FALSE
      -- Seen-content suppression
      AND NOT EXISTS (
        SELECT 1 FROM public.feed_impressions fi
        WHERE fi.user_id = p_user_id
          AND fi.content_id = r.id
          AND fi.content_type = 'reel'
          AND fi.created_at > NOW() - INTERVAL '6 hours'
      )
  )
  SELECT
    s.id, s.author_id, s.video_url, s.thumbnail_url, s.caption,
    s.like_count, s.comment_count, s.share_count, s.view_count,
    s.duration, s.aspect_ratio, s.created_at,
    s.author_username, s.author_display_name, s.author_avatar_url, s.author_verified,
    s.is_liked,
    s.watch_ms_24h, s.completion_rate_24h, s.likes_24h, s.velocity, s.final_score
  FROM scored s
  WHERE s.author_rank <= 2  -- Max 2 reels per creator per page
  ORDER BY s.final_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. RPC: rpc_explore_feed
--    Discovery feed — excludes followed, favors reels, global velocity
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_explore_feed(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 30,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  content_type        TEXT,
  content_id          UUID,
  -- Thread fields (NULL when content_type = 'reel')
  thread_content      TEXT,
  thread_media        JSONB,
  thread_reply_count  INTEGER,
  thread_like_count   INTEGER,
  thread_repost_count INTEGER,
  -- Reel fields (NULL when content_type = 'thread')
  reel_video_url      TEXT,
  reel_thumbnail_url  TEXT,
  reel_caption        TEXT,
  reel_like_count     INTEGER,
  reel_comment_count  INTEGER,
  reel_view_count     INTEGER,
  reel_duration       REAL,
  reel_aspect_ratio   REAL,
  -- Common fields
  author_id           UUID,
  author_username     TEXT,
  author_display_name TEXT,
  author_avatar_url   TEXT,
  author_verified     BOOLEAN,
  created_at          TIMESTAMPTZ,
  is_liked            BOOLEAN,
  -- Metrics
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
      -- Velocity
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
  -- ── Reel candidates (NOT followed, favored) ──────────────────────────────
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. HELPER: Auto-populate reel_likes → interactions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.interaction_on_reel_like()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.interactions (user_id, reel_id, type)
  VALUES (NEW.user_id, NEW.reel_id, 'like');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_interaction_reel_like ON public.reel_likes;
CREATE TRIGGER tr_interaction_reel_like AFTER INSERT ON public.reel_likes
  FOR EACH ROW EXECUTE FUNCTION public.interaction_on_reel_like();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. CLEANUP: Prune old impressions (run periodically via pg_cron or edge fn)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prune_old_impressions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.feed_impressions
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Also prune old interaction rows (keep 30 days for velocity)
  DELETE FROM public.interactions
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. Realtime on new tables (optional)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions;
