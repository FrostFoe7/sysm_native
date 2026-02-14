import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InteractionState {
  likedThreads: Record<string, boolean>;
  repostedThreads: Record<string, boolean>;
  followingUsers: Record<string, boolean>;
  bookmarkedThreads: Record<string, boolean>;

  setLiked: (threadId: string, isLiked: boolean) => void;
  setReposted: (threadId: string, isReposted: boolean) => void;
  setFollowing: (userId: string, isFollowing: boolean) => void;
  setBookmarked: (threadId: string, isBookmarked: boolean) => void;
  syncInteractions: (params: {
    liked?: Record<string, boolean>;
    reposted?: Record<string, boolean>;
    following?: Record<string, boolean>;
    bookmarked?: Record<string, boolean>;
  }) => void;
}

/**
 * Client-side interaction cache for optimistic UI.
 * Source of truth is Supabase; this is a local mirror for instant toggling.
 */
export const useInteractionStore = create<InteractionState>()(
  persist(
    (set) => ({
      likedThreads: {},
      repostedThreads: {},
      followingUsers: {},
      bookmarkedThreads: {},

      setLiked: (threadId, isLiked) =>
        set((s) => ({ likedThreads: { ...s.likedThreads, [threadId]: isLiked } })),

      setReposted: (threadId, isReposted) =>
        set((s) => ({ repostedThreads: { ...s.repostedThreads, [threadId]: isReposted } })),

      setFollowing: (userId, isFollowing) =>
        set((s) => ({ followingUsers: { ...s.followingUsers, [userId]: isFollowing } })),

      setBookmarked: (threadId, isBookmarked) =>
        set((s) => ({ bookmarkedThreads: { ...s.bookmarkedThreads, [threadId]: isBookmarked } })),

      syncInteractions: ({ liked, reposted, following, bookmarked }) =>
        set((s) => ({
          likedThreads: liked ? { ...s.likedThreads, ...liked } : s.likedThreads,
          repostedThreads: reposted ? { ...s.repostedThreads, ...reposted } : s.repostedThreads,
          followingUsers: following ? { ...s.followingUsers, ...following } : s.followingUsers,
          bookmarkedThreads: bookmarked ? { ...s.bookmarkedThreads, ...bookmarked } : s.bookmarkedThreads,
        })),
    }),
    {
      name: 'interaction-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
