// app/(onboarding)/avatar.tsx
// Step 2: Choose or upload a profile photo

import React, { useState, useCallback } from 'react';
import { View, ScrollView, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/services/supabase';
import { AVATAR_OPTIONS } from '@/constants/app';
import { Camera, Check } from 'lucide-react-native';

export default function AvatarStep() {
  const [selectedUrl, setSelectedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const userId = useAuthStore((s) => s.userId);
  const updateOnboardingStep = useAuthStore((s) => s.updateOnboardingStep);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const handleNext = useCallback(async () => {
    if (!selectedUrl || !userId) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: selectedUrl, onboarding_step: 2 })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await updateOnboardingStep(2);
    await refreshProfile();
    router.push('/(onboarding)/bio');
    setSaving(false);
  }, [selectedUrl, userId, updateOnboardingStep, refreshProfile]);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack className="w-full" space="lg">
        <VStack space="xs">
          <Heading size="xl" className="text-brand-light">Add a profile photo</Heading>
          <Text className="text-[14px] text-brand-muted leading-[20px]">
            Choose a photo so people can recognize you.
          </Text>
        </VStack>

        {/* Preview */}
        <View className="items-center py-4">
          {selectedUrl ? (
            <Image
              source={{ uri: selectedUrl }}
              className="w-28 h-28 rounded-full"
              style={{ backgroundColor: '#1a1a1a' }}
            />
          ) : (
            <View className="w-28 h-28 rounded-full bg-[#1a1a1a] items-center justify-center border-2 border-dashed border-brand-border">
              <Camera size={32} color="#666" />
            </View>
          )}
        </View>

        {error && (
          <View className="rounded-xl bg-red-500/10 px-4 py-3">
            <Text className="text-[13px] text-brand-red text-center">{error}</Text>
          </View>
        )}

        {/* Avatar options grid */}
        <View>
          <Text className="text-[13px] text-brand-muted mb-3">Choose an avatar</Text>
          <View className="flex-row flex-wrap gap-3 justify-center">
            {AVATAR_OPTIONS.map((url) => (
              <Pressable
                key={url}
                onPress={() => setSelectedUrl(url)}
                className="relative"
              >
                <Image
                  source={{ uri: url }}
                  className={`w-16 h-16 rounded-full ${
                    selectedUrl === url ? 'border-2 border-brand-blue' : 'border border-brand-border'
                  }`}
                  style={{ backgroundColor: '#1a1a1a' }}
                />
                {selectedUrl === url && (
                  <View className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-blue items-center justify-center">
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          onPress={handleNext}
          isDisabled={!selectedUrl || saving}
          className={`h-[50px] rounded-xl ${selectedUrl ? 'bg-brand-blue active:opacity-80' : 'bg-brand-border'}`}
        >
          {saving ? <ButtonSpinner color="#fff" /> : <ButtonText className="text-[15px] font-semibold text-white">Next</ButtonText>}
        </Button>
      </VStack>
    </ScrollView>
  );
}
