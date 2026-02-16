-- supabase/migrations/003_storage.sql
-- Storage buckets and policies for media uploads

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', TRUE, 5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  ('thread-media', 'thread-media', TRUE, 10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
  ),
  ('reel-videos', 'reel-videos', TRUE, 104857600, -- 100 MB
    ARRAY['video/mp4', 'video/quicktime', 'video/webm']
  ),
  ('chat-media', 'chat-media', FALSE, 26214400, -- 25 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
  )
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AVATARS: public read, authenticated users upload their own
-- ═══════════════════════════════════════════════════════════════════════════════

-- Anyone can view avatars (bucket is public)
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can upload to their own folder: avatars/{user_id}/{filename}
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

-- Users can update their own avatars
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

-- Users can delete their own avatars
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- THREAD MEDIA: public read, owner upload
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "thread_media_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'thread-media');

-- Upload path: thread-media/{user_id}/{filename}
CREATE POLICY "thread_media_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thread-media'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

CREATE POLICY "thread_media_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'thread-media'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

CREATE POLICY "thread_media_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'thread-media'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- REEL VIDEOS: public read, owner upload
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "reel_videos_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'reel-videos');

-- Upload path: reel-videos/{user_id}/{filename}
CREATE POLICY "reel_videos_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reel-videos'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

CREATE POLICY "reel_videos_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'reel-videos'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

CREATE POLICY "reel_videos_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reel-videos'
    AND (storage.foldername(name))[1] = public.current_user_id()::text
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHAT MEDIA: conversation participants only (bucket is private)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Read: only conversation participants can view
CREATE POLICY "chat_media_select_participant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] IN (
      SELECT cp.conversation_id::text
      FROM public.conversation_participants cp
      WHERE cp.user_id = public.current_user_id()
    )
  );

-- Upload: only authenticated users in the conversation
CREATE POLICY "chat_media_insert_participant" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] IN (
      SELECT cp.conversation_id::text
      FROM public.conversation_participants cp
      WHERE cp.user_id = public.current_user_id()
    )
  );

-- Delete: only the uploader (matched by auth)
CREATE POLICY "chat_media_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-media'
    AND owner = auth.uid()
  );
