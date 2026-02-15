// app/_layout.tsx

import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/global.css';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AppToastProvider } from '@/components/AppToast';
import { useAuthStore } from '@/store/useAuthStore';
import { PushService } from '@/services/push.service';
import { CryptoService } from '@/services/crypto.service';
import { Text } from '@/components/ui/text';

// Create a client
const queryClient = new QueryClient();

const ThreadsDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#ffffff',
    background: '#101010',
    card: '#101010',
    text: '#f5f5f5',
    border: '#2a2a2a',
    notification: '#ff3b30',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

// ─── Auth gate — redirects based on auth + onboarding state ─────────────────

function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    // No session → must be on auth screens
    if (!session) {
      if (!inAuth) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Session exists but user not onboarded → go to onboarding
    if (user && !user.is_onboarded) {
      if (!inOnboarding) {
        // Resume at correct step
        const stepRoutes = ['username', 'avatar', 'bio', 'interests', 'follow-suggestions'] as const;
        const step = Math.min(user.onboarding_step, stepRoutes.length - 1);
        router.replace(`/(onboarding)/${stepRoutes[step]}`);
      }
      return;
    }

    // Session + onboarded → should be in main app
    if (inAuth || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isInitialized, session, user, segments]);
}

// ─── Root layout ────────────────────────────────────────────────────────────────

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  useProtectedRoute();

  // Push notifications + E2EE key registration after login/signup
  useEffect(() => {
    if (!session || !user?.is_onboarded) return;

    // Register push token
    PushService.registerForPushNotifications().catch((e) =>
      console.warn('Push registration failed:', e),
    );

    // Setup notification response listener (tap → deep link)
    const cleanupResponse = PushService.setupNotificationResponseListener();
    const cleanupForeground = PushService.setupForegroundListener();

    // Register E2EE keys if not present
    CryptoService.hasLocalKeys().then((hasKeys) => {
      if (!hasKeys) {
        CryptoService.registerKeys().catch((e) =>
          console.warn('E2EE key registration failed:', e),
        );
      }
    });

    // Handle cold-start deep link
    PushService.getInitialNotification().catch(() => {});

    return () => {
      cleanupResponse();
      cleanupForeground();
    };
  }, [session, user?.is_onboarded]);

  // Show splash while initializing
  if (!isInitialized) {
    return (
      <GluestackUIProvider mode="dark">
        <View className="flex-1 items-center justify-center bg-brand-dark">
          <Text className="text-[36px] font-extrabold tracking-tighter text-brand-light mb-4">
            sysm
          </Text>
          <ActivityIndicator color="#0095f6" size="small" />
        </View>
      </GluestackUIProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider mode="dark">
        <AppToastProvider>
        <ThemeProvider value={ThreadsDark}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#101010' },
              animation: 'fade',
            }}
          >
            {/* Auth & onboarding groups */}
            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'fade' }} />

            {/* Main app */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="thread/[id]"
              options={{
                headerShown: true,
                headerTitle: 'Thread',
                headerTintColor: '#f5f5f5',
                headerStyle: { backgroundColor: '#101010' },
                headerShadowVisible: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="profile/[id]"
              options={{
                headerShown: true,
                headerTitle: '',
                headerTintColor: '#f5f5f5',
                headerStyle: { backgroundColor: '#101010' },
                headerShadowVisible: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="profile/edit"
              options={{
                headerShown: true,
                headerTitle: 'Edit Profile',
                headerTintColor: '#f5f5f5',
                headerStyle: { backgroundColor: '#101010' },
                headerShadowVisible: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="conversation/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="new-chat"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="group-info/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'New Thread',
                headerTintColor: '#f5f5f5',
                headerStyle: { backgroundColor: '#1a1a1a' },
                headerShadowVisible: false,
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
        </AppToastProvider>
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
