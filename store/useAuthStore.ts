import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, clearUserIdCache } from "@/services/supabase";
import type { User } from "@/types/types";
import type { Session, AuthError } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface AuthProfile extends User {
  is_onboarded: boolean;
  onboarding_step: number;
  interests: string[];
  website: string;
}

interface AuthState {
  session: Session | null;
  userId: string | null;
  user: AuthProfile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Lifecycle
  initialize: () => Promise<void>;

  // Auth methods
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (
    provider: "google" | "apple",
  ) => Promise<{ error: AuthError | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;

  // Profile
  setSession: (session: Session | null) => void;
  updateUser: (updates: Partial<AuthProfile>) => void;
  fetchProfile: (authId: string) => Promise<AuthProfile | null>;
  refreshProfile: () => Promise<void>;

  // Onboarding
  updateOnboardingStep: (step: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Session
  logout: () => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function rowToProfile(data: any): AuthProfile {
  return {
    id: data.id,
    username: data.username,
    display_name: data.display_name ?? "",
    avatar_url: data.avatar_url ?? "",
    bio: data.bio ?? "",
    verified: data.verified ?? false,
    is_private: data.is_private ?? false,
    followers_count: data.followers_count ?? 0,
    following_count: data.following_count ?? 0,
    created_at: data.created_at,
    is_onboarded: data.is_onboarded ?? false,
    onboarding_step: data.onboarding_step ?? 0,
    interests: data.interests ?? [],
    website: data.website ?? "",
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      userId: null,
      user: null,
      isLoading: true,
      isInitialized: false,

      // ─── Initialize ─────────────────────────────────────────────────────────

      initialize: async () => {
        // Prevent concurrent or double initialization
        if (get().isInitialized && !get().isLoading) return;

        try {
          // 1. Get initial session
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          // If session is invalid or refresh token is missing/expired, Supabase returns error or null
          if (error || !session?.user) {
            set({
              session: null,
              userId: null,
              user: null,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            const profile = await get().fetchProfile(session.user.id);
            set({
              session,
              userId: profile?.id ?? null,
              user: profile,
              isLoading: false,
              isInitialized: true,
            });
          }

          // 2. Setup subscription
          supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log("Auth event:", event);

            if (
              (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
              newSession?.user
            ) {
              const profile = await get().fetchProfile(newSession.user.id);
              set({
                session: newSession,
                userId: profile?.id ?? null,
                user: profile,
                isLoading: false,
                isInitialized: true,
              });
            } else if (event === "SIGNED_OUT") {
              clearUserIdCache();
              set({
                session: null,
                userId: null,
                user: null,
                isLoading: false,
                isInitialized: true,
              });
            } else if (event === "TOKEN_REFRESHED" && newSession) {
              set({ session: newSession });
            } else if (event === "PASSWORD_RECOVERY" && newSession) {
              set({ session: newSession });
            } else if (event === "USER_UPDATED" && newSession) {
              set({ session: newSession });
            }
          });
        } catch (err) {
          console.error("Auth initialization error:", err);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // ─── Sign Up ────────────────────────────────────────────────────────────

      signUpWithEmail: async (email, password) => {
        set({ isLoading: true });

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          set({ isLoading: false });
          return { error };
        }

        if (data.user) {
          // The DB trigger handle_new_user() auto-creates the profile row.
          // Wait a moment for the trigger to fire, then fetch.
          await new Promise((r) => setTimeout(r, 500));
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

      // ─── Sign In ────────────────────────────────────────────────────────────

      signInWithEmail: async (email, password) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

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

      // ─── Magic Link ─────────────────────────────────────────────────────────

      signInWithMagicLink: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        return { error };
      },

      // ─── OAuth ──────────────────────────────────────────────────────────────

      signInWithOAuth: async (provider) => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: "sysm://auth/callback" },
        });
        return { error };
      },

      // ─── Password Reset ─────────────────────────────────────────────────────

      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "sysm://auth/reset-password",
        });
        return { error };
      },

      updatePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        return { error };
      },

      // ─── Session / Profile ──────────────────────────────────────────────────

      setSession: (session) => set({ session }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      fetchProfile: async (authId: string): Promise<AuthProfile | null> => {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authId)
          .maybeSingle();

        if (error || !data) return null;
        return rowToProfile(data);
      },

      refreshProfile: async () => {
        const session = get().session;
        if (!session?.user) return;
        const profile = await get().fetchProfile(session.user.id);
        if (profile) {
          set({ user: profile, userId: profile.id });
        }
      },

      // ─── Onboarding ─────────────────────────────────────────────────────────

      updateOnboardingStep: async (step: number) => {
        const userId = get().userId;
        if (!userId) return;

        await supabase
          .from("users")
          .update({ onboarding_step: step })
          .eq("id", userId);
        set((state) => ({
          user: state.user ? { ...state.user, onboarding_step: step } : null,
        }));
      },

      completeOnboarding: async () => {
        const userId = get().userId;
        if (!userId) return;

        await supabase
          .from("users")
          .update({
            is_onboarded: true,
            onboarding_step: 5,
          })
          .eq("id", userId);

        set((state) => ({
          user: state.user
            ? { ...state.user, is_onboarded: true, onboarding_step: 5 }
            : null,
        }));
      },

      // ─── Logout ─────────────────────────────────────────────────────────────

      logout: async () => {
        clearUserIdCache();
        await supabase.auth.signOut();
        set({ session: null, userId: null, user: null });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        userId: state.userId,
        user: state.user,
      }),
    },
  ),
);
