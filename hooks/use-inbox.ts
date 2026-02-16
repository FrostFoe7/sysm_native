import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ChatService } from "@/services/chat.service";
import { useAuthStore } from "@/store/useAuthStore";
import type { ConversationWithDetails } from "@/types/types";

/**
 * Hook for managing the user's inbox (conversations list).
 * - Realtime subscription (new messages + conversation updates) triggers debounced refresh
 * - Search filtering (local, instant)
 * - Pinned conversations sorted to the top
 */
export function useInbox() {
  const [data, setData] = useState<ConversationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userId = useAuthStore((s) => s.userId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInbox = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);

    try {
      const conversations = await ChatService.getConversations();
      setData(conversations);
    } catch (error) {
      console.error("Failed to load inbox:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      loadInbox();
    }, [loadInbox]),
  );

  // Realtime subscription — debounce 300ms to prevent reconnect spam
  useEffect(() => {
    if (!userId) return;

    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => loadInbox(), 300);
    };

    const channel = ChatService.subscribeToInbox(userId, debouncedRefresh);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      try {
        channel?.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [userId, loadInbox]);

  // Local search filtering + pinned-first sort
  const filtered = useMemo(() => {
    let result = data;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const name = (c.conversation.name ?? "").toLowerCase();
        const participantMatch = c.participants.some(
          (p) =>
            p.user?.display_name?.toLowerCase().includes(q) ||
            p.user?.username?.toLowerCase().includes(q),
        );
        return name.includes(q) || participantMatch;
      });
    }

    // Pinned first, then by latest message time descending
    return [...result].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTime = a.lastMessage?.created_at ?? a.conversation.created_at;
      const bTime = b.lastMessage?.created_at ?? b.conversation.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [data, searchQuery]);

  return {
    data: filtered,
    isLoading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    refresh: () => loadInbox(true),
  };
}
