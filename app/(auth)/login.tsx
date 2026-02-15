// app/(auth)/login.tsx
// Sign in with email + password, or OAuth / magic link

import React, { useState, useRef, useCallback } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Divider } from '@/components/ui/divider';
import { AuthCard } from '@/components/AuthCard';
import { FloatingInput } from '@/components/FloatingInput';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);

  const passwordRef = useRef<TextInput>(null);

  const validate = useCallback(() => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    const { error } = await signInWithEmail(email.trim(), password);

    if (error) {
      setErrors({ general: error.message });
      setLoading(false);
      return;
    }
    // Auth state change will handle navigation
    setLoading(false);
  }, [email, password, validate, signInWithEmail]);

  const handleOAuth = useCallback(async (provider: 'google' | 'apple') => {
    const { error } = await signInWithOAuth(provider);
    if (error) setErrors({ general: error.message });
  }, [signInWithOAuth]);

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to sysm"
      footer={
        <View className="items-center gap-3">
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <HStack className="items-center" space="xs">
              <Text className="text-[14px] text-brand-muted">Don't have an account?</Text>
              <Text className="text-[14px] font-semibold text-brand-blue">Sign up</Text>
            </HStack>
          </Pressable>
        </View>
      }
    >
      {/* Error banner */}
      {errors.general && (
        <View className="rounded-xl bg-red-500/10 px-4 py-3">
          <Text className="text-[13px] text-brand-red text-center">{errors.general}</Text>
        </View>
      )}

      {/* Email */}
      <FloatingInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      {/* Password */}
      <View>
        <FloatingInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />
        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          className="mt-2 self-end"
        >
          <Text className="text-[13px] text-brand-blue">Forgot password?</Text>
        </Pressable>
      </View>

      {/* Sign in button */}
      <Button
        onPress={handleLogin}
        isDisabled={loading}
        className="h-[50px] rounded-xl bg-brand-blue active:opacity-80"
      >
        {loading ? <ButtonSpinner color="#fff" /> : <ButtonText className="text-[15px] font-semibold text-white">Sign in</ButtonText>}
      </Button>

      {/* Divider */}
      <HStack className="items-center" space="md">
        <Divider className="flex-1 bg-brand-border" />
        <Text className="text-[12px] text-brand-muted uppercase tracking-wider">or</Text>
        <Divider className="flex-1 bg-brand-border" />
      </HStack>

      {/* Magic link */}
      <Button
        variant="outline"
        onPress={() => router.push('/(auth)/magic-link')}
        className="h-[50px] rounded-xl border-brand-border"
      >
        <ButtonText className="text-[15px] font-medium text-brand-light">Sign in with magic link</ButtonText>
      </Button>

      {/* OAuth */}
      <Button
        variant="outline"
        onPress={() => handleOAuth('google')}
        className="h-[50px] rounded-xl border-brand-border"
      >
        <ButtonText className="text-[15px] font-medium text-brand-light">Continue with Google</ButtonText>
      </Button>

      <Button
        variant="outline"
        onPress={() => handleOAuth('apple')}
        className="h-[50px] rounded-xl border-brand-border"
      >
        <ButtonText className="text-[15px] font-medium text-brand-light">Continue with Apple</ButtonText>
      </Button>
    </AuthCard>
  );
}
