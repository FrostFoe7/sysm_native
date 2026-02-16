// hooks/use-explore.ts
// React Query hook for the velocity-ranked explore feed (rpc_explore_feed)
// Returns mixed thread + reel content from non-followed users

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RankingService, type ExploreItem } from "@/services/ranking.service";
import { ThreadService } from "@/services/thread.service";
import { useInteractionStore } from "@/store/useInteractionStore";

/**
 * Hook for the explore/discover feed.
 * Server-ranked via rpc_explore_feed — excludes followed users,
 * favors reels, enforces creator diversity, penalizes seen content.
 */
export function useExploreFeed() {
  const queryClient = useQueryClient();
  const { setLiked } = useInteractionStore();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["explore-feed"],
    queryFn: async () => {
      const feed = await RankingService.getExploreFeed();
      // Sync liked state from server
      for (const item of feed) {
        if (item.content_type === "thread") {
          // Threads use the global interaction store
          // (explore items come with is_liked flag from server)
        }
      }
      return feed;
    },
    staleTime: 1000 * 60 * 2,
  });

  // Optimistic like for thread items in explore
  const likeMutation = useMutation({
    mutationFn: (threadId: string) => ThreadService.toggleLike(threadId),
    onMutate: async (threadId) => {
      await queryClient.cancelQueries({ queryKey: ["explore-feed"] });
      const previous = queryClient.getQueryData<ExploreItem[]>([
        "explore-feed",
      ]);

      queryClient.setQueryData<ExploreItem[]>(["explore-feed"], (old) =>
        old?.map((item) => {
          if (
            item.content_type === "thread" &&
            item.content_id === threadId &&
            item.thread
          ) {
            const wasLiked = item.is_liked;
            return {
              ...item,
              is_liked: !wasLiked,
              thread: {
                ...item.thread,
                like_count: item.thread.like_count + (wasLiked ? -1 : 1),
              },
            };
          }
          return item;
        }),
      );

      const wasLiked =
        previous?.find((i) => i.content_id === threadId)?.is_liked ?? false;
      setLiked(threadId, !wasLiked);

      return { previous, wasLiked };
    },
    onError: (_err, threadId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["explore-feed"], context.previous);
      }
      setLiked(threadId, context?.wasLiked ?? false);
    },
  });

  const handleLike = useCallback(
    (threadId: string) => {
      likeMutation.mutate(threadId);
    },
    [likeMutation],
  );

  return {
    data: data ?? [],
    isLoading,
    isRefreshing: isFetching,
    refresh: refetch,
    handleLike,
  };
}
