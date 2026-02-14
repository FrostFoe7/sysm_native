import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ChatService } from '@/services/chat.service';
import type { ConversationWithDetails } from '@/types/types';

/**
 * Hook for managing the user's inbox (conversations list).
 */
export function useInbox() {
  const [data, setData] = useState<ConversationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInbox = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const conversations = await ChatService.getConversations();
      setData(conversations);
    } catch (error) {
      console.error('Failed to load inbox:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInbox();
    }, [loadInbox])
  );

  return {
    data,
    isLoading,
    isRefreshing,
    refresh: loadInbox
  };
}
