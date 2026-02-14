import { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ChatService } from '@/services/chat.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { MessageWithSender, ConversationWithDetails, ChatItem } from '@/types/types';

/**
 * Hook for managing a specific chat conversation.
 * Handles message grouping, sending, and real-time updates with optimistic UI.
 */
export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [details, setDetails] = useState<ConversationWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  const loadData = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const [msgData, detailData] = await Promise.all([
        ChatService.getMessages(conversationId),
        ChatService.getConversation(conversationId)
      ]);
      
      setMessages(msgData);
      setDetails(detailData ?? null);
      
      // Mark as read when focusing/loading
      await ChatService.markAsRead(conversationId);
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const chatItems = useMemo(() => buildChatItems(messages), [messages]);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!conversationId || !content.trim() || !user) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: MessageWithSender = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      sender: user,
      type: 'text',
      content: content.trim(),
      media_url: null,
      media_thumbnail: null,
      reply_to_id: replyToId || null,
      shared_thread_id: null,
      shared_reel_id: null,
      reactions: [],
      status: 'sending',
      created_at: new Date().toISOString(),
      is_deleted: false,
      replyTo: null,
      sharedThread: null,
      sharedReel: null,
    };

    // Optimistically add message to UI
    setMessages(prev => [...prev, tempMessage]);

    try {
      const sentMessage = await ChatService.sendMessage({
        conversationId,
        content: content.trim(),
        replyToId
      });
      
      // Replace temporary message with actual message from server
      setMessages(prev => 
        prev.map(m => m.id === tempId ? { ...sentMessage, sender: user, replyTo: null, sharedThread: null, sharedReel: null } : m)
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark as error so UI can show retry or failure state
      setMessages(prev => 
        prev.map(m => m.id === tempId ? { ...m, status: 'error' as any } : m)
      );
    }
  }, [conversationId, user]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await ChatService.toggleReaction(messageId, emoji);
      loadData();
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  }, [loadData]);

  return {
    messages,
    chatItems,
    details,
    isLoading,
    sendMessage,
    toggleReaction,
    refresh: loadData
  };
}

/**
 * Internal helper to build chat items with date separators
 */
function buildChatItems(messages: MessageWithSender[]): ChatItem[] {
  const items: ChatItem[] = [];
  let lastDate = '';
  let lastSenderId = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.created_at).toDateString();
    const nextMsg = messages[i + 1];

    // Date separator
    if (msgDate !== lastDate) {
      items.push({ type: 'date', date: msg.created_at, key: `date-${msgDate}` });
      lastDate = msgDate;
      lastSenderId = '';
    }

    const showAvatar = msg.sender_id !== lastSenderId || msg.type === 'system';
    const isLastFromSender = !nextMsg || nextMsg.sender_id !== msg.sender_id;

    items.push({
      type: 'message',
      message: msg,
      showAvatar,
      showTimestamp: isLastFromSender,
      key: msg.id,
    });

    lastSenderId = msg.sender_id;
  }

  return items;
}
