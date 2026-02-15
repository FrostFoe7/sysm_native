// components/AuthCard.tsx
// Responsive auth card — fullscreen on mobile, centered card on desktop

import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { DESKTOP_BREAKPOINT } from '@/constants/ui';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const content = (
    <VStack className="w-full" space="lg">
      {/* Logo */}
      <View className="items-center mb-2">
        <Text className="text-[36px] font-extrabold tracking-tighter text-brand-light">
          sysm
        </Text>
      </View>

      {/* Title + subtitle */}
      <VStack className="items-center" space="xs">
        <Heading size="xl" className="text-center text-brand-light">
          {title}
        </Heading>
        {subtitle && (
          <Text className="text-center text-[14px] text-brand-muted leading-[20px] max-w-[280px]">
            {subtitle}
          </Text>
        )}
      </VStack>

      {/* Form content */}
      <VStack className="w-full" space="md">
        {children}
      </VStack>

      {/* Footer links */}
      {footer && (
        <View className="mt-2">
          {footer}
        </View>
      )}
    </VStack>
  );

  if (isDesktop) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-dark"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0,149,246,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(138,43,226,0.04) 0%, transparent 50%)',
        } as any}
      >
        <View className="w-[420px] rounded-2xl border border-brand-border bg-brand-elevated p-10">
          {content}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
