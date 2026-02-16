// app/(auth)/forgot-password.tsx
// Request a password reset email

import React, { useState, useCallback } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { AuthCard } from "@/components/AuthCard";
import { FloatingInput } from "@/components/FloatingInput";
import { useAuthStore } from "@/store/useAuthStore";
import { MailIcon, ArrowLeftIcon } from "@/constants/icons";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset);

  const handleSend = useCallback(async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await sendPasswordReset(email.trim());

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }, [email, sendPasswordReset]);

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`Password reset link sent to ${email}`}
        footer={
          <View className="items-center gap-3">
            <Pressable onPress={() => setSent(false)}>
              <Text className="text-[14px] font-semibold text-brand-blue">
                Use a different email
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text className="text-[14px] text-brand-muted">
                Back to sign in
              </Text>
            </Pressable>
          </View>
        }
      >
        <View className="items-center py-6">
          <View className="mb-4 size-16 items-center justify-center rounded-full bg-brand-blue/10">
            <MailIcon size={28} color="#0095f6" />
          </View>
          <Text className="max-w-[280px] text-center text-[14px] leading-[20px] text-brand-muted">
            Click the link in your email to reset your password. The link
            expires in 1 hour.
          </Text>
        </View>

        <Button
          variant="outline"
          onPress={handleSend}
          className="h-[50px] rounded-xl border-brand-border"
        >
          <ButtonText className="text-[15px] font-medium text-brand-light">
            Resend link
          </ButtonText>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <View className="items-center">
          <Pressable onPress={() => router.push("/(auth)/login")}>
            <HStack className="items-center" space="xs">
              <ArrowLeftIcon size={14} color="#666666" />
              <Text className="text-[14px] text-brand-muted">
                Back to sign in
              </Text>
            </HStack>
          </Pressable>
        </View>
      }
    >
      {error ? (
        <View className="rounded-xl bg-red-500/10 px-4 py-3">
          <Text className="text-center text-[13px] text-brand-red">
            {error}
          </Text>
        </View>
      ) : null}

      <FloatingInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={undefined}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="go"
        onSubmitEditing={handleSend}
      />

      <Button
        onPress={handleSend}
        isDisabled={loading}
        className="h-[50px] rounded-xl bg-brand-blue active:opacity-80"
      >
        {loading ? (
          <ButtonSpinner color="#fff" />
        ) : (
          <ButtonText className="text-[15px] font-semibold text-white">
            Send reset link
          </ButtonText>
        )}
      </Button>
    </AuthCard>
  );
}
