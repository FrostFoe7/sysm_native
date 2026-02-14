-- supabase/migrations/001_initial_schema.sql
-- Core database schema for Sysm social platform
-- Tables: users, threads, reels, interactions, conversations, messages, analytics

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search

-- ═══════════════════════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 1 AND char_length(username) <= 30),
  display_name  TEXT NOT NULL CHECK (char_length(display_name) <= 50),
  avatar_url    TEXT DEFAULT '',
  bio           TEXT DEFAULT '' CHECK (char_length(bio) <= 150),
  verified      BOOLEAN DEFAULT FALSE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_private    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON public.users USING btree (username);
CREATE INDEX idx_users_auth_id ON public.users USING btree (auth_id);
CREATE INDEX idx_users_display_name_trgm ON public.users USING gin (display_name gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════════════
-- THREADS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.threads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) <= 500),
  media         JSONB DEFAULT '[]'::jsonb,  -- [{uri, type, width, height, thumbnailUri}]
  parent_id     UUID REFERENCES public.threads(id) ON DELETE SET NULL,
  root_id       UUID REFERENCES public.threads(id) ON DELETE SET NULL,
  reply_count   INTEGER DEFAULT 0,
  like_count    INTEGER DEFAULT 0,
  repost_count  INTEGER DEFAULT 0,
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_user_id ON public.threads USING btree (user_id);
CREATE INDEX idx_threads_parent_id ON public.threads USING btree (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_threads_root_id ON public.threads USING btree (root_id) WHERE root_id IS NOT NULL;
CREATE INDEX idx_threads_created_at ON public.threads USING btree (created_at DESC);
CREATE INDEX idx_threads_root_only ON public.threads USING btree (created_at DESC) WHERE parent_id IS NULL AND is_deleted = FALSE;
CREATE INDEX idx_threads_content_trgm ON public.threads USING gin (content gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════════════
-- REELS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.reels (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_url     TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  caption       TEXT DEFAULT '' CHECK (char_length(caption) <= 2200),
  like_count    INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count   INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  is_liked      BOOLEAN DEFAULT FALSE,  -- materialized for current user via RPC
  aspect_ratio  REAL DEFAULT 0.5625,   -- 9/16
  duration      REAL DEFAULT 0,        -- seconds
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reels_author_id ON public.reels USING btree (author_id);
CREATE INDEX idx_reels_created_at ON public.reels USING btree (created_at DESC) WHERE is_deleted = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- REEL COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.reel_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id       UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) <= 500),
  like_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reel_comments_reel_id ON public.reel_comments USING btree (reel_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INTERACTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.likes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id     UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, thread_id)
);

CREATE INDEX idx_likes_thread_id ON public.likes USING btree (thread_id);
CREATE INDEX idx_likes_user_id ON public.likes USING btree (user_id);

CREATE TABLE public.follows (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON public.follows USING btree (follower_id);
CREATE INDEX idx_follows_following ON public.follows USING btree (following_id);

CREATE TABLE public.reposts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id     UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, thread_id)
);

CREATE INDEX idx_reposts_user_id ON public.reposts USING btree (user_id);
CREATE INDEX idx_reposts_thread_id ON public.reposts USING btree (thread_id);

CREATE TABLE public.bookmarks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id     UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, thread_id)
);

CREATE INDEX idx_bookmarks_user_id ON public.bookmarks USING btree (user_id, created_at DESC);

CREATE TABLE public.reel_likes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reel_id       UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reel_id)
);

CREATE INDEX idx_reel_likes_reel_id ON public.reel_likes USING btree (reel_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MODERATION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.muted_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  muted_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, muted_user_id)
);

CREATE TABLE public.hidden_threads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id     UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, thread_id)
);

CREATE TABLE public.reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type  TEXT NOT NULL CHECK (content_type IN ('thread', 'reel', 'user', 'message')),
  content_id    UUID NOT NULL,
  reason        TEXT DEFAULT '',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONVERSATIONS & MESSAGES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  name          TEXT CHECK (char_length(name) <= 50),
  avatar_url    TEXT,
  created_by    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_id UUID,
  is_muted      BOOLEAN DEFAULT FALSE,
  is_pinned     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_updated ON public.conversations USING btree (updated_at DESC);

CREATE TABLE public.conversation_participants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role              TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  last_read_message_id UUID,
  is_typing         BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON public.conversation_participants USING btree (user_id);
CREATE INDEX idx_conv_participants_conv ON public.conversation_participants USING btree (conversation_id);

CREATE TABLE public.messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'reel_share', 'thread_share', 'voice_note', 'system')),
  content           TEXT DEFAULT '',
  media_url         TEXT,
  media_thumbnail   TEXT,
  reply_to_id       UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  shared_thread_id  UUID REFERENCES public.threads(id) ON DELETE SET NULL,
  shared_reel_id    UUID REFERENCES public.reels(id) ON DELETE SET NULL,
  status            TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'seen')),
  is_deleted        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conv ON public.messages USING btree (conversation_id, created_at ASC);
CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);

CREATE TABLE public.message_reactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id    UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_msg_reactions_message ON public.message_reactions USING btree (message_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('like', 'reply', 'follow', 'mention', 'repost', 'message')),
  thread_id     UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  reel_id       UUID REFERENCES public.reels(id) ON DELETE CASCADE,
  message_id    UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE is_read = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEED EVENTS (Engagement Signals for Ranking)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.feed_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type  TEXT NOT NULL CHECK (content_type IN ('thread', 'reel')),
  content_id    UUID NOT NULL,
  signal_type   TEXT NOT NULL CHECK (signal_type IN (
    'like', 'comment', 'repost', 'save', 'share',
    'dwell', 'profile_visit', 'follow_after', 'click_expand',
    'reel_watch', 'reel_complete', 'reel_replay', 'reel_skip',
    'report', 'hide', 'mute'
  )),
  value         REAL DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_events_user ON public.feed_events USING btree (user_id, created_at DESC);
CREATE INDEX idx_feed_events_content ON public.feed_events USING btree (content_type, content_id);
CREATE INDEX idx_feed_events_signal ON public.feed_events USING btree (signal_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INTEREST VECTORS (User Personalization)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.interest_vectors (
  user_id       UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  topics        JSONB DEFAULT '{}'::jsonb,  -- {"tech": 0.9, "design": 0.7, ...}
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.creator_affinities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  creator_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score         REAL DEFAULT 0,
  interactions  INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, creator_id)
);

CREATE INDEX idx_creator_affinities_user ON public.creator_affinities USING btree (user_id, score DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ANALYTICS EVENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.analytics_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  properties    JSONB DEFAULT '{}'::jsonb,
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_user ON public.analytics_events USING btree (user_id, created_at DESC);
CREATE INDEX idx_analytics_type ON public.analytics_events USING btree (event_type, created_at DESC);

-- Partition analytics by month for performance (optional, add when needed)
-- CREATE TABLE public.analytics_events_2026_02 PARTITION OF public.analytics_events
--   FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Auto-update timestamps
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_threads_updated_at BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_reels_updated_at BEFORE UPDATE ON public.reels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Denormalized count management
-- ═══════════════════════════════════════════════════════════════════════════════

-- Like count sync
CREATE OR REPLACE FUNCTION public.sync_thread_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.threads SET like_count = like_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.threads SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_likes_count AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_thread_like_count();

-- Follow count sync
CREATE OR REPLACE FUNCTION public.sync_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE public.users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_follows_count AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.sync_follow_counts();

-- Reply count sync
CREATE OR REPLACE FUNCTION public.sync_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.threads SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE public.threads SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_threads_reply_count AFTER INSERT OR DELETE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.sync_reply_count();

-- Repost count sync
CREATE OR REPLACE FUNCTION public.sync_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.threads SET repost_count = repost_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.threads SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reposts_count AFTER INSERT OR DELETE ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.sync_repost_count();

-- Reel like count sync
CREATE OR REPLACE FUNCTION public.sync_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET like_count = like_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reel_likes_count AFTER INSERT OR DELETE ON public.reel_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_reel_like_count();

-- Reel comment count sync
CREATE OR REPLACE FUNCTION public.sync_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET comment_count = comment_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reel_comments_count AFTER INSERT OR DELETE ON public.reel_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_reel_comment_count();

-- Conversation last_message_id sync
CREATE OR REPLACE FUNCTION public.sync_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET last_message_id = NEW.id, updated_at = NOW()
    WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_messages_last AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sync_conversation_last_message();
