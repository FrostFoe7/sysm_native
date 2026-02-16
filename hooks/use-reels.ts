import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { ReelService } from "@/services/reel.service";
import { RankingService } from "@/services/ranking.service";
import type { ReelWithAuthor } from "@/types/types";

/**
 * Hook for managing the Reels feed.
 * Uses rpc_rank_reels for velocity-based, decay-aware ranking.
 * Handles vertical paging state, muting, and interactions.
 * Watch time is tracked via record_reel_watch RPC.
 */
export function useReels() {
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const watchStartRef = useRef<Record<string, number>>({});

  // Server-ranked reels via React Query
  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["reels-feed"],
    queryFn: () => ReelService.getFeed(),
    staleTime: 1000 * 60,
  });

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Optimistic like with rollback
  const likeMutation = useMutation({
    mutationFn: (reelId: string) => ReelService.toggleLike(reelId),
    onMutate: async (reelId) => {
      await queryClient.cancelQueries({ queryKey: ["reels-feed"] });
      const previous = queryClient.getQueryData<ReelWithAuthor[]>([
        "reels-feed",
      ]);

      queryClient.setQueryData<ReelWithAuthor[]>(["reels-feed"], (old) =>
        old?.map((r) =>
          r.id === reelId
            ? {
                ...r,
                isLiked: !r.isLiked,
                likeCount: r.isLiked ? r.likeCount - 1 : r.likeCount + 1,
              }
            : r,
        ),
      );

      return { previous };
    },
    onError: (_err, _reelId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["reels-feed"], context.previous);
      }
    },
    onSuccess: (result, reelId) => {
      queryClient.setQueryData<ReelWithAuthor[]>(["reels-feed"], (old) =>
        old?.map((r) =>
          r.id === reelId
            ? { ...r, likeCount: result.count, isLiked: result.liked }
            : r,
        ),
      );
    },
  });

  const handleLike = useCallback(
    (reelId: string) => {
      likeMutation.mutate(reelId);
    },
    [likeMutation],
  );

  // Reel bookmark/save with optimistic update
  const bookmarkMutation = useMutation({
    mutationFn: (reelId: string) => ReelService.toggleReelBookmark(reelId),
    onMutate: async (reelId) => {
      await queryClient.cancelQueries({ queryKey: ["reels-feed"] });
      const previous = queryClient.getQueryData<ReelWithAuthor[]>([
        "reels-feed",
      ]);
      return { previous };
    },
    onError: (_err, _reelId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["reels-feed"], context.previous);
      }
    },
  });

  const handleBookmark = useCallback(
    (reelId: string) => {
      bookmarkMutation.mutate(reelId);
    },
    [bookmarkMutation],
  );

  // Track when a reel becomes visible (start watch timer)
  const onReelVisible = useCallback((reelId: string) => {
    watchStartRef.current[reelId] = Date.now();
    ReelService.trackReelView(reelId).catch(() => {});
  }, []);

  // Track when a reel leaves view (report watch time)
  const onReelHidden = useCallback(
    (reelId: string) => {
      const start = watchStartRef.current[reelId];
      if (!start) return;

      const watchMs = Date.now() - start;
      delete watchStartRef.current[reelId];

      const reel = data.find((r) => r.id === reelId);
      const durationMs = (reel?.duration ?? 0) * 1000;
      const completed = durationMs > 0 && watchMs >= durationMs * 0.9;

      RankingService.recordReelWatch(reelId, watchMs, completed).catch(
        () => {},
      );
    },
    [data],
  );

  return {
    data,
    isLoading,
    activeIndex,
    setActiveIndex,
    isMuted,
    toggleMute,
    handleLike,
    handleBookmark,
    onReelVisible,
    onReelHidden,
    refresh: refetch,
  };
}
