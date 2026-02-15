// services/ranking.service.ts
// Centralized ranking service — calls ONLY server-side RPCs
// No client scoring. No lifetime totals. No static popularity.

import { supabase, getCachedUserId } from './supabase';
import type { ThreadWithAuthor, ReelWithAuthor, User } from '@/types/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RankedThread extends ThreadWithAuthor {
  likes_24h: number;
  replies_24h: number;
  reposts_24h: number;
  velocity: number;
  final_score: number;
}

export interface RankedReel extends ReelWithAuthor {
  watch_ms_24h: number;
  completion_rate_24h: number;
  likes_24h: number;
  velocity: number;
  final_score: number;
}

export interface ExploreItem {
  content_type: 'thread' | 'reel';
  content_id: string;
  // Thread fields
  thread?: ThreadWithAuthor;
  // Reel fields
  reel?: ReelWithAuthor;
  // Common
  author: User;
  created_at: string;
  is_liked: boolean;
  engagement_24h: number;
  velocity: number;
  final_score: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rpcRowToAuthor(row: any): User {
  return {
    id: row.author_id ?? row.user_id,
    username: row.author_username,
    display_name: row.author_display_name ?? '',
    avatar_url: row.author_avatar_url ?? '',
    bio: '',
    verified: row.author_verified ?? false,
    followers_count: 0,
    following_count: 0,
    created_at: row.created_at,
  };
}

function rpcRowToThread(row: any): RankedThread {
  const author = rpcRowToAuthor(row);
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
    created_at: row.created_at,
    updated_at: row.created_at,
    author,
    likes_24h: row.likes_24h ?? 0,
    replies_24h: row.replies_24h ?? 0,
    reposts_24h: row.reposts_24h ?? 0,
    velocity: row.velocity ?? 0,
    final_score: row.final_score ?? 0,
  };
}

function rpcRowToReel(row: any): RankedReel {
  const author = rpcRowToAuthor(row);
  return {
    id: row.id,
    author_id: row.author_id,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    caption: row.caption,
    likeCount: row.like_count,
    commentCount: row.comment_count ?? 0,
    shareCount: row.share_count ?? 0,
    isLiked: row.is_liked ?? false,
    createdAt: row.created_at,
    aspectRatio: row.aspect_ratio ?? 0.5625,
    duration: row.duration ?? 0,
    author,
    watch_ms_24h: row.watch_ms_24h ?? 0,
    completion_rate_24h: row.completion_rate_24h ?? 0,
    likes_24h: row.likes_24h ?? 0,
    velocity: row.velocity ?? 0,
    final_score: row.final_score ?? 0,
  };
}

// ─── Ranked Threads ──────────────────────────────────────────────────────────

async function getRankedThreads(limit = 25, offset = 0): Promise<RankedThread[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('rpc_rank_threads', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const threads = (data ?? []).map(rpcRowToThread);

  // Record impressions for seen-content suppression
  if (threads.length > 0) {
    recordImpressions(threads.map((t: RankedThread) => t.id), 'thread').catch(() => {});
  }

  return threads;
}

// ─── Ranked Reels ────────────────────────────────────────────────────────────

async function getRankedReels(limit = 15, offset = 0): Promise<RankedReel[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('rpc_rank_reels', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const reels = (data ?? []).map(rpcRowToReel);

  if (reels.length > 0) {
    recordImpressions(reels.map((r: RankedReel) => r.id), 'reel').catch(() => {});
  }

  return reels;
}

// ─── Explore Feed ────────────────────────────────────────────────────────────

async function getExploreFeed(limit = 30, offset = 0): Promise<ExploreItem[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('rpc_explore_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const items: ExploreItem[] = (data ?? []).map((row: any) => {
    const author = rpcRowToAuthor(row);
    const item: ExploreItem = {
      content_type: row.content_type,
      content_id: row.content_id,
      author,
      created_at: row.created_at,
      is_liked: row.is_liked ?? false,
      engagement_24h: row.engagement_24h ?? 0,
      velocity: row.velocity ?? 0,
      final_score: row.final_score ?? 0,
    };

    if (row.content_type === 'thread') {
      item.thread = {
        id: row.content_id,
        user_id: row.author_id,
        content: row.thread_content ?? '',
        images: (row.thread_media ?? []).filter((m: any) => m?.type === 'image').map((m: any) => m.uri),
        media: row.thread_media ?? [],
        parent_id: null,
        root_id: null,
        reply_count: row.thread_reply_count ?? 0,
        like_count: row.thread_like_count ?? 0,
        repost_count: row.thread_repost_count ?? 0,
        created_at: row.created_at,
        updated_at: row.created_at,
        author,
      };
    } else {
      item.reel = {
        id: row.content_id,
        author_id: row.author_id,
        videoUrl: row.reel_video_url ?? '',
        thumbnailUrl: row.reel_thumbnail_url ?? '',
        caption: row.reel_caption ?? '',
        likeCount: row.reel_like_count ?? 0,
        commentCount: row.reel_comment_count ?? 0,
        shareCount: 0,
        isLiked: row.is_liked ?? false,
        createdAt: row.created_at,
        aspectRatio: row.reel_aspect_ratio ?? 0.5625,
        duration: row.reel_duration ?? 0,
        author,
      };
    }

    return item;
  });

  // Record impressions for both types
  const threadIds = items.filter((i) => i.content_type === 'thread').map((i) => i.content_id);
  const reelIds = items.filter((i) => i.content_type === 'reel').map((i) => i.content_id);
  if (threadIds.length) recordImpressions(threadIds, 'thread').catch(() => {});
  if (reelIds.length) recordImpressions(reelIds, 'reel').catch(() => {});

  return items;
}

// ─── Impression tracking ─────────────────────────────────────────────────────

async function recordImpressions(contentIds: string[], contentType: 'thread' | 'reel'): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.rpc('record_impressions', {
    p_user_id: userId,
    p_content_ids: contentIds,
    p_content_type: contentType,
  });
}

// ─── Watch time tracking ─────────────────────────────────────────────────────

async function recordReelWatch(reelId: string, watchMs: number, completed: boolean): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.rpc('record_reel_watch', {
    p_user_id: userId,
    p_reel_id: reelId,
    p_watch_ms: watchMs,
    p_completed: completed,
  });
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const RankingService = {
  getRankedThreads,
  getRankedReels,
  getExploreFeed,
  recordImpressions,
  recordReelWatch,
};
