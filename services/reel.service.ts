import {
  getReelsFeed,
  getReelById,
  getReelComments,
  getReelsByUser,
  toggleReelLike
} from '@/db/selectors';
import type { ReelWithAuthor, ReelCommentWithAuthor } from '@/types/types';

/**
 * Service for handling Instagram-style Reels data.
 * Ready for Supabase storage and database integration.
 */
export const ReelService = {
  /**
   * Fetches the main reels feed
   */
  async getFeed(): Promise<ReelWithAuthor[]> {
    return getReelsFeed();
  },

  /**
   * Fetches a specific reel by ID
   */
  async getReel(id: string): Promise<ReelWithAuthor | undefined> {
    return getReelById(id);
  },

  /**
   * Fetches comments for a specific reel
   */
  async getComments(reelId: string): Promise<ReelCommentWithAuthor[]> {
    return getReelComments(reelId);
  },

  /**
   * Fetches all reels for a specific user
   */
  async getReelsByUser(userId: string): Promise<ReelWithAuthor[]> {
    return getReelsByUser(userId);
  },

  /**
   * Toggles like on a reel
   */
  async toggleLike(reelId: string) {
    return toggleReelLike(reelId);
  }
};
