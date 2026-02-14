import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  markConversationAsRead,
  toggleMessageReaction,
} from '@/db/selectors';
import type { 
  ConversationWithDetails, 
  MessageWithSender, 
  DirectMessage 
} from '@/types/types';

/**
 * Service for handling direct messaging and conversation data.
 * Wraps mock DB logic to prepare for Supabase Realtime transition.
 */
export const ChatService = {
  /**
   * Fetches all conversations for the current user
   */
  async getConversations(): Promise<ConversationWithDetails[]> {
    return getConversations();
  },

  /**
   * Fetches details for a specific conversation
   */
  async getConversation(id: string): Promise<ConversationWithDetails | null> {
    return getConversation(id);
  },

  /**
   * Fetches messages for a specific conversation
   */
  async getMessages(conversationId: string): Promise<MessageWithSender[]> {
    return getMessages(conversationId);
  },

  /**
   * Sends a new message
   */
  async sendMessage(params: {
    conversationId: string;
    content: string;
    replyToId?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  }): Promise<DirectMessage> {
    return sendMessage(params);
  },

  /**
   * Marks a conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    return markConversationAsRead(conversationId);
  },

  /**
   * Toggles a reaction on a message
   */
  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    return toggleMessageReaction(messageId, emoji);
  }
};
