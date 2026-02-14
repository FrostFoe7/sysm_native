// db/selectors.ts

import { db } from './db';
import { CURRENT_USER_ID } from '@/constants/app';
import type { User, Thread, ThreadWithAuthor, ThreadWithReplies, MediaItem, ActivityItem } from '@/types/types';

// ─── Hydration helpers ──────────────────────────────────────────────────────────

function hydrateThread(thread: Thread): ThreadWithAuthor {
  const author = db.getUserById(thread.user_id);
  if (!author) {
    throw new Error(`User not found for thread ${thread.id}`);
  }
  return { ...thread, author };
}

function hydrateThreadWithReplies(thread: Thread): ThreadWithReplies {
  const hydrated = hydrateThread(thread);
  const rawReplies = db.getRepliesForThread(thread.id);
  const replies = rawReplies.map(hydrateThread);
  return { ...hydrated, replies };
}

// ─── Time formatting ────────────────────────────────────────────────────────────

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSeconds < 60) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 52) return `${diffWeeks}w`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return count.toString();
}

// ─── Feed selectors ─────────────────────────────────────────────────────────────

export function getFeed(): ThreadWithAuthor[] {
  const rootThreads = db.getRootThreads();
  const filtered = rootThreads.filter(
    (t) => !db.isUserMuted(t.user_id) && !db.isThreadHidden(t.id),
  );
  const hydrated = filtered.map(hydrateThread);

  const followingIds = db
    .getFollowing(CURRENT_USER_ID)
    .map((u) => u.id);

  const repostItems: ThreadWithAuthor[] = [];
  for (const uid of followingIds) {
    const reposts = db.getRepostsByUserId(uid);
    for (const rp of reposts) {
      const thread = db.getThreadById(rp.thread_id);
      if (
        !thread ||
        thread.parent_id !== null ||
        thread.user_id === CURRENT_USER_ID ||
        db.isUserMuted(thread.user_id) ||
        db.isThreadHidden(thread.id)
      )
        continue;
      if (hydrated.some((h) => h.id === thread.id)) continue;
      if (repostItems.some((r) => r.id === thread.id)) continue;
      const reposter = db.getUserById(uid);
      if (!reposter) continue;
      const author = db.getUserById(thread.user_id);
      if (!author) continue;
      repostItems.push({
        ...thread,
        author,
        reposted_by: reposter,
      });
    }
  }

  const combined = [...hydrated, ...repostItems];
  combined.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return combined;
}

export function getFeedPaginated(page: number, pageSize: number = 10): ThreadWithAuthor[] {
  const feed = getFeed();
  const start = page * pageSize;
  return feed.slice(start, start + pageSize);
}

// ─── Thread detail selectors ────────────────────────────────────────────────────

export function getThreadDetail(threadId: string): ThreadWithReplies | null {
  const thread = db.getThreadById(threadId);
  if (!thread) return null;
  return hydrateThreadWithReplies(thread);
}

export function getThreadAncestors(threadId: string): ThreadWithAuthor[] {
  const ancestors: ThreadWithAuthor[] = [];
  let current = db.getThreadById(threadId);

  while (current?.parent_id) {
    const parent = db.getThreadById(current.parent_id);
    if (!parent) break;
    ancestors.unshift(hydrateThread(parent));
    current = parent;
  }

  return ancestors;
}

// ─── Profile selectors ─────────────────────────────────────────────────────────

export function getProfile(userId: string): {
  user: User;
  threads: ThreadWithAuthor[];
  replies: ThreadWithAuthor[];
  likedThreadIds: string[];
  followersCount: number;
  followingCount: number;
  isFollowedByCurrentUser: boolean;
  isCurrentUser: boolean;
} | null {
  const user = db.getUserById(userId);
  if (!user) return null;

  const threads = db.getThreadsByUserId(userId).map(hydrateThread);
  const replies = db.getRepliesByUserId(userId).map(hydrateThread);
  const likes = db.getLikesByUserId(userId);
  const likedThreadIds = likes.map((l) => l.thread_id);
  const isFollowedByCurrentUser = db.isFollowing(CURRENT_USER_ID, userId);

  return {
    user,
    threads,
    replies,
    likedThreadIds,
    followersCount: user.followers_count,
    followingCount: user.following_count,
    isFollowedByCurrentUser,
    isCurrentUser: userId === CURRENT_USER_ID,
  };
}

export function getProfileByUsername(username: string) {
  const user = db.getUserByUsername(username);
  if (!user) return null;
  return getProfile(user.id);
}

export function getCurrentUser(): User {
  const user = db.getUserById(CURRENT_USER_ID);
  if (!user) throw new Error('Current user not found');
  return user;
}

// ─── Explore / Search selectors ─────────────────────────────────────────────────

export function getExploreUsers(): User[] {
  return db
    .getAllUsers()
    .filter((u) => u.id !== CURRENT_USER_ID && !db.isUserMuted(u.id))
    .sort((a, b) => b.followers_count - a.followers_count);
}

export function getTrendingThreads(): ThreadWithAuthor[] {
  const rootThreads = db.getRootThreads();
  const sorted = [...rootThreads]
    .filter((t) => !db.isUserMuted(t.user_id) && !db.isThreadHidden(t.id))
    .sort((a, b) => {
      const scoreA = a.like_count + a.reply_count * 2 + a.repost_count * 1.5;
      const scoreB = b.like_count + b.reply_count * 2 + b.repost_count * 1.5;
      return scoreB - scoreA;
    });
  return sorted.map(hydrateThread);
}

export function searchAll(query: string): {
  users: User[];
  threads: ThreadWithAuthor[];
} {
  if (!query.trim()) return { users: [], threads: [] };
  const users = db
    .searchUsers(query)
    .filter((u) => !db.isUserMuted(u.id));
  const threads = db
    .searchThreads(query)
    .filter((t) => !db.isUserMuted(t.user_id) && !db.isThreadHidden(t.id))
    .map(hydrateThread);
  return { users, threads };
}

// ─── Interaction selectors ──────────────────────────────────────────────────────

export function isThreadLikedByCurrentUser(threadId: string): boolean {
  return db.isLikedByUser(CURRENT_USER_ID, threadId);
}

export function isUserFollowedByCurrentUser(userId: string): boolean {
  return db.isFollowing(CURRENT_USER_ID, userId);
}

// ─── Interaction mutations (selector-level wrappers) ────────────────────────────

export function toggleThreadLike(threadId: string): { liked: boolean; likeCount: number } {
  const liked = db.toggleLike(CURRENT_USER_ID, threadId);
  const thread = db.getThreadById(threadId);
  return { liked, likeCount: thread?.like_count ?? 0 };
}

export function toggleUserFollow(userId: string): { following: boolean; followersCount: number } {
  const following = db.toggleFollow(CURRENT_USER_ID, userId);
  const user = db.getUserById(userId);
  return { following, followersCount: user?.followers_count ?? 0 };
}

export function createNewThread(content: string, images?: string[], media?: MediaItem[]): ThreadWithAuthor {
  const thread = db.createThread({
    user_id: CURRENT_USER_ID,
    content,
    images,
    media,
  });
  return hydrateThread(thread);
}

export function createReply(
  parentId: string,
  content: string,
  images?: string[],
): ThreadWithAuthor {
  const parent = db.getThreadById(parentId);
  const rootId = parent?.root_id ?? parentId;

  const thread = db.createThread({
    user_id: CURRENT_USER_ID,
    content,
    images,
    parent_id: parentId,
    root_id: rootId,
  });
  return hydrateThread(thread);
}

// ─── Repost mutations ───────────────────────────────────────────────────────────

export function isRepostedByCurrentUser(threadId: string): boolean {
  return db.isRepostedByUser(CURRENT_USER_ID, threadId);
}

export function toggleRepost(threadId: string): { reposted: boolean; repostCount: number } {
  const reposted = db.toggleRepost(CURRENT_USER_ID, threadId);
  const thread = db.getThreadById(threadId);
  return { reposted, repostCount: thread?.repost_count ?? 0 };
}

// ─── Profile update ─────────────────────────────────────────────────────────────

export function updateCurrentUser(
  updates: Partial<Pick<User, 'display_name' | 'username' | 'bio' | 'avatar_url'>>,
): User {
  const user = db.updateUser(CURRENT_USER_ID, updates);
  if (!user) throw new Error('Current user not found');
  return user;
}

// ─── Mute / Hide / Delete mutations ─────────────────────────────────────────────

export function muteUser(userId: string): void {
  db.muteUser(userId);
}

export function unmuteUser(userId: string): void {
  db.unmuteUser(userId);
}

export function isUserMuted(userId: string): boolean {
  return db.isUserMuted(userId);
}

export function hideThread(threadId: string): void {
  db.hideThread(threadId);
}

export function unhideThread(threadId: string): void {
  db.unhideThread(threadId);
}

export function isThreadHidden(threadId: string): boolean {
  return db.isThreadHidden(threadId);
}

export function deleteThread(threadId: string): boolean {
  return db.deleteThread(threadId);
}

// ─── Suggested follows ──────────────────────────────────────────────────────────

export function getSuggestedFollows(): (User & { isFollowing: boolean })[] {
  return db
    .getAllUsers()
    .filter((u) => u.id !== CURRENT_USER_ID)
    .map((u) => ({
      ...u,
      isFollowing: db.isFollowing(CURRENT_USER_ID, u.id),
    }))
    .sort((a, b) => {
      if (a.isFollowing !== b.isFollowing) return a.isFollowing ? 1 : -1;
      return b.followers_count - a.followers_count;
    })
    .slice(0, 5);
}

// ─── Activity / Notifications (simplified) ──────────────────────────────────────

export function getActivity(): ActivityItem[] {
  const items: ActivityItem[] = [];

  const currentUserThreadIds = db
    .getThreadsByUserId(CURRENT_USER_ID)
    .map((t) => t.id);

  const likesOnMyThreads = db.likes
    .filter((l) => currentUserThreadIds.includes(l.thread_id) && l.user_id !== CURRENT_USER_ID)
    .slice(0, 5);

  for (const like of likesOnMyThreads) {
    const actor = db.getUserById(like.user_id);
    const thread = db.getThreadById(like.thread_id);
    if (actor && thread) {
      items.push({
        id: `activity-like-${like.id}`,
        type: 'like',
        actor,
        thread: hydrateThread(thread),
        created_at: like.created_at,
      });
    }
  }

  const followsToMe = db.follows
    .filter((f) => f.following_id === CURRENT_USER_ID)
    .slice(0, 5);

  for (const follow of followsToMe) {
    const actor = db.getUserById(follow.follower_id);
    if (actor) {
      items.push({
        id: `activity-follow-${follow.id}`,
        type: 'follow',
        actor,
        created_at: follow.created_at,
      });
    }
  }

  const repliesToMe = db.threads
    .filter(
      (t) =>
        t.parent_id !== null &&
        currentUserThreadIds.includes(t.parent_id) &&
        t.user_id !== CURRENT_USER_ID,
    )
    .slice(0, 5);

  for (const reply of repliesToMe) {
    const actor = db.getUserById(reply.user_id);
    if (actor) {
      items.push({
        id: `activity-reply-${reply.id}`,
        type: 'reply',
        actor,
        thread: hydrateThread(reply),
        created_at: reply.created_at,
      });
    }
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return items;
}

// ─── Bookmark selectors ─────────────────────────────────────────────────────────

export function isBookmarkedByCurrentUser(threadId: string): boolean {
  return db.isBookmarkedByUser(CURRENT_USER_ID, threadId);
}

export function toggleBookmark(threadId: string): { bookmarked: boolean } {
  const bookmarked = db.toggleBookmark(CURRENT_USER_ID, threadId);
  return { bookmarked };
}

export function getBookmarkedThreads(): ThreadWithAuthor[] {
  const bookmarks = db.getBookmarksByUserId(CURRENT_USER_ID);
  const threads: ThreadWithAuthor[] = [];
  for (const bm of bookmarks) {
    const thread = db.getThreadById(bm.thread_id);
    if (thread && !db.isUserMuted(thread.user_id) && !db.isThreadHidden(thread.id)) {
      threads.push(hydrateThread(thread));
    }
  }
  return threads;
}

// ─── Media helpers ──────────────────────────────────────────────────────────────

export function getThreadMediaCount(thread: Thread): number {
  return thread.media.length;
}

export function threadHasVideo(thread: Thread): boolean {
  return thread.media.some((m) => m.type === 'video');
}

export function threadHasMedia(thread: Thread): boolean {
  return thread.media.length > 0;
}

export function getImageOnlyThreads(): ThreadWithAuthor[] {
  return getFeed().filter(
    (t) => t.media.length > 0 && t.media.every((m) => m.type === 'image'),
  );
}

export function getVideoThreads(): ThreadWithAuthor[] {
  return getFeed().filter((t) => t.media.some((m) => m.type === 'video'));
}

export function getMixedMediaThreads(): ThreadWithAuthor[] {
  return getFeed().filter(
    (t) =>
      t.media.some((m) => m.type === 'image') &&
      t.media.some((m) => m.type === 'video'),
  );
}
