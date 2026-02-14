-- supabase/migrations/004_realtime.sql
-- Enable realtime subscriptions for live data updates

-- ═══════════════════════════════════════════════════════════════════════════════
-- Realtime: enable on tables that need live updates
-- ═══════════════════════════════════════════════════════════════════════════════

-- Messages: live chat delivery, typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Message reactions: live reaction updates in chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Conversation participants: typing indicators, member changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Notifications: push to client in real time
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Likes: live like count animation
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;

-- Follows: live follower count update
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;

-- Threads: live new thread appearance
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
