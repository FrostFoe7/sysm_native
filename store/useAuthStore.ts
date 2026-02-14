import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import type { User } from '@/types/types';
import type { Session, AuthError } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  userId: string | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string, displayName: string) => Promise<{ error: AuthError | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: AuthError | null }>;
  setSession: (session: Session | null) => void;
  updateUser: (updates: Partial<User>) => void;
  fetchProfile: (authId: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      userId: null,
      user: null,
      isLoading: true,
      isInitialized: false,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const profile = await get().fetchProfile(session.user.id);
            set({
              session,
              userId: profile?.id ?? null,
              user: profile,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({ session: null, userId: null, user: null, isLoading: false, isInitialized: true });
          }

          supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession?.user) {
              const profile = await get().fetchProfile(newSession.user.id);
              set({
                session: newSession,
                userId: profile?.id ?? null,
                user: profile,
                isLoading: false,
              });
            } else if (event === 'SIGNED_OUT') {
              set({ session: null, userId: null, user: null, isLoading: false });
            } else if (event === 'TOKEN_REFRESHED' && newSession) {
              set({ session: newSession });
            }
          });
        } catch {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signUpWithEmail: async (email, password, username, displayName) => {
        set({ isLoading: true });

        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (existing) {
          set({ isLoading: false });
          return { error: { message: 'Username already taken', status: 422, name: 'AuthError' } as AuthError };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: displayName } },
        });

        if (error) {
          set({ isLoading: false });
          return { error };
        }

        if (data.user) {
          const { error: profileError } = await supabase.from('users').insert({
            auth_id: data.user.id,
            username,
            display_name: displayName,
            avatar_url: '',
            bio: '',
          });

          if (profileError) {
            set({ isLoading: false });
            return { error: { message: profileError.message, status: 500, name: 'AuthError' } as AuthError };
          }

          const profile = await get().fetchProfile(data.user.id);
          set({
            session: data.session,
            userId: profile?.id ?? null,
            user: profile,
            isLoading: false,
          });
        }

        return { error: null };
      },

      signInWithEmail: async (email, password) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          set({ isLoading: false });
          return { error };
        }

        if (data.user) {
          const profile = await get().fetchProfile(data.user.id);
          set({
            session: data.session,
            userId: profile?.id ?? null,
            user: profile,
            isLoading: false,
          });
        }
        return { error: null };
      },

      signInWithMagicLink: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        return { error };
      },

      signInWithOAuth: async (provider) => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: 'sysm://auth/callback' },
        });
        return { error };
      },

      setSession: (session) => set({ session }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      fetchProfile: async (authId: string): Promise<User | null> => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authId)
          .maybeSingle();

        if (error || !data) return null;

        return {
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          bio: data.bio,
          verified: data.verified,
          followers_count: data.followers_count,
          following_count: data.following_count,
          created_at: data.created_at,
        };
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ session: null, userId: null, user: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        userId: state.userId,
        user: state.user,
      }),
    },
  ),
);
