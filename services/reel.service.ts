import { supabase, getCachedUserId } from "./supabase";
import type {
  User,
  ReelWithAuthor,
  ReelCommentWithAuthor,
} from "@/types/types";

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio ?? "",
    verified: row.verified,
    is_private: row.is_private ?? false,
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
    viewCount: row.view_count ?? 0,
    isLiked: row.is_liked ?? false,
    createdAt: row.created_at,
    aspectRatio: row.aspect_ratio ?? 0.5625,
    duration: row.duration ?? 0,
    author,
  };
}

async function getFeed(limit = 15, offset = 0): Promise<ReelWithAuthor[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc("rpc_rank_reels", {
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
      bio: "",
      verified: row.author_verified,
      is_private: false,
      followers_count: 0,
      following_count: 0,
      created_at: row.created_at,
    }),
  );
}

async function getReel(id: string): Promise<ReelWithAuthor | undefined> {
  const { data, error } = await supabase
    .from("reels")
    .select("*, users!reels_author_id_fkey(*)")
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error || !data) return undefined;
  return rowToReel(data, rowToUser(data.users));
}

async function getComments(reelId: string): Promise<ReelCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("reel_comments")
    .select("*, users!reel_comments_user_id_fkey(*)")
    .eq("reel_id", reelId)
    .order("created_at", { ascending: false });

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

async function addComment(
  reelId: string,
  content: string,
): Promise<ReelCommentWithAuthor> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase
    .from("reel_comments")
    .insert({ reel_id: reelId, user_id: userId, content })
    .select("*, users!reel_comments_user_id_fkey(*)")
    .single();

  if (error || !data) throw error ?? new Error("Failed to add comment");

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
    .from("reels")
    .select("*, users!reels_author_id_fkey(*)")
    .eq("author_id", userId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => rowToReel(row, rowToUser(row.users)));
}

async function toggleLike(
  reelId: string,
): Promise<{ liked: boolean; count: number }> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc("toggle_reel_like", {
    p_user_id: userId,
    p_reel_id: reelId,
  });

  if (error) throw error;
  const row = data?.[0] ?? data;
  return { liked: row?.liked ?? false, count: row?.like_count ?? 0 };
}

async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("reel_comments")
    .update({ is_deleted: true })
    .eq("id", commentId);

  if (error) throw error;
}

async function toggleReelBookmark(
  reelId: string,
): Promise<{ bookmarked: boolean }> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc("toggle_reel_bookmark", {
    p_user_id: userId,
    p_reel_id: reelId,
  });

  if (error) throw error;
  return { bookmarked: data ?? false };
}

async function reportReel(
  reelId: string,
  reason: string,
): Promise<void> {
  const userId = await getCachedUserId();

  const { error } = await supabase.rpc("submit_report", {
    p_reporter_id: userId,
    p_content_type: "reel",
    p_content_id: reelId,
    p_reason: reason,
  });

  if (error) throw error;
}

async function trackReelView(reelId: string): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.from("feed_events").insert({
    user_id: userId,
    content_type: "reel",
    content_id: reelId,
    signal_type: "reel_watch",
    value: 1,
  });
  // Increment view count
  try {
    await supabase.rpc("increment_reel_views", { p_reel_id: reelId });
  } catch {
    // RPC may not exist yet
  }
}

async function recordWatchTime(
  reelId: string,
  watchTimeMs: number,
  durationMs: number,
): Promise<void> {
  const userId = await getCachedUserId();
  const completionRate = durationMs > 0 ? watchTimeMs / durationMs : 0;
  const completed = completionRate >= 0.9;

  // Use new ranking-engine RPC for structured watch tracking
  try {
    await supabase.rpc("record_reel_watch", {
      p_user_id: userId,
      p_reel_id: reelId,
      p_watch_ms: Math.round(watchTimeMs),
      p_completed: completed,
    });
  } catch {
    // Fallback to feed_events
    await supabase.from("feed_events").insert({
      user_id: userId,
      content_type: "reel",
      content_id: reelId,
      signal_type: "reel_watch",
      value: watchTimeMs,
    });
  }
}

async function recordReplay(reelId: string): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.from("feed_events").insert({
    user_id: userId,
    content_type: "reel",
    content_id: reelId,
    signal_type: "reel_replay",
    value: 1,
  });
}

async function trackShare(reelId: string): Promise<void> {
  const userId = await getCachedUserId();
  await supabase.from("feed_events").insert({
    user_id: userId,
    content_type: "reel",
    content_id: reelId,
    signal_type: "share",
    value: 1,
  });
}

async function isReelLiked(reelId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  const { data } = await supabase
    .from("reel_likes")
    .select("id")
    .eq("user_id", userId)
    .eq("reel_id", reelId)
    .maybeSingle();

  return !!data;
}

export const ReelService = {
  getFeed,
  getReel,
  getComments,
  addComment,
  deleteComment,
  getReelsByUser,
  toggleLike,
  toggleReelBookmark,
  reportReel,
  trackReelView,
  recordWatchTime,
  recordReplay,
  trackShare,
  isReelLiked,
};
