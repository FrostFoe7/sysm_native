import { supabase, getCachedUserId } from './supabase';
import type { User, ReelWithAuthor, ReelCommentWithAuthor } from '@/types/types';

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio ?? '',
    verified: row.verified,
    followers_count: row.followers_count,
    following_count: row.following_count,
    created_at: row.created_at,
  };
}

function rowToReel(row: any, author: User): ReelWithAuthor {
  return {
    id: row.id,
    author_id: row.author_id,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    caption: row.caption,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    isLiked: row.is_liked ?? false,
    createdAt: row.created_at,
    aspectRatio: row.aspect_ratio ?? 0.5625,
    duration: row.duration ?? 0,
    author,
  };
}

async function getFeed(limit = 15, offset = 0): Promise<ReelWithAuthor[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('get_reels_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) =>
    rowToReel(row, {
      id: row.author_id,
      username: row.author_username,
      display_name: row.author_display_name,
      avatar_url: row.author_avatar_url,
      bio: '',
      verified: row.author_verified,
      followers_count: 0,
      following_count: 0,
      created_at: row.created_at,
    }),
  );
}

async function getReel(id: string): Promise<ReelWithAuthor | undefined> {
  const { data, error } = await supabase
    .from('reels')
    .select('*, users!reels_author_id_fkey(*)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error || !data) return undefined;
  return rowToReel(data, rowToUser(data.users));
}

async function getComments(reelId: string): Promise<ReelCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('reel_comments')
    .select('*, users!reel_comments_user_id_fkey(*)')
    .eq('reel_id', reelId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    reel_id: row.reel_id,
    user_id: row.user_id,
    content: row.content,
    likeCount: row.like_count,
    createdAt: row.created_at,
    author: rowToUser(row.users),
  }));
}

async function addComment(reelId: string, content: string): Promise<ReelCommentWithAuthor> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase
    .from('reel_comments')
    .insert({ reel_id: reelId, user_id: userId, content })
    .select('*, users!reel_comments_user_id_fkey(*)')
    .single();

  if (error || !data) throw error ?? new Error('Failed to add comment');

  return {
    id: data.id,
    reel_id: data.reel_id,
    user_id: data.user_id,
    content: data.content,
    likeCount: data.like_count,
    createdAt: data.created_at,
    author: rowToUser(data.users),
  };
}

async function getReelsByUser(userId: string): Promise<ReelWithAuthor[]> {
  const { data, error } = await supabase
    .from('reels')
    .select('*, users!reels_author_id_fkey(*)')
    .eq('author_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => rowToReel(row, rowToUser(row.users)));
}

async function toggleLike(reelId: string): Promise<{ liked: boolean; count: number }> {
  const userId = await getCachedUserId();

  const { data: existing } = await supabase
    .from('reel_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('reel_id', reelId)
    .maybeSingle();

  if (existing) {
    await supabase.from('reel_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('reel_likes').insert({ user_id: userId, reel_id: reelId });
  }

  const { data: reel } = await supabase
    .from('reels')
    .select('like_count')
    .eq('id', reelId)
    .single();

  return { liked: !existing, count: reel?.like_count ?? 0 };
}

async function trackReelView(reelId: string): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.from('feed_events').insert({
    user_id: userId,
    content_type: 'reel',
    content_id: reelId,
    signal_type: 'reel_watch',
    value: 1,
  });
  // Increment view count
  await supabase.rpc('increment_reel_views', { p_reel_id: reelId }).catch(() => {
    // If RPC doesn't exist yet, update directly
    supabase.from('reels').update({ view_count: supabase.rpc('', {}) as any }).eq('id', reelId);
  });
}

async function recordWatchTime(reelId: string, watchTimeMs: number, durationMs: number): Promise<void> {
  const userId = await getCachedUserId();
  const completionRate = durationMs > 0 ? watchTimeMs / durationMs : 0;

  await supabase.from('feed_events').insert({
    user_id: userId,
    content_type: 'reel',
    content_id: reelId,
    signal_type: 'reel_watch',
    value: watchTimeMs,
  });

  if (completionRate >= 0.9) {
    await supabase.from('feed_events').insert({
      user_id: userId,
      content_type: 'reel',
      content_id: reelId,
      signal_type: 'reel_complete',
      value: completionRate,
    });
  }
}

async function recordReplay(reelId: string): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.from('feed_events').insert({
    user_id: userId,
    content_type: 'reel',
    content_id: reelId,
    signal_type: 'reel_replay',
    value: 1,
  });
}

async function trackShare(reelId: string): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.from('feed_events').insert({
    user_id: userId,
    content_type: 'reel',
    content_id: reelId,
    signal_type: 'share',
    value: 1,
  });
}

async function isReelLiked(reelId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  const { data } = await supabase
    .from('reel_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('reel_id', reelId)
    .maybeSingle();

  return !!data;
}

export const ReelService = {
  getFeed,
  getReel,
  getComments,
  addComment,
  getReelsByUser,
  toggleLike,
  trackReelView,
  recordWatchTime,
  recordReplay,
  trackShare,
  isReelLiked,
};
