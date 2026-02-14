import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ThreadService } from '@/services/thread.service';
import { isThreadLikedByCurrentUser, isRepostedByCurrentUser } from '@/db/selectors';
import type { ThreadWithAuthor } from '@/types/types';
import { useInteractionStore } from '@/store/useInteractionStore';

/**
 * Hook for managing the threads feed data and interactions using React Query.
 * Centralizes fetching, caching, and optimistic mutations.
 */
export function useThreadsFeed() {
  const queryClient = useQueryClient();
  const { 
    likedThreads: likedMap, 
    repostedThreads: repostMap, 
    setLiked, 
    setReposted,
    syncInteractions
  } = useInteractionStore();

  // Fetch feed with React Query
  const { 
    data, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['threads-feed'],
    queryFn: async () => {
      const feed = await ThreadService.getFeed();
      
      // Sync interaction maps globally for UI consistency across screens
      const newLiked: Record<string, boolean> = {};
      const newReposted: Record<string, boolean> = {};
      feed.forEach(t => {
        newLiked[t.id] = isThreadLikedByCurrentUser(t.id);
        newReposted[t.id] = isRepostedByCurrentUser(t.id);
      });
      syncInteractions({ liked: newLiked, reposted: newReposted });
      
      return feed;
    },
    // Keep data fresh for 1 minute
    staleTime: 1000 * 60,
  });

  // Like Mutation
  const likeMutation = useMutation({
    mutationFn: (threadId: string) => ThreadService.toggleLike(threadId),
    onMutate: async (threadId) => {
      // Trigger haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['threads-feed'] });

      // Snapshot previous value
      const previousThreads = queryClient.getQueryData<ThreadWithAuthor[]>(['threads-feed']);

      // Optimistic update in global store
      const wasLiked = !!likedMap[threadId];
      setLiked(threadId, !wasLiked);

      // Optimistic update in React Query cache
      if (previousThreads) {
        queryClient.setQueryData<ThreadWithAuthor[]>(['threads-feed'], 
          previousThreads.map(t => t.id === threadId 
            ? { ...t, like_count: t.like_count + (wasLiked ? -1 : 1) } 
            : t
          )
        );
      }

      return { previousThreads, wasLiked };
    },
    onError: (err, threadId, context) => {
      // Rollback on error
      if (context?.previousThreads) {
        queryClient.setQueryData(['threads-feed'], context.previousThreads);
      }
      setLiked(threadId, context?.wasLiked ?? false);
    },
    onSuccess: (result, threadId) => {
      // Update with exact server count
      queryClient.setQueryData<ThreadWithAuthor[]>(['threads-feed'], (old) => 
        old?.map(t => t.id === threadId ? { ...t, like_count: result.likeCount } : t)
      );
    }
  });

  // Repost Mutation
  const repostMutation = useMutation({
    mutationFn: (threadId: string) => ThreadService.toggleRepost(threadId),
    onMutate: async (threadId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await queryClient.cancelQueries({ queryKey: ['threads-feed'] });
      const previousThreads = queryClient.getQueryData<ThreadWithAuthor[]>(['threads-feed']);

      const wasReposted = !!repostMap[threadId];
      setReposted(threadId, !wasReposted);

      if (previousThreads) {
        queryClient.setQueryData<ThreadWithAuthor[]>(['threads-feed'], 
          previousThreads.map(t => t.id === threadId 
            ? { ...t, repost_count: t.repost_count + (wasReposted ? -1 : 1) } 
            : t
          )
        );
      }

      return { previousThreads, wasReposted };
    },
    onError: (err, threadId, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(['threads-feed'], context.previousThreads);
      }
      setReposted(threadId, context?.wasReposted ?? false);
    },
    onSuccess: (result, threadId) => {
      queryClient.setQueryData<ThreadWithAuthor[]>(['threads-feed'], (old) => 
        old?.map(t => t.id === threadId ? { ...t, repost_count: result.repostCount } : t)
      );
    }
  });

  const handleLike = useCallback((threadId: string) => {
    likeMutation.mutate(threadId);
  }, [likeMutation]);

  const handleRepost = useCallback((threadId: string) => {
    repostMutation.mutate(threadId);
  }, [repostMutation]);

  return {
    data: data ?? [],
    isLoading,
    isRefreshing: isFetching,
    refresh: refetch,
    likedMap,
    repostMap,
    handleLike,
    handleRepost
  };
}
