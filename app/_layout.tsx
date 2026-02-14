// app/_layout.tsx

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/global.css';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AppToastProvider } from '@/components/AppToast';

// Create a client
const queryClient = new QueryClient();

const ThreadsDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#ffffff',
    background: 'brand-dark',
    card: 'brand-dark',
    text: 'brand-light',
    border: 'brand-border-secondary',
    notification: 'brand-red',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider mode="dark">
        <AppToastProvider>
        <ThemeProvider value={ThreadsDark}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'brand-dark' },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="thread/[id]"
              options={{
                headerShown: true,
                headerTitle: 'Thread',
                headerTintColor: 'brand-light',
                headerStyle: { backgroundColor: 'brand-dark' },
                headerShadowVisible: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="profile/[id]"
              options={{
                headerShown: true,
                headerTitle: '',
                headerTintColor: 'brand-light',
                headerStyle: { backgroundColor: 'brand-dark' },
                headerShadowVisible: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="profile/edit"
              options={{
                headerShown: true,
                headerTitle: 'Edit Profile',
                headerTintColor: 'brand-light',
                headerStyle: { backgroundColor: 'brand-dark' },
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
                headerTintColor: 'brand-light',
                headerStyle: { backgroundColor: 'brand-elevated' },
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
