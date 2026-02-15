// app/(onboarding)/_layout.tsx
// Onboarding route group with progress stepper

import React from 'react';
import { View, Platform, Pressable, ScrollView } from 'react-native';
import { Stack, usePathname, router } from 'expo-router';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { ChevronLeft } from 'lucide-react-native';

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
  const canGoBack = currentIdx > 0;

  return (
    <View className="px-6 pb-4 pt-2 lg:hidden">
      <View className="mb-4 h-10 flex-row items-center justify-between">
        {canGoBack ? (
          <Pressable 
            onPress={() => router.back()} 
            className="flex-row items-center rounded-full bg-white/5 px-3 py-1.5 active:bg-white/10"
            hitSlop={20}
          >
            <ChevronLeft size={18} color="#f5f5f5" />
            <Text className="ml-1 text-[13px] font-semibold text-brand-light">Back</Text>
          </Pressable>
        ) : (
          <View className="w-20" />
        )}
        <Text className="text-[15px] font-bold text-brand-light">
          Set up profile
        </Text>
        <View className="w-20" />
      </View>

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

      <Text className="mt-2 text-[12px] text-brand-muted">
        Step {progress} of {STEPS.length} — {STEPS[currentIdx]?.label}
      </Text>
    </View>
  );
}

function DesktopStepper() {
  const pathname = usePathname();
  const currentRoute = pathname.split('/').pop() || '';
  const currentIdx = STEPS.findIndex((s) => s.route === currentRoute);

  return (
    <View className="pr-4">
      {STEPS.map((step, i) => (
        <View key={step.route} className="mb-8 flex-row items-center">
          <View
            className={`mr-4 size-10 items-center justify-center rounded-full ${
              i < currentIdx
                ? 'bg-brand-blue'
                : i === currentIdx
                  ? 'border-2 border-brand-blue bg-brand-blue/20'
                  : 'bg-brand-border'
            }`}
          >
            {i < currentIdx ? (
              <Text className="text-[18px] font-bold text-white">✓</Text>
            ) : (
              <Text
                className={`text-[15px] font-bold ${
                  i === currentIdx ? 'text-brand-blue' : 'text-brand-muted'
                }`}
              >
                {i + 1}
              </Text>
            )}
          </View>
          <VStack space="none">
            <Text
              className={`text-[16px] ${
                i === currentIdx ? 'font-bold text-brand-light' : 'text-brand-muted'
              }`}
            >
              {step.label}
            </Text>
            {i === currentIdx && (
              <Text className="text-[13px] font-medium text-brand-blue">In progress</Text>
            )}
          </VStack>
        </View>
      ))}
    </View>
  );
}

export default function OnboardingLayout() {
  const pathname = usePathname();
  const currentRoute = pathname.split('/').pop() || '';
  const currentIdx = STEPS.findIndex((s) => s.route === currentRoute);
  const canGoBack = currentIdx > 0;

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      <View className="flex-1 flex-col lg:flex-row">
        
        {/* Sidebar: Desktop Only (lg: breakpoint) */}
        <View className="hidden border-r border-brand-border bg-brand-elevated lg:flex lg:w-full lg:max-w-[400px]">
          <ScrollView 
            contentContainerStyle={{ padding: 48, paddingTop: 64, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-16">
              <Text className="text-[36px] font-extrabold tracking-tighter text-brand-light">sysm</Text>
              <Text className="mt-2 text-[16px] leading-[24px] text-brand-muted">
                You&rsquo;re almost there!{'\n'}Complete these steps to join the community.
              </Text>
            </View>
            
            <DesktopStepper />
          </ScrollView>
        </View>

        {/* Content Area */}
        <View className="flex-1">
          {/* Mobile Progress (Hidden on Desktop) */}
          <ProgressBar />

          {/* Desktop Navigation (lg: breakpoint) */}
          <View className="hidden h-24 flex-row items-center px-12 lg:flex">
            {canGoBack && (
              <Pressable 
                onPress={() => router.back()} 
                className="flex-row items-center rounded-xl bg-white/5 px-4 py-2 active:bg-white/10"
              >
                <ChevronLeft size={20} color="#f5f5f5" />
                <Text className="ml-1.5 text-[14px] font-semibold text-brand-light">Back</Text>
              </Pressable>
            )}
          </View>

          {/* Screen Content */}
          <View className="mx-auto w-full flex-1 px-6 py-4 lg:max-w-screen-sm lg:px-12 lg:py-0">
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
              }}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
