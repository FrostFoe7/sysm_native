// app/(onboarding)/bio.tsx
// Step 3: Display name, bio, and website

import React, { useState, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { FloatingInput } from '@/components/FloatingInput';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/services/supabase';
import { MAX_BIO_LENGTH, MAX_NAME_LENGTH } from '@/constants/app';

export default function BioStep() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const updateOnboardingStep = useAuthStore((s) => s.updateOnboardingStep);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const handleNext = useCallback(async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!userId) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('users')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        onboarding_step: 3,
      })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await updateOnboardingStep(3);
    await refreshProfile();
    router.push('/(onboarding)/interests');
    setSaving(false);
  }, [displayName, bio, website, userId, updateOnboardingStep, refreshProfile]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <VStack className="w-full" space="lg">
          <VStack space="xs">
            <Heading size="xl" className="text-brand-light">About you</Heading>
            <Text className="text-[14px] leading-[20px] text-brand-muted">
              Tell people a little about yourself.
            </Text>
          </VStack>

          {error && (
            <View className="rounded-xl bg-red-500/10 px-4 py-3">
              <Text className="text-center text-[13px] text-brand-red">{error}</Text>
            </View>
          )}

          {/* Display name */}
          <View>
            <FloatingInput
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={MAX_NAME_LENGTH}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Text className="ml-1 mt-1 text-[11px] text-brand-muted">
              {displayName.length}/{MAX_NAME_LENGTH}
            </Text>
          </View>

          {/* Bio */}
          <View>
            <FloatingInput
              label="Bio"
              value={bio}
              onChangeText={setBio}
              maxLength={MAX_BIO_LENGTH}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            <Text className="ml-1 mt-1 text-[11px] text-brand-muted">
              {bio.length}/{MAX_BIO_LENGTH}
            </Text>
          </View>

          {/* Website */}
          <FloatingInput
            label="Website (optional)"
            value={website}
            onChangeText={setWebsite}
            keyboardType="default"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />

          <Button
            onPress={handleNext}
            isDisabled={!displayName.trim() || saving}
            className={`h-[50px] rounded-xl ${displayName.trim() ? 'bg-brand-blue active:opacity-80' : 'bg-brand-border'}`}
          >
            {saving ? <ButtonSpinner color="#fff" /> : <ButtonText className="text-[15px] font-semibold text-white">Next</ButtonText>}
          </Button>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
