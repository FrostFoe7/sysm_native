// app/(auth)/reset-password.tsx
// Set a new password (after clicking reset link from email)

import React, { useState, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { AuthCard } from '@/components/AuthCard';
import { FloatingInput } from '@/components/FloatingInput';
import { PasswordStrength } from '@/components/PasswordStrength';
import { useAuthStore } from '@/store/useAuthStore';
import { CheckCircle } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updatePassword = useAuthStore((s) => s.updatePassword);

  const validate = useCallback(() => {
    const e: typeof errors = {};
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (password !== confirmPassword) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [password, confirmPassword]);

  const handleReset = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    const { error } = await updatePassword(password);

    if (error) {
      setErrors({ general: error.message });
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }, [password, validate, updatePassword]);

  if (success) {
    return (
      <AuthCard
        title="Password updated"
        subtitle="Your password has been successfully changed"
      >
        <View className="items-center py-6">
          <View className="w-16 h-16 rounded-full bg-green-500/10 items-center justify-center mb-4">
            <CheckCircle size={28} color="#22c55e" />
          </View>
          <Text className="text-[14px] text-brand-muted text-center leading-[20px]">
            You can now sign in with your new password.
          </Text>
        </View>

        <Button
          onPress={() => router.replace('/(auth)/login')}
          className="h-[50px] rounded-xl bg-brand-blue active:opacity-80"
        >
          <ButtonText className="text-[15px] font-semibold text-white">Back to sign in</ButtonText>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="New password"
      subtitle="Enter your new password"
      footer={
        <View className="items-center">
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text className="text-[14px] text-brand-muted">Back to sign in</Text>
          </Pressable>
        </View>
      }
    >
      {errors.general && (
        <View className="rounded-xl bg-red-500/10 px-4 py-3">
          <Text className="text-[13px] text-brand-red text-center">{errors.general}</Text>
        </View>
      )}

      <View>
        <FloatingInput
          label="New password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="next"
        />
        <PasswordStrength password={password} />
      </View>

      <FloatingInput
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirm}
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={handleReset}
      />

      <Button
        onPress={handleReset}
        isDisabled={loading}
        className="h-[50px] rounded-xl bg-brand-blue active:opacity-80"
      >
        {loading ? <ButtonSpinner color="#fff" /> : <ButtonText className="text-[15px] font-semibold text-white">Update password</ButtonText>}
      </Button>
    </AuthCard>
  );
}
