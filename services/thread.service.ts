import { supabase, getCachedUserId } from './supabase';
import type { ThreadWithAuthor, ThreadWithReplies, MediaItem, User } from '@/types/types';

// ─── Row → Model mappers ────────────────────────────────────────────────────────

function rowToThread(row: any, author: User, repostedBy?: User): ThreadWithAuthor {
  return {
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    images: (row.media ?? []).filter((m: any) => m.type === 'image').map((m: any) => m.uri),
    media: row.media ?? [],
    parent_id: row.parent_id,
    root_id: row.root_id,
    reply_count: row.reply_count,
    like_count: row.like_count,
    repost_count: row.repost_count,
    is_liked: row.is_liked,
    is_reposted: row.is_reposted,
    is_bookmarked: row.is_bookmarked,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author,
    ...(repostedBy ? { reposted_by: repostedBy } : {}),
  };
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    verified: row.verified,
    followers_count: row.followers_count,
    following_count: row.following_count,
    created_at: row.created_at,
  };
}

// ─── Media Upload ──────────────────────────────────────────────────────────────

async function uploadMedia(item: MediaItem): Promise<string> {
  const userId = await getCachedUserId();
  const fileExt = item.uri.split('.').pop()?.toLowerCase() ?? (item.type === 'video' ? 'mp4' : 'jpg');
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  let blob: Blob;
  if (item.uri.startsWith('blob:')) {
    const response = await fetch(item.uri);
    blob = await response.blob();
  } else {
    // For native or other URI formats, we might need a different approach
    // but for web, fetch works for blob: and standard URLs.
    const response = await fetch(item.uri);
    blob = await response.blob();
  }

  const { error: uploadError } = await supabase.storage
    .from('thread-media')
    .upload(filePath, blob, {
      contentType: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('thread-media').getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── Feed queries ────────────────────────────────────────────────────────────────

async function getForYouFeed(limit = 25, offset = 0): Promise<ThreadWithAuthor[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('rpc_rank_threads', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) =>
    rowToThread(
      { ...row, media: row.media ?? [] },
      {
        id: row.user_id,
        username: row.author_username,
        display_name: row.author_display_name,
        avatar_url: row.author_avatar_url,
        bio: '',
        verified: row.author_verified,
        followers_count: 0,
        following_count: 0,
        created_at: row.created_at,
      },
    ),
  );
}

async function getFollowingFeed(limit = 30, offset = 0): Promise<ThreadWithAuthor[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('get_following_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) =>
    rowToThread(
      { ...row, media: row.media ?? [] },
      {
        id: row.user_id,
        username: row.author_username,
        display_name: row.author_display_name,
        avatar_url: row.author_avatar_url,
        bio: '',
        verified: row.author_verified,
        followers_count: 0,
        following_count: 0,
        created_at: row.created_at,
      },
    ),
  );
}

async function getFeed(): Promise<ThreadWithAuthor[]> {
  return getForYouFeed();
}

// ─── Thread detail ───────────────────────────────────────────────────────────────

async function getThreadDetail(threadId: string): Promise<ThreadWithReplies | null> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('get_thread_with_replies', {
    p_thread_id: threadId,
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) return null;

  const root = data.find((r: any) => r.depth === 0);
  if (!root) return null;

  const rootAuthor: User = {
    id: root.user_id,
    username: root.author_username,
    display_name: root.author_display_name,
    avatar_url: root.author_avatar_url,
    bio: '',
    verified: root.author_verified,
    followers_count: 0,
    following_count: 0,
    created_at: root.created_at,
  };

  const replies = data
    .filter((r: any) => r.depth === 1)
    .map((r: any) =>
      rowToThread(
        { ...r, media: r.media ?? [] },
        {
          id: r.user_id,
          username: r.author_username,
          display_name: r.author_display_name,
          avatar_url: r.author_avatar_url,
          bio: '',
          verified: r.author_verified,
          followers_count: 0,
          following_count: 0,
          created_at: r.created_at,
        },
      ),
    );

  return {
    ...rowToThread({ ...root, media: root.media ?? [] }, rootAuthor),
    replies,
  };
}

async function getThreadAncestors(threadId: string): Promise<ThreadWithAuthor[]> {
  const ancestors: ThreadWithAuthor[] = [];
  let currentId: string | null = threadId;

  while (currentId) {
    const { data: thread }: { data: any } = await supabase
      .from('threads')
      .select('*, users!threads_user_id_fkey(*)')
      .eq('id', currentId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (!thread?.parent_id) break;

    const { data: parent }: { data: any } = await supabase
      .from('threads')
      .select('*, users!threads_user_id_fkey(*)')
      .eq('id', thread.parent_id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (!parent) break;
    ancestors.unshift(rowToThread(parent, rowToUser(parent.users)));
    currentId = parent.parent_id;
  }

  return ancestors;
}

// ─── Mutations ──────────────────────────────────────────────────────────────────

async function toggleLike(threadId: string): Promise<{ liked: boolean; likeCount: number }> {
  const userId = await getCachedUserId();

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle();

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('likes').insert({ user_id: userId, thread_id: threadId });
  }

  // Fetch updated count
  const { data: thread } = await supabase
    .from('threads')
    .select('like_count')
    .eq('id', threadId)
    .single();

  return { liked: !existing, likeCount: thread?.like_count ?? 0 };
}

async function toggleRepost(threadId: string): Promise<{ reposted: boolean; repostCount: number }> {
  const userId = await getCachedUserId();

  const { data: existing } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle();

  if (existing) {
    await supabase.from('reposts').delete().eq('id', existing.id);
  } else {
    await supabase.from('reposts').insert({ user_id: userId, thread_id: threadId });
  }

  const { data: thread } = await supabase
    .from('threads')
    .select('repost_count')
    .eq('id', threadId)
    .single();

  return { reposted: !existing, repostCount: thread?.repost_count ?? 0 };
}

async function toggleBookmark(threadId: string): Promise<{ bookmarked: boolean }> {
  const userId = await getCachedUserId();

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle();

  if (existing) {
    await supabase.from('bookmarks').delete().eq('id', existing.id);
  } else {
    await supabase.from('bookmarks').insert({ user_id: userId, thread_id: threadId });
  }

  return { bookmarked: !existing };
}

async function createThread(content: string, _images?: string[], media?: MediaItem[]): Promise<ThreadWithAuthor> {
  const userId = await getCachedUserId();

  // Handle media uploads if any
  const uploadedMedia: MediaItem[] = [];
  if (media && media.length > 0) {
    for (const item of media) {
      const publicUrl = await uploadMedia(item);
      uploadedMedia.push({ ...item, uri: publicUrl });
    }
  }

  const { data, error } = await supabase
    .from('threads')
    .insert({
      user_id: userId,
      content,
      media: uploadedMedia,
    })
    .select('*, users!threads_user_id_fkey(*)')
    .single();

  if (error || !data) throw error ?? new Error('Failed to create thread');

  return rowToThread(data, rowToUser(data.users));
}

async function createReply(parentId: string, content: string, _images?: string[]): Promise<ThreadWithAuthor> {
  const userId = await getCachedUserId();

  // Get the root_id from the parent
  const { data: parent } = await supabase
    .from('threads')
    .select('root_id')
    .eq('id', parentId)
    .single();

  const rootId = parent?.root_id ?? parentId;

  const { data, error } = await supabase
    .from('threads')
    .insert({
      user_id: userId,
      content,
      parent_id: parentId,
      root_id: rootId,
      media: [],
    })
    .select('*, users!threads_user_id_fkey(*)')
    .single();

  if (error || !data) throw error ?? new Error('Failed to create reply');

  return rowToThread(data, rowToUser(data.users));
}

async function hideThread(threadId: string): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.from('hidden_threads').insert({ user_id: userId, thread_id: threadId });
}

async function deleteThread(threadId: string): Promise<boolean> {
  const { error } = await supabase
    .from('threads')
    .update({ is_deleted: true })
    .eq('id', threadId);

  return !error;
}

async function isLikedByCurrentUser(threadId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle();

  return !!data;
}

async function isRepostedByCurrentUser(threadId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  const { data } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle();

  return !!data;
}

async function isBookmarkedByCurrentUser(threadId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle();

  return !!data;
}

async function getBookmarkedThreads(): Promise<ThreadWithAuthor[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase
    .from('bookmarks')
    .select('thread_id, threads(*, users!threads_user_id_fkey(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row: any) => row.threads && !row.threads.is_deleted)
    .map((row: any) => rowToThread(row.threads, rowToUser(row.threads.users)));
}

async function getTrending(limit = 10): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_trending', { p_limit: limit });
  if (error) return [];
  return data ?? [];
}

export const ThreadService = {
  getForYouFeed,
  getFollowingFeed,
  getFeed,
  getThreadDetail,
  getThreadAncestors,
  toggleLike,
  toggleRepost,
  toggleBookmark,
  createThread,
  createReply,
  hideThread,
  deleteThread,
  isLikedByCurrentUser,
  isRepostedByCurrentUser,
  isBookmarkedByCurrentUser,
  getBookmarkedThreads,
  getTrending,
};
