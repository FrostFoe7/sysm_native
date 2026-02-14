import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types/types';
import { CURRENT_USER_ID } from '@/constants/app';

interface AuthState {
  userId: string | null;
  user: User | null;
  isLoading: boolean;
  
  // Actions
  setSession: (userId: string | null, user?: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

/**
 * Global store for authentication and user session.
 * Persisted using AsyncStorage to maintain session across app restarts.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: CURRENT_USER_ID,
      user: null, // Should be populated by UserService on app load
      isLoading: false,

      setSession: (userId, user = null) => set({ userId, user, isLoading: false }),
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),

      logout: () => set({ userId: null, user: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
