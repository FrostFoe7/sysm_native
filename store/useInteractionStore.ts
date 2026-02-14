import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InteractionState {
  likedThreads: Record<string, boolean>;
  repostedThreads: Record<string, boolean>;
  followingUsers: Record<string, boolean>;
  bookmarkedThreads: Record<string, boolean>;

  // Actions
  setLiked: (threadId: string, isLiked: boolean) => void;
  setReposted: (threadId: string, isReposted: boolean) => void;
  setFollowing: (userId: string, isFollowing: boolean) => void;
  setBookmarked: (threadId: string, isBookmarked: boolean) => void;
  
  // Bulk update (useful for feed loading)
  syncInteractions: (params: {
    liked?: Record<string, boolean>;
    reposted?: Record<string, boolean>;
    following?: Record<string, boolean>;
  }) => void;
}

/**
 * Global store for client-side interactions.
 * Persisted to AsyncStorage so your likes/follows remain consistent even after app restart.
 */
export const useInteractionStore = create<InteractionState>()(
  persist(
    (set) => ({
      likedThreads: {},
      repostedThreads: {},
      followingUsers: {},
      bookmarkedThreads: {},

      setLiked: (threadId, isLiked) => set((state) => ({
        likedThreads: { ...state.likedThreads, [threadId]: isLiked }
      })),

      setReposted: (threadId, isReposted) => set((state) => ({
        repostedThreads: { ...state.repostedThreads, [threadId]: isReposted }
      })),

      setFollowing: (userId, isFollowing) => set((state) => ({
        followingUsers: { ...state.followingUsers, [userId]: isFollowing }
      })),

      setBookmarked: (threadId, isBookmarked) => set((state) => ({
        bookmarkedThreads: { ...state.bookmarkedThreads, [threadId]: isBookmarked }
      })),

      syncInteractions: ({ liked, reposted, following }) => set((state) => ({
        likedThreads: liked ? { ...state.likedThreads, ...liked } : state.likedThreads,
        repostedThreads: reposted ? { ...state.repostedThreads, ...reposted } : state.repostedThreads,
        followingUsers: following ? { ...state.followingUsers, ...following } : state.followingUsers,
      })),
    }),
    {
      name: 'interaction-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
