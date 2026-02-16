-- supabase/migrations/011_fix_rls_recursion.sql
-- Fixes '42P17' infinite recursion errors in RLS policies by using SECURITY DEFINER helper functions.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS recursion)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check if current user is a member of a conversation
CREATE OR REPLACE FUNCTION public.is_member_of_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = public.current_user_id()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is an admin of a conversation
CREATE OR REPLACE FUNCTION public.is_admin_of_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = public.current_user_id()
      AND role = 'admin'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. UPDATE CONVERSATION PARTICIPANTS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "participants_select_member" ON public.conversation_participants;
CREATE POLICY "participants_select_member" ON public.conversation_participants
  FOR SELECT USING (public.is_member_of_conversation(conversation_id));

DROP POLICY IF EXISTS "participants_insert_by_admin_or_creator" ON public.conversation_participants;
CREATE POLICY "participants_insert_by_admin_or_creator" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    public.is_admin_of_conversation(conversation_id)
    OR EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND created_by = public.current_user_id())
  );

DROP POLICY IF EXISTS "participants_delete_self_or_admin" ON public.conversation_participants;
CREATE POLICY "participants_delete_self_or_admin" ON public.conversation_participants
  FOR DELETE USING (
    user_id = public.current_user_id()
    OR public.is_admin_of_conversation(conversation_id)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. UPDATE CONVERSATIONS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant" ON public.conversations
  FOR SELECT USING (public.is_member_of_conversation(id));

DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
CREATE POLICY "conversations_update_participant" ON public.conversations
  FOR UPDATE USING (public.is_member_of_conversation(id));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. UPDATE MESSAGES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT USING (public.is_member_of_conversation(conversation_id));

DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = public.current_user_id()
    AND public.is_member_of_conversation(conversation_id)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. UPDATE MESSAGE REACTIONS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "reactions_select_participant" ON public.message_reactions;
CREATE POLICY "reactions_select_participant" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_member_of_conversation(m.conversation_id)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. UPDATE STORAGE POLICIES (Bypass recursion during insertion)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Chat Media
DROP POLICY IF EXISTS "chat_media_select_participant" ON storage.objects;
CREATE POLICY "chat_media_select_participant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-media'
    AND public.is_member_of_conversation(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "chat_media_insert_participant" ON storage.objects;
CREATE POLICY "chat_media_insert_participant" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media'
    AND public.is_member_of_conversation(((storage.foldername(name))[1])::uuid)
  );

-- Chat Audio (Voice Notes)
DROP POLICY IF EXISTS "chat_audio_select_participant" ON storage.objects;
CREATE POLICY "chat_audio_select_participant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-audio'
    AND public.is_member_of_conversation(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "chat_audio_insert_participant" ON storage.objects;
CREATE POLICY "chat_audio_insert_participant" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-audio'
    AND public.is_member_of_conversation(((storage.foldername(name))[1])::uuid)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. UPDATE CONVERSATION KEYS POLICIES (E2EE)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "conv_keys_insert_admin" ON public.conversation_keys;
CREATE POLICY "conv_keys_insert_admin" ON public.conversation_keys
  FOR INSERT WITH CHECK (public.is_admin_of_conversation(conversation_id));

DROP POLICY IF EXISTS "conv_keys_update_admin" ON public.conversation_keys;
CREATE POLICY "conv_keys_update_admin" ON public.conversation_keys
  FOR UPDATE USING (public.is_admin_of_conversation(conversation_id));
