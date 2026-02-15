// app/(onboarding)/username.tsx
// Step 1: Choose a unique username

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { FloatingInput } from '@/components/FloatingInput';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/services/supabase';
import { MAX_USERNAME_LENGTH } from '@/constants/app';
import { Check, X } from 'lucide-react-native';

export default function UsernameStep() {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const updateOnboardingStep = useAuthStore((s) => s.updateOnboardingStep);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate username format
  const validateFormat = (value: string): string | null => {
    if (value.length < 3) return 'At least 3 characters';
    if (value.length > MAX_USERNAME_LENGTH) return `Max ${MAX_USERNAME_LENGTH} characters`;
    if (!/^[a-zA-Z0-9._]+$/.test(value)) return 'Only letters, numbers, . and _';
    if (/^[._]|[._]$/.test(value)) return 'Cannot start or end with . or _';
    if (/[.]{2}|[_]{2}|[._][._]/.test(value)) return 'No consecutive . or _';
    return null;
  };

  // Live availability check with debounce
  const handleUsernameChange = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setUsername(cleaned);
    setAvailable(null);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const formatError = validateFormat(cleaned);
    if (formatError) {
      setError(formatError);
      return;
    }

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('check_username_available', {
          p_username: cleaned,
        });

        if (rpcError) {
          setError('Could not check availability');
          setChecking(false);
          return;
        }

        setAvailable(data as boolean);
        if (!data) setError('Username is taken');
      } catch {
        setError('Could not check availability');
      }
      setChecking(false);
    }, 400);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleNext = useCallback(async () => {
    if (!available || !userId) return;
    setSaving(true);

    const { error: updateError } = await supabase
      .from('users')
      .update({ username, onboarding_step: 1 })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await updateOnboardingStep(1);
    await refreshProfile();
    router.push('/(onboarding)/avatar');
    setSaving(false);
  }, [available, userId, username, updateOnboardingStep, refreshProfile]);

  const rightIcon = checking ? null : available === true ? (
    <Check size={18} color="#22c55e" />
  ) : available === false ? (
    <X size={18} color="#ef4444" />
  ) : null;

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
            <Heading size="xl" className="text-brand-light">Pick a username</Heading>
            <Text className="text-[14px] text-brand-muted leading-[20px]">
              This is how people will find and mention you on sysm.
            </Text>
          </VStack>

          <FloatingInput
            label="Username"
            value={username}
            onChangeText={handleUsernameChange}
            error={error}
            maxLength={MAX_USERNAME_LENGTH}
            autoCapitalize="none"
            autoComplete="username"
            returnKeyType="done"
            onSubmitEditing={handleNext}
            rightElement={rightIcon}
          />

          {username.length > 0 && !error && (
            <Text className="text-[13px] text-brand-muted">
              sysm.com/<Text className="text-brand-light font-medium">{username}</Text>
            </Text>
          )}

          <Button
            onPress={handleNext}
            isDisabled={!available || saving}
            className={`h-[50px] rounded-xl ${available ? 'bg-brand-blue active:opacity-80' : 'bg-brand-border'}`}
          >
            {saving ? <ButtonSpinner color="#fff" /> : <ButtonText className="text-[15px] font-semibold text-white">Next</ButtonText>}
          </Button>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
