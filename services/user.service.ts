import { supabase, getCachedUserId } from "./supabase";
import type { User, ThreadWithAuthor, ActivityItem } from "@/types/types";

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio ?? "",
    verified: row.verified ?? false,
    is_private: row.is_private ?? false,
    followers_count: row.followers_count ?? 0,
    following_count: row.following_count ?? 0,
    created_at: row.created_at,
  };
}

function rowToThread(row: any, author: User): ThreadWithAuthor {
  return {
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    images: row.images ?? [],
    media: row.media ?? [],
    parent_id: row.parent_id,
    root_id: row.root_id,
    reply_count: row.reply_count ?? 0,
    like_count: row.like_count ?? 0,
    repost_count: row.repost_count ?? 0,
    is_liked: row.is_liked ?? false,
    is_reposted: row.is_reposted ?? false,
    is_bookmarked: row.is_bookmarked ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author,
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

async function getProfile(userId: string): Promise<{
  user: User;
  threads: ThreadWithAuthor[];
  replies: ThreadWithAuthor[];
  followersCount: number;
  followingCount: number;
  isCurrentUser: boolean;
} | null> {
  const currentUserId = await getCachedUserId();

  const { data: userRow, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !userRow) return null;

  const user = rowToUser(userRow);

  // Get threads (top-level posts by this user)
  const { data: threadRows } = await supabase
    .from("threads")
    .select("*, users!threads_user_id_fkey(*)")
    .eq("user_id", userId)
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const threads: ThreadWithAuthor[] = (threadRows ?? []).map((t: any) =>
    rowToThread(t, rowToUser(t.users)),
  );

  // Get replies (threads with parent_id)
  const { data: replyRows } = await supabase
    .from("threads")
    .select("*, users!threads_user_id_fkey(*)")
    .eq("user_id", userId)
    .not("parent_id", "is", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const replies: ThreadWithAuthor[] = (replyRows ?? []).map((t: any) =>
    rowToThread(t, rowToUser(t.users)),
  );

  return {
    user,
    threads,
    replies,
    followersCount: user.followers_count,
    followingCount: user.following_count,
    isCurrentUser: userId === currentUserId,
  };
}

async function getCurrentUser(): Promise<User> {
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("Current user not found");
  return rowToUser(data);
}

// ─── Follow ──────────────────────────────────────────────────────────────────

async function isFollowing(targetUserId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  if (!userId) return false;

  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", userId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  return !!data;
}

async function toggleFollow(
  targetUserId: string,
): Promise<{ following: boolean; followersCount: number }> {
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");
  if (userId === targetUserId) throw new Error("Cannot follow yourself");

  const { data, error } = await supabase.rpc("toggle_follow", {
    p_follower_id: userId,
    p_following_id: targetUserId,
  });

  if (error) throw error;
  const row = data?.[0] ?? data;
  return {
    following: row?.following ?? false,
    followersCount: row?.followers_count ?? 0,
  };
}

// ─── Followers / Following lists ─────────────────────────────────────────────

async function getFollowers(userId: string): Promise<User[]> {
  const { data } = await supabase
    .from("follows")
    .select("users!follows_follower_id_fkey(*)")
    .eq("following_id", userId);

  return (data ?? []).map((row: any) => rowToUser(row.users));
}

async function getFollowing(userId: string): Promise<User[]> {
  const { data } = await supabase
    .from("follows")
    .select("users!follows_following_id_fkey(*)")
    .eq("follower_id", userId);

  return (data ?? []).map((row: any) => rowToUser(row.users));
}

// ─── Activity ────────────────────────────────────────────────────────────────

async function getActivity(): Promise<ActivityItem[]> {
  const userId = await getCachedUserId();
  if (!userId) return [];

  // Get user's thread IDs
  const { data: userThreads } = await supabase
    .from("threads")
    .select("id")
    .eq("user_id", userId);
  const threadIds = (userThreads ?? []).map((t: any) => t.id);

  const items: ActivityItem[] = [];

  // Recent likes on user's threads
  if (threadIds.length > 0) {
    const { data: likes } = await supabase
      .from("likes")
      .select(
        "*, users!likes_user_id_fkey(*), threads!likes_thread_id_fkey(*, users!threads_user_id_fkey(*))",
      )
      .in("thread_id", threadIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    for (const like of likes ?? []) {
      const actor = rowToUser(like.users);
      const threadAuthor = rowToUser(like.threads.users);
      items.push({
        id: `like-${like.id}`,
        type: "like",
        actor,
        thread: rowToThread(like.threads, threadAuthor),
        created_at: like.created_at,
      });
    }
  }

  // Recent replies to user's threads
  if (threadIds.length > 0) {
    const { data: replies } = await supabase
      .from("threads")
      .select("*, users!threads_user_id_fkey(*)")
      .in("parent_id", threadIds)
      .neq("user_id", userId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(20);

    for (const reply of replies ?? []) {
      const actor = rowToUser(reply.users);
      items.push({
        id: `reply-${reply.id}`,
        type: "reply",
        actor,
        thread: rowToThread(reply, actor),
        created_at: reply.created_at,
      });
    }
  }

  // Recent follows
  const { data: newFollows } = await supabase
    .from("follows")
    .select("*, users!follows_follower_id_fkey(*)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const follow of newFollows ?? []) {
    const actor = rowToUser(follow.users);
    items.push({
      id: `follow-${follow.id}`,
      type: "follow",
      actor,
      created_at: follow.created_at,
    });
  }

  // Sort by created_at desc
  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return items;
}

// ─── Profile update ──────────────────────────────────────────────────────────

async function updateProfile(updates: {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
}): Promise<User> {
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) throw error ?? new Error("Failed to update profile");
  return rowToUser(data);
}

// ─── Explore / Discover ──────────────────────────────────────────────────────

async function getExploreUsers(): Promise<User[]> {
  const userId = await getCachedUserId();
  if (!userId) return [];

  // Get user IDs the current user already follows
  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingIds = (followRows ?? []).map((f: any) => f.following_id);
  followingIds.push(userId); // Exclude self

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .not("id", "in", `(${followingIds.join(",")})`)
    .order("followers_count", { ascending: false })
    .limit(10);

  return (users ?? []).map(rowToUser);
}

async function getSuggestedFollows(): Promise<
  (User & { isFollowing: boolean })[]
> {
  const userId = await getCachedUserId();
  if (!userId) return [];

  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingIds = new Set(
    (followRows ?? []).map((f: any) => f.following_id),
  );

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .neq("id", userId)
    .order("followers_count", { ascending: false })
    .limit(10);

  return (users ?? []).map((u: any) => ({
    ...rowToUser(u),
    isFollowing: followingIds.has(u.id),
  }));
}

async function searchAll(
  query: string,
): Promise<{ users: User[]; threads: ThreadWithAuthor[] }> {
  const { data, error } = await supabase.rpc("search_all", {
    p_query: query,
    p_limit: 20,
  });

  if (error) {
    // Fallback: manual search
    const { data: users } = await supabase
      .from("users")
      .select("*")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);

    const { data: threads } = await supabase
      .from("threads")
      .select("*, users!threads_user_id_fkey(*)")
      .ilike("content", `%${query}%`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      users: (users ?? []).map(rowToUser),
      threads: (threads ?? []).map((t: any) =>
        rowToThread(t, rowToUser(t.users)),
      ),
    };
  }

  // Parse RPC result
  const users: User[] = [];
  const threads: ThreadWithAuthor[] = [];

  for (const row of data ?? []) {
    if (row.result_type === "user") {
      users.push(rowToUser(row));
    } else if (row.result_type === "thread") {
      threads.push(rowToThread(row, rowToUser(row)));
    }
  }

  return { users, threads };
}

async function getTrendingThreads(): Promise<ThreadWithAuthor[]> {
  const { data, error } = await supabase.rpc("get_trending", {
    p_time_window: "daily",
    p_limit: 10,
  });

  if (error || !data) return [];

  // The updated RPC returns full thread data directly with author fields
  return (data as any[]).map((row: any) =>
    rowToThread(row, {
      id: row.user_id ?? "",
      username: row.author_username ?? "",
      display_name: row.author_display_name ?? "",
      avatar_url: row.author_avatar_url ?? "",
      bio: "",
      verified: row.author_verified ?? false,
      is_private: false,
      followers_count: 0,
      following_count: 0,
      created_at: row.created_at,
    }),
  );
}

// ─── All users ───────────────────────────────────────────────────────────────

async function getAllUsers(): Promise<User[]> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("display_name");

  return (data ?? []).map(rowToUser);
}

// ─── Mute ────────────────────────────────────────────────────────────────────

async function muteUser(targetUserId: string): Promise<void> {
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");
  const result = await supabase.rpc("toggle_mute", {
    p_user_id: userId,
    p_target_user_id: targetUserId,
  });
  if (result.error) throw result.error;
}

async function unmuteUser(targetUserId: string): Promise<void> {
  // toggle_mute is idempotent; but for explicit unmute, use direct delete
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");
  await supabase
    .from("muted_users")
    .delete()
    .eq("user_id", userId)
    .eq("muted_user_id", targetUserId);
}

async function isUserMuted(targetUserId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from("muted_users")
    .select("id")
    .eq("user_id", userId)
    .eq("muted_user_id", targetUserId)
    .maybeSingle();
  return !!data;
}

// ─── Block ────────────────────────────────────────────────────────────────────

async function blockUser(
  targetUserId: string,
): Promise<{ blocked: boolean }> {
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("toggle_block", {
    p_user_id: userId,
    p_blocked_user_id: targetUserId,
  });

  if (error) throw error;
  return { blocked: data ?? false };
}

async function isUserBlocked(targetUserId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from("blocked_users")
    .select("id")
    .eq("user_id", userId)
    .eq("blocked_user_id", targetUserId)
    .maybeSingle();
  return !!data;
}

async function getBlockedUsers(): Promise<User[]> {
  const userId = await getCachedUserId();
  if (!userId) return [];

  const { data } = await supabase
    .from("blocked_users")
    .select("blocked_user_id, users!blocked_users_blocked_user_id_fkey(*)")
    .eq("user_id", userId);

  return (data ?? []).map((row: any) => rowToUser(row.users));
}

// ─── Report ──────────────────────────────────────────────────────────────────

async function reportUser(
  targetUserId: string,
  reason: string,
): Promise<void> {
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("submit_report", {
    p_reporter_id: userId,
    p_content_type: "user",
    p_content_id: targetUserId,
    p_reason: reason,
  });

  if (error) throw error;
}

// ─── Account Deletion ────────────────────────────────────────────────────────

async function deleteAccount(): Promise<void> {
  const userId = await getCachedUserId();
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("delete_account", {
    p_user_id: userId,
  });

  if (error) throw error;

  // Sign out after account deletion
  await supabase.auth.signOut();
}

export const UserService = {
  getProfile,
  getCurrentUser,
  isFollowing,
  toggleFollow,
  getFollowers,
  getFollowing,
  getActivity,
  updateProfile,
  getExploreUsers,
  getSuggestedFollows,
  searchAll,
  getTrendingThreads,
  getAllUsers,
  muteUser,
  unmuteUser,
  isUserMuted,
  blockUser,
  isUserBlocked,
  getBlockedUsers,
  reportUser,
  deleteAccount,
};
