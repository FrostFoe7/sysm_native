-- supabase/migrations/002_rls_policies.sql
-- Row Level Security policies for all tables
-- Principle: users can read public content, write only their own data

-- ═══════════════════════════════════════════════════════════════════════════════
-- Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_affinities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's internal UUID from auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "users_select_public" ON public.users
  FOR SELECT USING (TRUE);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Users cannot delete their own row (use soft-delete / admin action)

-- ═══════════════════════════════════════════════════════════════════════════════
-- THREADS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "threads_select_visible" ON public.threads
  FOR SELECT USING (
    is_deleted = FALSE
    AND user_id NOT IN (
      SELECT muted_user_id FROM public.muted_users WHERE user_id = public.current_user_id()
    )
    AND id NOT IN (
      SELECT thread_id FROM public.hidden_threads WHERE user_id = public.current_user_id()
    )
  );

CREATE POLICY "threads_insert_own" ON public.threads
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "threads_update_own" ON public.threads
  FOR UPDATE USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "threads_delete_own" ON public.threads
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- REELS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reels_select_public" ON public.reels
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "reels_insert_own" ON public.reels
  FOR INSERT WITH CHECK (author_id = public.current_user_id());

CREATE POLICY "reels_update_own" ON public.reels
  FOR UPDATE USING (author_id = public.current_user_id());

CREATE POLICY "reels_delete_own" ON public.reels
  FOR DELETE USING (author_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- REEL COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reel_comments_select" ON public.reel_comments
  FOR SELECT USING (TRUE);

CREATE POLICY "reel_comments_insert_own" ON public.reel_comments
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "reel_comments_delete_own" ON public.reel_comments
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- LIKES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "likes_select" ON public.likes
  FOR SELECT USING (TRUE);

CREATE POLICY "likes_insert_own" ON public.likes
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "likes_delete_own" ON public.likes
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- FOLLOWS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "follows_select" ON public.follows
  FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT WITH CHECK (follower_id = public.current_user_id());

CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE USING (follower_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPOSTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reposts_select" ON public.reposts
  FOR SELECT USING (TRUE);

CREATE POLICY "reposts_insert_own" ON public.reposts
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "reposts_delete_own" ON public.reposts
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- BOOKMARKS (private - only visible to owner)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "bookmarks_select_own" ON public.bookmarks
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- REEL LIKES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reel_likes_select" ON public.reel_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "reel_likes_insert_own" ON public.reel_likes
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "reel_likes_delete_own" ON public.reel_likes
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- MUTED USERS (private to owner)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "muted_select_own" ON public.muted_users
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "muted_insert_own" ON public.muted_users
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "muted_delete_own" ON public.muted_users
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- HIDDEN THREADS (private to owner)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "hidden_select_own" ON public.hidden_threads
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "hidden_insert_own" ON public.hidden_threads
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "hidden_delete_own" ON public.hidden_threads
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORTS (write-only: users can submit but not view their own reports)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = public.current_user_id());

-- No select for regular users - admin only via service_role

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONVERSATIONS (participants only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "conversations_select_participant" ON public.conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id()
    )
  );

CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT WITH CHECK (created_by = public.current_user_id());

CREATE POLICY "conversations_update_participant" ON public.conversations
  FOR UPDATE USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONVERSATION PARTICIPANTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "participants_select_member" ON public.conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id()
    )
  );

CREATE POLICY "participants_insert_admin" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    -- Allow initial creation by conversation creator or admin adding members
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id() AND role = 'admin'
    )
    OR user_id = public.current_user_id()  -- user joining themselves
  );

CREATE POLICY "participants_update_own" ON public.conversation_participants
  FOR UPDATE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- MESSAGES (conversation participants only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id()
    )
  );

CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = public.current_user_id()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = public.current_user_id()
    )
  );

CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (sender_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- MESSAGE REACTIONS (conversation participants only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reactions_select_participant" ON public.message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      INNER JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = public.current_user_id()
    )
  );

CREATE POLICY "reactions_insert_own" ON public.message_reactions
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "reactions_delete_own" ON public.message_reactions
  FOR DELETE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS (own only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = public.current_user_id());

-- Notifications are inserted by server triggers / edge functions (service_role)

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEED EVENTS (own only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "feed_events_select_own" ON public.feed_events
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "feed_events_insert_own" ON public.feed_events
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- INTEREST VECTORS (own only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "interest_vectors_select_own" ON public.interest_vectors
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "interest_vectors_upsert_own" ON public.interest_vectors
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "interest_vectors_update_own" ON public.interest_vectors
  FOR UPDATE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATOR AFFINITIES (own only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "creator_affinities_select_own" ON public.creator_affinities
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "creator_affinities_insert_own" ON public.creator_affinities
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "creator_affinities_update_own" ON public.creator_affinities
  FOR UPDATE USING (user_id = public.current_user_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- ANALYTICS EVENTS (own only for insert; read via service_role for dashboards)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "analytics_insert_own" ON public.analytics_events
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

-- Select disabled for regular users - admin dashboards use service_role
