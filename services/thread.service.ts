import { 
  getFeed, 
  getThreadDetail, 
  getThreadAncestors,
  toggleThreadLike, 
  toggleRepost,
  createNewThread,
  createReply,
  hideThread,
  deleteThread
} from '@/db/selectors';
import type { ThreadWithAuthor, ThreadWithReplies, MediaItem } from '@/types/types';

/**
 * Service for handling thread-related data operations.
 * This layer currently wraps the mock DB selectors but is designed
 * to be easily swapped with Supabase client calls in the future.
 */
export const ThreadService = {
  /**
   * Fetches the main threads feed
   */
  async getFeed(): Promise<ThreadWithAuthor[]> {
    // In Supabase: return supabase.from('threads').select('*, author:users(*)')...
    return getFeed();
  },

  /**
   * Fetches a single thread with its replies
   */
  async getThreadDetail(id: string): Promise<ThreadWithReplies | null> {
    return getThreadDetail(id);
  },

  /**
   * Fetches the ancestor threads for a given thread
   */
  async getThreadAncestors(id: string): Promise<ThreadWithAuthor[]> {
    return getThreadAncestors(id);
  },

  /**
   * Toggles the like status of a thread
   */
  async toggleLike(threadId: string) {
    return toggleThreadLike(threadId);
  },

  /**
   * Toggles the repost status of a thread
   */
  async toggleRepost(threadId: string) {
    return toggleRepost(threadId);
  },

  /**
   * Creates a new top-level thread
   */
  async createThread(content: string, media?: MediaItem[]) {
    return createNewThread(content, undefined, media);
  },

  /**
   * Creates a reply to an existing thread
   */
  async createReply(parentThreadId: string, content: string) {
    return createReply(parentThreadId, content);
  },

  /**
   * Hides a thread for the current user
   */
  async hideThread(threadId: string) {
    return hideThread(threadId);
  },

  /**
   * Deletes a thread
   */
  async deleteThread(threadId: string) {
    return deleteThread(threadId);
  }
};
