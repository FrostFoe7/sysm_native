// app/_layout.tsx

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '@/global.css';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AppToastProvider } from '@/components/AppToast';

const ThreadsDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#ffffff',
    background: '#101010',
    card: '#101010',
    text: '#f3f5f7',
    border: '#2a2a2a',
    notification: '#ff3040',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
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
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="thread/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Thread',
              headerTintColor: '#f3f5f7',
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
              headerTintColor: '#f3f5f7',
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
              headerTintColor: '#f3f5f7',
              headerStyle: { backgroundColor: '#101010' },
              headerShadowVisible: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerTitle: 'New Thread',
              headerTintColor: '#f3f5f7',
              headerStyle: { backgroundColor: '#181818' },
              headerShadowVisible: false,
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
      </AppToastProvider>
    </GluestackUIProvider>
  );
}
