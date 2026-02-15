// app/(onboarding)/_layout.tsx
// Onboarding route group with progress stepper

import React from 'react';
import { View, useWindowDimensions, Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { DESKTOP_BREAKPOINT } from '@/constants/ui';

const STEPS = [
  { route: 'username', label: 'Username' },
  { route: 'avatar', label: 'Photo' },
  { route: 'bio', label: 'Profile' },
  { route: 'interests', label: 'Interests' },
  { route: 'follow-suggestions', label: 'Follow' },
];

function ProgressBar() {
  const pathname = usePathname();
  const currentRoute = pathname.split('/').pop() || '';
  const currentIdx = STEPS.findIndex((s) => s.route === currentRoute);
  const progress = currentIdx >= 0 ? currentIdx + 1 : 1;

  return (
    <View className="px-6 pt-2 pb-4">
      {/* Step indicator */}
      <View className="flex-row gap-1.5">
        {STEPS.map((step, i) => (
          <View
            key={step.route}
            className={`h-[3px] flex-1 rounded-full ${
              i < progress ? 'bg-brand-blue' : 'bg-brand-border'
            }`}
          />
        ))}
      </View>

      {/* Step label */}
      <Text className="text-[12px] text-brand-muted mt-2">
        Step {progress} of {STEPS.length}
      </Text>
    </View>
  );
}

function DesktopStepper() {
  const pathname = usePathname();
  const currentRoute = pathname.split('/').pop() || '';
  const currentIdx = STEPS.findIndex((s) => s.route === currentRoute);

  return (
    <View className="w-[200px] pt-8 pr-8">
      {STEPS.map((step, i) => (
        <View key={step.route} className="flex-row items-center mb-4">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
              i < currentIdx
                ? 'bg-brand-blue'
                : i === currentIdx
                  ? 'bg-brand-blue/20 border-2 border-brand-blue'
                  : 'bg-brand-border'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                i <= currentIdx ? 'text-white' : 'text-brand-muted'
              }`}
            >
              {i < currentIdx ? '✓' : i + 1}
            </Text>
          </View>
          <Text
            className={`text-[14px] ${
              i === currentIdx ? 'text-brand-light font-semibold' : 'text-brand-muted'
            }`}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function OnboardingLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  if (isDesktop) {
    return (
      <View
        className="flex-1 items-center justify-center bg-brand-dark"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0,149,246,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(138,43,226,0.04) 0%, transparent 50%)',
        } as any}
      >
        <View className="flex-row w-[680px] rounded-2xl border border-brand-border bg-brand-elevated overflow-hidden">
          <DesktopStepper />
          <View className="flex-1 p-10">
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                animation: 'fade',
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      <ProgressBar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#101010' },
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
        }}
      />
    </SafeAreaView>
  );
}
