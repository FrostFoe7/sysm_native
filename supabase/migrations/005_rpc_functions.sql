-- supabase/migrations/005_rpc_functions.sql
-- Server-side RPC functions for complex queries
-- Called via supabase.rpc('function_name', { params })

-- ═══════════════════════════════════════════════════════════════════════════════
-- Feed: Personalized "For You" feed
-- Uses engagement signals, creator affinity, and content freshness
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_for_you_feed(
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
  -- author join
  author_username    TEXT,
  author_display_name TEXT,
  author_avatar_url  TEXT,
  author_verified    BOOLEAN,
  -- interaction state
  is_liked      BOOLEAN,
  is_reposted   BOOLEAN,
  is_bookmarked BOOLEAN,
  -- ranking score
  score         REAL
) AS $$
DECLARE
  v_interest_topics JSONB;
BEGIN
  -- Load user's interest vector
  SELECT topics INTO v_interest_topics
  FROM public.interest_vectors WHERE interest_vectors.user_id = p_user_id;

  IF v_interest_topics IS NULL THEN
    v_interest_topics := '{}'::jsonb;
  END IF;

  RETURN QUERY
  WITH scored AS (
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
      -- Engagement score (normalized log scale)
      (LN(GREATEST(t.like_count, 1)) * 1.0
       + LN(GREATEST(t.reply_count, 1)) * 2.0
       + LN(GREATEST(t.repost_count, 1)) * 1.5
      ) AS engagement_score,
      -- Relationship: followed creators score higher
      CASE WHEN f.id IS NOT NULL THEN 2.5 ELSE 1.0 END AS relationship_score,
      -- Freshness: exponential decay over 6 hours
      EXP(-EXTRACT(EPOCH FROM NOW() - t.created_at) / 21600.0) AS freshness_score,
      -- Creator affinity
      COALESCE(ca.score, 0) AS affinity_score,
      -- Verified boost
      CASE WHEN u.verified THEN 1.15 ELSE 1.0 END AS quality_score
    FROM public.threads t
    INNER JOIN public.users u ON u.id = t.user_id
    LEFT JOIN public.follows f ON f.follower_id = p_user_id AND f.following_id = t.user_id
    LEFT JOIN public.creator_affinities ca ON ca.user_id = p_user_id AND ca.creator_id = t.user_id
    WHERE t.parent_id IS NULL
      AND t.is_deleted = FALSE
      AND t.user_id NOT IN (
        SELECT muted_user_id FROM public.muted_users WHERE muted_users.user_id = p_user_id
      )
      AND t.id NOT IN (
        SELECT thread_id FROM public.hidden_threads WHERE hidden_threads.user_id = p_user_id
      )
  )
  SELECT
    s.id,
    s.user_id,
    s.content,
    s.media,
    s.parent_id,
    s.root_id,
    s.reply_count,
    s.like_count,
    s.repost_count,
    s.created_at,
    u.username AS author_username,
    u.display_name AS author_display_name,
    u.avatar_url AS author_avatar_url,
    u.verified AS author_verified,
    EXISTS(SELECT 1 FROM public.likes l WHERE l.user_id = p_user_id AND l.thread_id = s.id) AS is_liked,
    EXISTS(SELECT 1 FROM public.reposts r WHERE r.user_id = p_user_id AND r.thread_id = s.id) AS is_reposted,
    EXISTS(SELECT 1 FROM public.bookmarks b WHERE b.user_id = p_user_id AND b.thread_id = s.id) AS is_bookmarked,
    (s.engagement_score * s.relationship_score * s.freshness_score
     * (1.0 + s.affinity_score) * s.quality_score
    )::REAL AS score
  FROM scored s
  INNER JOIN public.users u ON u.id = s.user_id
  ORDER BY score DESC, s.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Feed: Following-only feed (chronological with engagement tiebreaker)
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
    AND t.id NOT IN (
      SELECT thread_id FROM public.hidden_threads WHERE hidden_threads.user_id = p_user_id
    )
  ORDER BY t.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Feed: Ranked Reels
-- Discovery-first: injects unfollowed creator content every 3rd position
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_reels_feed(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 10,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  author_id     UUID,
  video_url     TEXT,
  thumbnail_url TEXT,
  caption       TEXT,
  like_count    INTEGER,
  comment_count INTEGER,
  share_count   INTEGER,
  view_count    INTEGER,
  duration      REAL,
  created_at    TIMESTAMPTZ,
  author_username    TEXT,
  author_display_name TEXT,
  author_avatar_url  TEXT,
  author_verified    BOOLEAN,
  is_liked      BOOLEAN,
  score         REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id, r.author_id, r.video_url, r.thumbnail_url, r.caption,
    r.like_count, r.comment_count, r.share_count, r.view_count,
    r.duration, r.created_at,
    u.username, u.display_name, u.avatar_url, u.verified,
    EXISTS(SELECT 1 FROM public.reel_likes rl WHERE rl.user_id = p_user_id AND rl.reel_id = r.id),
    (
      -- Engagement
      (LN(GREATEST(r.like_count, 1)) + LN(GREATEST(r.comment_count, 1)) * 1.5 + LN(GREATEST(r.share_count, 1)) * 2.0)
      -- Freshness
      * EXP(-EXTRACT(EPOCH FROM NOW() - r.created_at) / 43200.0)
      -- Discovery boost for non-followed creators
      * CASE WHEN NOT EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = p_user_id AND f.following_id = r.author_id)
             THEN 2.0 ELSE 1.0 END
      -- Verified
      * CASE WHEN u.verified THEN 1.15 ELSE 1.0 END
    )::REAL AS score
  FROM public.reels r
  INNER JOIN public.users u ON u.id = r.author_id
  WHERE r.is_deleted = FALSE
  ORDER BY score DESC, r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Trending: hot threads in the last 24 hours
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_trending(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id           UUID,
  content      TEXT,
  like_count   INTEGER,
  reply_count  INTEGER,
  repost_count INTEGER,
  created_at   TIMESTAMPTZ,
  author_username    TEXT,
  author_display_name TEXT,
  author_avatar_url  TEXT,
  author_verified    BOOLEAN,
  velocity     REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.content, t.like_count, t.reply_count, t.repost_count, t.created_at,
    u.username, u.display_name, u.avatar_url, u.verified,
    -- Velocity: engagement per hour, weighted
    (
      (t.like_count + t.reply_count * 2 + t.repost_count * 1.5)
      / GREATEST(EXTRACT(EPOCH FROM NOW() - t.created_at) / 3600.0, 1.0)
    )::REAL AS velocity
  FROM public.threads t
  INNER JOIN public.users u ON u.id = t.user_id
  WHERE t.parent_id IS NULL
    AND t.is_deleted = FALSE
    AND t.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY velocity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Thread detail with replies (nested one level)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_thread_with_replies(
  p_thread_id UUID,
  p_user_id   UUID
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
  depth         INTEGER
) AS $$
BEGIN
  RETURN QUERY
  -- Root thread
  SELECT
    t.id, t.user_id, t.content, t.media, t.parent_id, t.root_id,
    t.reply_count, t.like_count, t.repost_count, t.created_at,
    u.username, u.display_name, u.avatar_url, u.verified,
    EXISTS(SELECT 1 FROM public.likes l WHERE l.user_id = p_user_id AND l.thread_id = t.id),
    EXISTS(SELECT 1 FROM public.reposts r WHERE r.user_id = p_user_id AND r.thread_id = t.id),
    0 AS depth
  FROM public.threads t
  INNER JOIN public.users u ON u.id = t.user_id
  WHERE t.id = p_thread_id 
    AND t.is_deleted = FALSE
    AND t.id NOT IN (SELECT thread_id FROM public.hidden_threads WHERE user_id = p_user_id)

  UNION ALL

  -- Direct replies (depth 1)
  SELECT
    t.id, t.user_id, t.content, t.media, t.parent_id, t.root_id,
    t.reply_count, t.like_count, t.repost_count, t.created_at,
    u.username, u.display_name, u.avatar_url, u.verified,
    EXISTS(SELECT 1 FROM public.likes l WHERE l.user_id = p_user_id AND l.thread_id = t.id),
    EXISTS(SELECT 1 FROM public.reposts r WHERE r.user_id = p_user_id AND r.thread_id = t.id),
    1 AS depth
  FROM public.threads t
  INNER JOIN public.users u ON u.id = t.user_id
  WHERE t.parent_id = p_thread_id 
    AND t.is_deleted = FALSE
    AND t.id NOT IN (SELECT thread_id FROM public.hidden_threads WHERE user_id = p_user_id)
  ORDER BY like_count DESC, created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Search: full-text + trigram search across threads and users
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_all(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  result_type   TEXT,     -- 'user' or 'thread'
  result_id     UUID,
  display_text  TEXT,
  subtitle      TEXT,
  avatar_url    TEXT,
  verified      BOOLEAN,
  relevance     REAL
) AS $$
BEGIN
  RETURN QUERY
  -- Users
  SELECT
    'user'::TEXT,
    u.id,
    u.display_name,
    '@' || u.username,
    u.avatar_url,
    u.verified,
    similarity(u.username, p_query)::REAL + similarity(u.display_name, p_query)::REAL AS relevance
  FROM public.users u
  WHERE u.username % p_query OR u.display_name % p_query
  
  UNION ALL
  
  -- Threads
  SELECT
    'thread'::TEXT,
    t.id,
    LEFT(t.content, 100),
    '@' || u.username,
    u.avatar_url,
    u.verified,
    similarity(t.content, p_query)::REAL AS relevance
  FROM public.threads t
  INNER JOIN public.users u ON u.id = t.user_id
  WHERE t.content % p_query AND t.is_deleted = FALSE AND t.parent_id IS NULL

  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Personalization: Rebuild interest vector from engagement signals
-- Called periodically or after significant interaction
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rebuild_interest_vector(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_topics JSONB := '{}'::jsonb;
  rec RECORD;
BEGIN
  -- Aggregate topics from liked/reposted/bookmarked threads
  -- Weight: like=1, repost=2, bookmark=3
  FOR rec IN
    SELECT 'tech' AS topic, COUNT(*) AS cnt FROM (
      SELECT t.id
      FROM public.threads t
      INNER JOIN public.likes l ON l.thread_id = t.id AND l.user_id = p_user_id
      WHERE t.content ~* '\m(react|typescript|javascript|python|rust|api|code|developer|engineering|programming)\M'
      UNION ALL
      SELECT t.id
      FROM public.threads t
      INNER JOIN public.reposts r ON r.thread_id = t.id AND r.user_id = p_user_id
      WHERE t.content ~* '\m(react|typescript|javascript|python|rust|api|code|developer|engineering|programming)\M'
    ) sub
  LOOP
    IF rec.cnt > 0 THEN
      v_topics := v_topics || jsonb_build_object(rec.topic, LEAST(rec.cnt::real / 10.0, 1.0));
    END IF;
  END LOOP;

  INSERT INTO public.interest_vectors (user_id, topics, updated_at)
  VALUES (p_user_id, v_topics, NOW())
  ON CONFLICT (user_id) DO UPDATE SET topics = v_topics, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Personalization: Rebuild creator affinity from interactions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rebuild_creator_affinity(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Upsert affinity scores based on interactions
  INSERT INTO public.creator_affinities (user_id, creator_id, score, interactions, last_interaction)
  SELECT
    p_user_id,
    creator_id,
    -- Weighted score: follow=3, like=1, repost=2, comment=2
    (follow_score * 3.0 + like_count * 1.0 + repost_count * 2.0 + reply_count * 2.0) / 10.0,
    (like_count + repost_count + reply_count)::INTEGER,
    NOW()
  FROM (
    SELECT
      t.user_id AS creator_id,
      CASE WHEN EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = p_user_id AND f.following_id = t.user_id) THEN 1.0 ELSE 0.0 END AS follow_score,
      COUNT(DISTINCT l.id) AS like_count,
      COUNT(DISTINCT rp.id) AS repost_count,
      COUNT(DISTINCT reply.id) AS reply_count
    FROM public.threads t
    LEFT JOIN public.likes l ON l.thread_id = t.id AND l.user_id = p_user_id
    LEFT JOIN public.reposts rp ON rp.thread_id = t.id AND rp.user_id = p_user_id
    LEFT JOIN public.threads reply ON reply.parent_id = t.id AND reply.user_id = p_user_id
    WHERE t.user_id != p_user_id
    GROUP BY t.user_id
    HAVING COUNT(DISTINCT l.id) + COUNT(DISTINCT rp.id) + COUNT(DISTINCT reply.id) > 0
  ) agg
  ON CONFLICT (user_id, creator_id) DO UPDATE SET
    score = EXCLUDED.score,
    interactions = EXCLUDED.interactions,
    last_interaction = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Conversations: get user's conversations with last message + unread count
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_conversations(p_user_id UUID)
RETURNS TABLE (
  id                UUID,
  type              TEXT,
  name              TEXT,
  avatar_url        TEXT,
  is_muted          BOOLEAN,
  is_pinned         BOOLEAN,
  updated_at        TIMESTAMPTZ,
  last_message_content TEXT,
  last_message_type    TEXT,
  last_message_sender  UUID,
  last_message_at      TIMESTAMPTZ,
  unread_count      BIGINT,
  other_user_id     UUID,
  other_username    TEXT,
  other_display_name TEXT,
  other_avatar_url  TEXT,
  other_verified    BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.type, c.name, c.avatar_url, c.is_muted, c.is_pinned, c.updated_at,
    lm.content AS last_message_content,
    lm.type AS last_message_type,
    lm.sender_id AS last_message_sender,
    lm.created_at AS last_message_at,
    -- Unread count: messages after last_read_message
    (
      SELECT COUNT(*)::BIGINT
      FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.created_at > COALESCE(
          (SELECT m2.created_at FROM public.messages m2 WHERE m2.id = cp.last_read_message_id),
          '1970-01-01'::TIMESTAMPTZ
        )
        AND m.sender_id != p_user_id
    ) AS unread_count,
    -- For direct chats, include the other user
    other.id AS other_user_id,
    other.username AS other_username,
    other.display_name AS other_display_name,
    other.avatar_url AS other_avatar_url,
    other.verified AS other_verified
  FROM public.conversations c
  INNER JOIN public.conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = p_user_id
  LEFT JOIN public.messages lm ON lm.id = c.last_message_id
  LEFT JOIN LATERAL (
    SELECT u.*
    FROM public.conversation_participants cp2
    INNER JOIN public.users u ON u.id = cp2.user_id
    WHERE cp2.conversation_id = c.id AND cp2.user_id != p_user_id
    LIMIT 1
  ) other ON c.type = 'direct'
  ORDER BY c.is_pinned DESC, c.updated_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Notifications: create notification on interactions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_notification_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_author UUID;
BEGIN
  SELECT user_id INTO v_thread_author FROM public.threads WHERE id = NEW.thread_id;
  IF v_thread_author IS NOT NULL AND v_thread_author != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, thread_id)
    VALUES (v_thread_author, NEW.user_id, 'like', NEW.thread_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_on_like();

CREATE OR REPLACE FUNCTION public.create_notification_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM public.threads WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL AND v_parent_author != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, thread_id)
      VALUES (v_parent_author, NEW.user_id, 'reply', NEW.id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_reply AFTER INSERT ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_on_reply();

CREATE OR REPLACE FUNCTION public.create_notification_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_on_follow();

CREATE OR REPLACE FUNCTION public.create_notification_on_repost()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_author UUID;
BEGIN
  SELECT user_id INTO v_thread_author FROM public.threads WHERE id = NEW.thread_id;
  IF v_thread_author IS NOT NULL AND v_thread_author != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, thread_id)
    VALUES (v_thread_author, NEW.user_id, 'repost', NEW.thread_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_repost AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_on_repost();
