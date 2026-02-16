import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { UserService } from "@/services/user.service";
import type { ActivityItem, User } from "@/types/types";
import { useInteractionStore } from "@/store/useInteractionStore";

/**
 * Hook for managing a user's profile state and interactions.
 */
export function useUserProfile(userId: string) {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { followingUsers: followingMap, setFollowing } = useInteractionStore();

  const isFollowing = !!followingMap[userId];
  const [followersCount, setFollowersCount] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await UserService.getProfile(userId);
      const following = await UserService.isFollowing(userId);
      setProfile(data);
      setFollowing(userId, following);
      setFollowersCount(data?.followersCount ?? 0);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, setFollowing]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleFollowToggle = useCallback(async () => {
    // Optimistic update in global store
    const wasFollowing = isFollowing;
    setFollowing(userId, !wasFollowing);
    setFollowersCount((prev) => (wasFollowing ? prev - 1 : prev + 1));

    try {
      // Uses atomic toggle_follow RPC — single round-trip, no race condition
      const result = await UserService.toggleFollow(userId);
      setFollowing(userId, result.following);
      setFollowersCount(result.followersCount);
    } catch (error) {
      // Rollback global store on error
      setFollowing(userId, wasFollowing);
      setFollowersCount((prev) => (wasFollowing ? prev + 1 : prev - 1));
    }
  }, [userId, isFollowing, setFollowing]);

  return {
    profile,
    isLoading,
    isFollowing,
    followersCount,
    handleFollowToggle,
    refresh: loadProfile,
  };
}

/**
 * Hook for managing the activity feed.
 */
export function useActivity() {
  const [data, setData] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    try {
      const activity = await UserService.getActivity();
      setData(activity);
    } catch (error) {
      console.error("Failed to load activity:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [loadActivity]),
  );

  return {
    data,
    isLoading,
    refresh: loadActivity,
  };
}
