import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ThreadService } from "@/services/thread.service";
import { analytics } from "@/services/analytics.service";
import type { ThreadWithAuthor } from "@/types/types";
import { useInteractionStore } from "@/store/useInteractionStore";

/**
 * Hook for managing the threads feed data and interactions using React Query.
 * Supports both "For You" (velocity-ranked via rpc_rank_threads) and "Following" (recency).
 *
 * Server returns is_liked/is_reposted/is_bookmarked flags per thread —
 * NO client-side per-thread interaction checks needed.
 */
export function useThreadsFeed(feedType: "foryou" | "following" = "foryou") {
  const queryClient = useQueryClient();
  const {
    likedThreads: likedMap,
    repostedThreads: repostMap,
    bookmarkedThreads: bookmarkMap,
    setLiked,
    setReposted,
    setBookmarked,
    syncInteractions,
  } = useInteractionStore();

  // Fetch feed with React Query — server-ranked, no client sorting
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["threads-feed", feedType],
    queryFn: async () => {
      const feed =
        feedType === "following"
          ? await ThreadService.getFollowingFeed()
          : await ThreadService.getForYouFeed();

      // Sync interaction maps from server-returned flags (no N+1 queries)
      const newLiked: Record<string, boolean> = {};
      const newReposted: Record<string, boolean> = {};
      const newBookmarked: Record<string, boolean> = {};
      for (const t of feed) {
        // The RPC returns these as part of the row
        newLiked[t.id] = t.is_liked ?? false;
        newReposted[t.id] = t.is_reposted ?? false;
        newBookmarked[t.id] = t.is_bookmarked ?? false;
      }
      syncInteractions({ liked: newLiked, reposted: newReposted, bookmarked: newBookmarked });

      return feed;
    },
    staleTime: 1000 * 60,
  });

  // Like Mutation
  const likeMutation = useMutation({
    mutationFn: (threadId: string) => ThreadService.toggleLike(threadId),
    onMutate: async (threadId) => {
      // Trigger haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["threads-feed"] });

      // Snapshot previous value
      const previousForYou = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "foryou",
      ]);
      const previousFollowing = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "following",
      ]);

      // Optimistic update in global store
      const wasLiked = !!likedMap[threadId];
      setLiked(threadId, !wasLiked);

      // Optimistic update in React Query cache (both feeds)
      const updater = (old: ThreadWithAuthor[] | undefined) =>
        old?.map((t) =>
          t.id === threadId
            ? { ...t, like_count: t.like_count + (wasLiked ? -1 : 1) }
            : t,
        );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "foryou"],
        updater,
      );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "following"],
        updater,
      );

      // Track analytics
      if (!wasLiked) {
        analytics.track("thread_like", { contentId: threadId });
      }

      return { previousForYou, previousFollowing, wasLiked };
    },
    onError: (err, threadId, context) => {
      // Rollback on error
      if (context?.previousForYou) {
        queryClient.setQueryData(
          ["threads-feed", "foryou"],
          context.previousForYou,
        );
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(
          ["threads-feed", "following"],
          context.previousFollowing,
        );
      }
      setLiked(threadId, context?.wasLiked ?? false);
    },
    onSuccess: (result, threadId) => {
      // Update with exact server count
      const updater = (old: ThreadWithAuthor[] | undefined) =>
        old?.map((t) =>
          t.id === threadId ? { ...t, like_count: result.likeCount } : t,
        );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "foryou"],
        updater,
      );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "following"],
        updater,
      );
    },
  });

  // Repost Mutation
  const repostMutation = useMutation({
    mutationFn: (threadId: string) => ThreadService.toggleRepost(threadId),
    onMutate: async (threadId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await queryClient.cancelQueries({ queryKey: ["threads-feed"] });
      const previousForYou = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "foryou",
      ]);
      const previousFollowing = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "following",
      ]);

      const wasReposted = !!repostMap[threadId];
      setReposted(threadId, !wasReposted);

      const updater = (old: ThreadWithAuthor[] | undefined) =>
        old?.map((t) =>
          t.id === threadId
            ? { ...t, repost_count: t.repost_count + (wasReposted ? -1 : 1) }
            : t,
        );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "foryou"],
        updater,
      );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "following"],
        updater,
      );

      return { previousForYou, previousFollowing, wasReposted };
    },
    onError: (err, threadId, context) => {
      if (context?.previousForYou) {
        queryClient.setQueryData(
          ["threads-feed", "foryou"],
          context.previousForYou,
        );
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(
          ["threads-feed", "following"],
          context.previousFollowing,
        );
      }
      setReposted(threadId, context?.wasReposted ?? false);
    },
    onSuccess: (result, threadId) => {
      const updater = (old: ThreadWithAuthor[] | undefined) =>
        old?.map((t) =>
          t.id === threadId ? { ...t, repost_count: result.repostCount } : t,
        );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "foryou"],
        updater,
      );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "following"],
        updater,
      );
    },
  });

  const handleLike = useCallback(
    (threadId: string) => {
      likeMutation.mutate(threadId);
    },
    [likeMutation],
  );

  const handleRepost = useCallback(
    (threadId: string) => {
      repostMutation.mutate(threadId);
    },
    [repostMutation],
  );

  // Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: (threadId: string) => ThreadService.toggleBookmark(threadId),
    onMutate: async (threadId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await queryClient.cancelQueries({ queryKey: ["threads-feed"] });
      const previousForYou = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "foryou",
      ]);
      const previousFollowing = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "following",
      ]);

      const wasBookmarked = !!bookmarkMap[threadId];
      setBookmarked(threadId, !wasBookmarked);

      return { previousForYou, previousFollowing, wasBookmarked };
    },
    onError: (err, threadId, context) => {
      if (context?.previousForYou) {
        queryClient.setQueryData(
          ["threads-feed", "foryou"],
          context.previousForYou,
        );
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(
          ["threads-feed", "following"],
          context.previousFollowing,
        );
      }
      setBookmarked(threadId, context?.wasBookmarked ?? false);
    },
    onSuccess: (result, threadId) => {
      setBookmarked(threadId, result.bookmarked);
      // Invalidate bookmarked threads list
      queryClient.invalidateQueries({ queryKey: ["bookmarked-threads"] });
    },
  });

  const handleBookmark = useCallback(
    (threadId: string) => {
      bookmarkMutation.mutate(threadId);
    },
    [bookmarkMutation],
  );

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => ThreadService.deleteThread(threadId),
    onMutate: async (threadId) => {
      await queryClient.cancelQueries({ queryKey: ["threads-feed"] });

      const previousForYou = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "foryou",
      ]);
      const previousFollowing = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "following",
      ]);

      const updater = (old: ThreadWithAuthor[] | undefined) =>
        old?.filter((t) => t.id !== threadId);

      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "foryou"],
        updater,
      );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "following"],
        updater,
      );

      return { previousForYou, previousFollowing };
    },
    onError: (err, threadId, context) => {
      if (context?.previousForYou) {
        queryClient.setQueryData(
          ["threads-feed", "foryou"],
          context.previousForYou,
        );
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(
          ["threads-feed", "following"],
          context.previousFollowing,
        );
      }
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["threads-feed"] });
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      }
    },
  });

  const handleDelete = useCallback(
    (threadId: string) => {
      deleteMutation.mutate(threadId);
    },
    [deleteMutation],
  );

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: ({
      threadId,
      content,
      media,
    }: {
      threadId: string;
      content: string;
      media?: any;
    }) => ThreadService.editThread(threadId, content, media),
    onMutate: async ({ threadId, content, media }) => {
      await queryClient.cancelQueries({ queryKey: ["threads-feed"] });

      const previousForYou = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "foryou",
      ]);
      const previousFollowing = queryClient.getQueryData<ThreadWithAuthor[]>([
        "threads-feed",
        "following",
      ]);

      const updater = (old: ThreadWithAuthor[] | undefined) =>
        old?.map((t) =>
          t.id === threadId
            ? {
                ...t,
                content,
                media: media ?? t.media,
                images:
                  media
                    ?.filter((m: any) => m.type === "image")
                    .map((m: any) => m.uri) ?? t.images,
              }
            : t,
        );

      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "foryou"],
        updater,
      );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "following"],
        updater,
      );

      return { previousForYou, previousFollowing };
    },
    onError: (err, variables, context) => {
      if (context?.previousForYou) {
        queryClient.setQueryData(
          ["threads-feed", "foryou"],
          context.previousForYou,
        );
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(
          ["threads-feed", "following"],
          context.previousFollowing,
        );
      }
    },
    onSuccess: (updatedThread) => {
      // Success: replace with final server state
      const updater = (old: ThreadWithAuthor[] | undefined) =>
        old?.map((t) => (t.id === updatedThread.id ? updatedThread : t));

      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "foryou"],
        updater,
      );
      queryClient.setQueryData<ThreadWithAuthor[]>(
        ["threads-feed", "following"],
        updater,
      );
    },
  });

  const handleEdit = useCallback(
    (threadId: string, content: string, media?: any) => {
      editMutation.mutate({ threadId, content, media });
    },
    [editMutation],
  );

  return {
    data: data ?? [],
    isLoading,
    isRefreshing: isFetching,
    refresh: refetch,
    likedMap,
    repostMap,
    bookmarkMap,
    handleLike,
    handleRepost,
    handleBookmark,
    handleDelete,
    handleEdit,
  };
}
