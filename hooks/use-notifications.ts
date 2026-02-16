import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import {
  NotificationService,
  type NotificationItem,
} from "@/services/notification.service";
import { getCachedUserId } from "@/services/supabase";

/**
 * Hook for managing the notification feed.
 * Fetches notifications via get_notifications RPC.
 * Subscribes to realtime inserts for live updates.
 * Tracks unread badge count.
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  // Notification feed
  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationService.getNotifications(),
    staleTime: 1000 * 30, // 30 seconds
  });

  // Unread count
  const { data: unreadCount = 0, refetch: refetchCount } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => NotificationService.getUnreadCount(),
    staleTime: 1000 * 15,
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => NotificationService.markAllRead(),
    onMutate: async () => {
      // Optimistic: set count to 0
      queryClient.setQueryData(["notifications-unread-count"], 0);
      // Mark all items as read in cache
      queryClient.setQueryData<NotificationItem[]>(["notifications"], (old) =>
        old?.map((n) => ({ ...n, is_read: true })),
      );
    },
    onSuccess: () => {
      refetchCount();
    },
    onError: () => {
      // Rollback by refetching
      refetch();
      refetchCount();
    },
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onMutate: async (id) => {
      queryClient.setQueryData<NotificationItem[]>(["notifications"], (old) =>
        old?.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      queryClient.setQueryData<number>(
        ["notifications-unread-count"],
        (old) => Math.max(0, (old ?? 1) - 1),
      );
    },
  });

  // Realtime subscription
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = await getCachedUserId();
      if (!userId || cancelled) return;

      channelRef.current = NotificationService.subscribeToNotifications(
        userId,
        (_notification: any) => {
          // Prepend new notification to cache
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({
            queryKey: ["notifications-unread-count"],
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
    };
  }, [queryClient]);

  return {
    notifications: data,
    isLoading,
    unreadCount,
    refresh: refetch,
    markAllRead: () => markAllReadMutation.mutate(),
    markRead: (id: string) => markReadMutation.mutate(id),
  };
}
