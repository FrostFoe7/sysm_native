import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { UserService } from '@/services/user.service';
import { getProfile } from '@/db/selectors';
import { CURRENT_USER_ID } from '@/constants/app';
import type { User } from '@/types/types';

/**
 * Hook for managing the current user's own profile state.
 */
export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      // For current user, we use the profile selector which joins stats
      const data = await UserService.getProfile(CURRENT_USER_ID);
      setProfile(data);
    } catch (error) {
      console.error('Failed to load current user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  return {
    profile,
    isLoading,
    refresh: loadProfile
  };
}
