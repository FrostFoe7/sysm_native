// app/(onboarding)/interests.tsx
// Step 4: Pick interests/topics

import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/services/supabase';
import { VerifiedIcon } from '@/constants/icons';

const INTEREST_OPTIONS = [
  { id: 'tech', label: 'Technology', emoji: '💻' },
  { id: 'design', label: 'Design', emoji: '🎨' },
  { id: 'startups', label: 'Startups', emoji: '🚀' },
  { id: 'ai', label: 'AI & ML', emoji: '🤖' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'photography', label: 'Photography', emoji: '📸' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'books', label: 'Books', emoji: '📚' },
  { id: 'movies', label: 'Movies', emoji: '🎬' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
  { id: 'crypto', label: 'Crypto', emoji: '₿' },
  { id: 'art', label: 'Art', emoji: '🖼️' },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'health', label: 'Health', emoji: '🏥' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
];

const MIN_INTERESTS = 3;

export default function InterestsStep() {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const userId = useAuthStore((s) => s.userId);
  const updateOnboardingStep = useAuthStore((s) => s.updateOnboardingStep);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const toggle = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleNext = useCallback(async () => {
    if (selected.length < MIN_INTERESTS) return;
    if (!userId) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('users')
      .update({ interests: selected, onboarding_step: 4 })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await updateOnboardingStep(4);
    await refreshProfile();
    router.push('/(onboarding)/follow-suggestions');
    setSaving(false);
  }, [selected, userId, updateOnboardingStep, refreshProfile]);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack className="w-full" space="lg">
        <VStack space="xs">
          <Heading size="xl" className="text-brand-light">What are you into?</Heading>
          <Text className="text-[14px] leading-[20px] text-brand-muted">
            Pick at least {MIN_INTERESTS} topics to personalize your feed.
          </Text>
        </VStack>

        {error && (
          <View className="rounded-xl bg-red-500/10 px-4 py-3">
            <Text className="text-center text-[13px] text-brand-red">{error}</Text>
          </View>
        )}

        {/* Interest chips */}
        <View className="flex-row flex-wrap gap-2.5">
          {INTEREST_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => toggle(option.id)}
                className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2.5 ${
                  isSelected
                    ? 'border-brand-blue bg-brand-blue/15'
                    : 'border-brand-border bg-[#1a1a1a]'
                }`}
              >
                <Text className="text-[15px]">{option.emoji}</Text>
                <Text
                  className={`text-[14px] ${
                    isSelected ? 'font-semibold text-brand-blue' : 'text-brand-light'
                  }`}
                >
                  {option.label}
                </Text>
                {isSelected && <VerifiedIcon size={14} color="#0095f6" />}
              </Pressable>
            );
          })}
        </View>

        {/* Selection count */}
        <Text className="text-center text-[13px] text-brand-muted">
          {selected.length} selected{selected.length < MIN_INTERESTS ? ` (${MIN_INTERESTS - selected.length} more)` : ''}
        </Text>

        <Button
          onPress={handleNext}
          isDisabled={selected.length < MIN_INTERESTS || saving}
          className={`h-[50px] rounded-xl ${selected.length >= MIN_INTERESTS ? 'bg-brand-blue active:opacity-80' : 'bg-brand-border'}`}
        >
          {saving ? <ButtonSpinner color="#fff" /> : <ButtonText className="text-[15px] font-semibold text-white">Next</ButtonText>}
        </Button>
      </VStack>
    </ScrollView>
  );
}
