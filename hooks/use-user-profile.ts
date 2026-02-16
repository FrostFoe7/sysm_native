import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/useAuthStore";
import type { User } from "@/types/types";

/**
 * Hook for managing the current user's own profile state.
 */
export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuthStore();

  const loadProfile = useCallback(async () => {
    try {
      if (!userId) return;
      const data = await UserService.getProfile(userId);
      setProfile(data);
    } catch (error) {
      console.error("Failed to load current user profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  return {
    profile,
    isLoading,
    refresh: loadProfile,
  };
}
