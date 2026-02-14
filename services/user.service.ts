import {
  getProfile,
  toggleUserFollow,
  isUserFollowedByCurrentUser,
  getActivity,
  updateCurrentUser,
  getCurrentUser
} from '@/db/selectors';
import type { User, ActivityItem } from '@/types/types';

/**
 * Service for handling user profiles, relationships, and activity.
 * Designed to be swapped with Supabase Auth and Database calls.
 */
export const UserService = {
  /**
   * Fetches a user profile by ID, including stats and threads
   */
  async getProfile(userId: string) {
    return getProfile(userId);
  },

  /**
   * Gets the currently authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return getCurrentUser();
  },

  /**
   * Toggles following status for a user
   */
  async toggleFollow(userId: string) {
    return toggleUserFollow(userId);
  },

  /**
   * Checks if current user follows target user
   */
  async isFollowing(userId: string): Promise<boolean> {
    return isUserFollowedByCurrentUser(userId);
  },

  /**
   * Fetches the activity/notification feed
   */
  async getActivity(): Promise<ActivityItem[]> {
    return getActivity();
  },

  /**
   * Updates the current user's profile info
   */
  async updateProfile(updates: Partial<User>) {
    return updateCurrentUser(updates);
  }
};
