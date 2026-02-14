// db/selectors.ts

import { db } from './db';
import { CURRENT_USER_ID } from '@/constants/app';
import type { User, Thread, ThreadWithAuthor, ThreadWithReplies, MediaItem, ActivityItem, ReelWithAuthor, ReelCommentWithAuthor, ConversationWithDetails, MessageWithSender, DirectMessage, Conversation, ConversationParticipant, MessageType, Reel } from '@/types/types';
export type { ActivityItem, ConversationWithDetails, MessageWithSender };

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

// ─── Reel selectors ─────────────────────────────────────────────────────────────

function hydrateReel(reel: ReturnType<typeof db.getReelById> & {}): ReelWithAuthor {
  const author = db.getUserById(reel.author_id);
  if (!author) throw new Error(`User not found for reel ${reel.id}`);
  return { ...reel, author };
}

export function getReelsFeed(): ReelWithAuthor[] {
  const reels = db.getAllReels();
  return reels.map(hydrateReel);
}

export function getReelById(id: string): ReelWithAuthor | undefined {
  const reel = db.getReelById(id);
  if (!reel) return undefined;
  return hydrateReel(reel);
}

export function isReelLiked(reelId: string): boolean {
  return db.isReelLikedByUser(CURRENT_USER_ID, reelId);
}

export function toggleReelLike(reelId: string): { liked: boolean; count: number } {
  const liked = db.toggleReelLike(CURRENT_USER_ID, reelId);
  const reel = db.getReelById(reelId);
  return { liked, count: reel?.likeCount ?? 0 };
}

export function getReelComments(reelId: string): ReelCommentWithAuthor[] {
  const comments = db.getCommentsForReel(reelId);
  return comments.map((c) => {
    const author = db.getUserById(c.user_id);
    if (!author) throw new Error(`User not found for comment ${c.id}`);
    return { ...c, author };
  });
}

export function addReelComment(reelId: string, content: string): ReelCommentWithAuthor {
  const comment = db.addReelComment(reelId, CURRENT_USER_ID, content);
  const author = db.getUserById(CURRENT_USER_ID)!;
  return { ...comment, author };
}

export function getReelsByUser(userId: string): ReelWithAuthor[] {
  return db.getReelsByAuthor(userId).map(hydrateReel);
}

export function createReel(params: {
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  aspectRatio?: number;
  duration?: number;
}): ReelWithAuthor {
  const reel = db.createReel({ ...params, author_id: CURRENT_USER_ID });
  return hydrateReel(reel);
}

// ─── DM selectors ───────────────────────────────────────────────────────────────

function hydrateMessage(message: DirectMessage): MessageWithSender {
  const sender = db.getUserById(message.sender_id)!;
  let replyTo: (DirectMessage & { sender: User }) | null = null;
  if (message.reply_to_id) {
    const replyMsg = db.getMessageById(message.reply_to_id);
    if (replyMsg) {
      const replySender = db.getUserById(replyMsg.sender_id)!;
      replyTo = { ...replyMsg, sender: replySender };
    }
  }
  let sharedThread: (Thread & { author: User }) | null = null;
  if (message.shared_thread_id) {
    const thread = db.getThreadById(message.shared_thread_id);
    if (thread) {
      const threadAuthor = db.getUserById(thread.user_id)!;
      sharedThread = { ...thread, author: threadAuthor };
    }
  }
  let sharedReel: (Reel & { author: User }) | null = null;
  if (message.shared_reel_id) {
    const reel = db.getReelById(message.shared_reel_id);
    if (reel) {
      const reelAuthor = db.getUserById(reel.author_id)!;
      sharedReel = { ...reel, author: reelAuthor };
    }
  }
  return { ...message, sender, replyTo, sharedThread, sharedReel };
}

function hydrateConversation(conv: Conversation): ConversationWithDetails {
  const participants = db.getParticipantsForConversation(conv.id).map((cp) => ({
    ...cp,
    user: db.getUserById(cp.user_id)!,
  }));
  const otherUsers = participants
    .filter((p) => p.user_id !== CURRENT_USER_ID)
    .map((p) => p.user);
  const typingUsers = participants
    .filter((p) => p.user_id !== CURRENT_USER_ID && p.is_typing)
    .map((p) => p.user);
  
  let lastMessage: (DirectMessage & { sender: User }) | null = null;
  if (conv.last_message_id) {
    const msg = db.getMessageById(conv.last_message_id);
    if (msg) {
      const sender = db.getUserById(msg.sender_id)!;
      lastMessage = { ...msg, sender };
    }
  }
  const unreadCount = db.getUnreadCount(conv.id, CURRENT_USER_ID);

  return { conversation: conv, participants, lastMessage, unreadCount, otherUsers, typingUsers };
}

export function getInbox(): ConversationWithDetails[] {
  const convs = db.getConversationsForUser(CURRENT_USER_ID);
  return convs.map(hydrateConversation);
}

export function getConversation(conversationId: string): ConversationWithDetails | undefined {
  const conv = db.getConversationById(conversationId);
  if (!conv) return undefined;
  return hydrateConversation(conv);
}

export function getMessages(conversationId: string): MessageWithSender[] {
  const messages = db.getMessagesForConversation(conversationId);
  return messages.map(hydrateMessage);
}

export function sendMessage(params: {
  conversationId: string;
  content: string;
  type?: MessageType;
  mediaUrl?: string;
  mediaThumbnail?: string;
  replyToId?: string;
  sharedThreadId?: string;
  sharedReelId?: string;
}): MessageWithSender {
  const msg = db.sendMessage({
    conversation_id: params.conversationId,
    sender_id: CURRENT_USER_ID,
    type: params.type ?? 'text',
    content: params.content,
    media_url: params.mediaUrl,
    media_thumbnail: params.mediaThumbnail,
    reply_to_id: params.replyToId,
    shared_thread_id: params.sharedThreadId,
    shared_reel_id: params.sharedReelId,
  });
  return hydrateMessage(msg);
}

export function markConversationAsRead(conversationId: string): void {
  db.markConversationRead(conversationId, CURRENT_USER_ID);
}

export function toggleMessageReaction(messageId: string, emoji: string): boolean {
  return db.toggleMessageReaction(messageId, CURRENT_USER_ID, emoji);
}

export function deleteMessage(messageId: string): boolean {
  return db.deleteMessage(messageId);
}

export function toggleConversationPin(conversationId: string): boolean {
  return db.toggleConversationPin(conversationId);
}

export function toggleConversationMute(conversationId: string): boolean {
  return db.toggleConversationMute(conversationId);
}

export function createDirectConversation(otherUserId: string): ConversationWithDetails {
  // Check if conversation already exists
  const existing = db.findDirectConversation(CURRENT_USER_ID, otherUserId);
  if (existing) return hydrateConversation(existing);

  const conv = db.createConversation({
    type: 'direct',
    created_by: CURRENT_USER_ID,
    participant_ids: [CURRENT_USER_ID, otherUserId],
  });
  return hydrateConversation(conv);
}

export function createGroupConversation(params: {
  name: string;
  avatarUrl?: string;
  memberIds: string[];
}): ConversationWithDetails {
  const conv = db.createConversation({
    type: 'group',
    name: params.name,
    avatar_url: params.avatarUrl,
    created_by: CURRENT_USER_ID,
    participant_ids: [CURRENT_USER_ID, ...params.memberIds],
  });
  return hydrateConversation(conv);
}

export function addGroupMember(conversationId: string, userId: string): void {
  db.addGroupMember(conversationId, userId, CURRENT_USER_ID);
}

export function removeGroupMember(conversationId: string, userId: string): void {
  db.removeGroupMember(conversationId, userId, CURRENT_USER_ID);
}

export function leaveGroup(conversationId: string): void {
  db.removeGroupMember(conversationId, CURRENT_USER_ID, CURRENT_USER_ID);
}

export function promoteToAdmin(conversationId: string, userId: string): void {
  db.promoteToAdmin(conversationId, userId);
}

export function updateGroupInfo(conversationId: string, updates: { name?: string; avatarUrl?: string }): void {
  db.updateGroupInfo(conversationId, { name: updates.name, avatar_url: updates.avatarUrl });
}

export function searchInbox(query: string): ConversationWithDetails[] {
  const convs = db.searchConversations(CURRENT_USER_ID, query);
  return convs.map(hydrateConversation);
}

export function getTotalUnreadCount(): number {
  const convs = db.getConversationsForUser(CURRENT_USER_ID);
  return convs.reduce((sum, c) => sum + db.getUnreadCount(c.id, CURRENT_USER_ID), 0);
}

export function getOrCreateDirectConversation(otherUserId: string): ConversationWithDetails {
  return createDirectConversation(otherUserId);
}

export function formatMessagePreview(message: DirectMessage): string {
  if (message.is_deleted) return 'Message deleted';
  switch (message.type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'reel_share': return '🎬 Shared a reel';
    case 'thread_share': return '📝 Shared a thread';
    case 'voice_note': return '🎙️ Voice message';
    case 'system': return message.content;
    default: return message.content;
  }
}
