// app/(onboarding)/avatar.tsx
// Step 2: Set profile picture

import React, { useState, useCallback } from "react";
import { View, ScrollView, Image, Pressable } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { VStack } from "@/components/ui/vstack";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/services/supabase";
import { CameraIcon, VerifiedIcon } from "@/constants/icons";

export default function AvatarStep() {
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const userId = useAuthStore((s) => s.userId);
  const updateOnboardingStep = useAuthStore((s) => s.updateOnboardingStep);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }, []);

  const handleNext = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    setError("");

    try {
      let avatarUrl = "";

      if (image) {
        // Upload to storage if user picked one
        const fileExt = image.split(".").pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const response = await fetch(image);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl, onboarding_step: 2 })
        .eq("id", userId);

      if (updateError) throw updateError;

      await updateOnboardingStep(2);
      await refreshProfile();
      router.push("/(onboarding)/bio");
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setSaving(false);
    }
  }, [image, userId, updateOnboardingStep, refreshProfile]);

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack className="w-full" space="lg">
        <VStack space="xs">
          <Heading size="xl" className="text-brand-light">
            Add a photo
          </Heading>
          <Text className="text-[14px] leading-[20px] text-brand-muted">
            A photo helps people recognize you and makes your profile stand out.
          </Text>
        </VStack>

        {error && (
          <View className="rounded-xl bg-red-500/10 px-4 py-3">
            <Text className="text-center text-[13px] text-brand-red">
              {error}
            </Text>
          </View>
        )}

        <View className="items-center py-4">
          <Pressable
            onPress={pickImage}
            className="relative size-32 items-center justify-center rounded-full bg-brand-border"
          >
            {image ? (
              <Image
                source={{ uri: image }}
                className="size-full rounded-full"
              />
            ) : (
              <CameraIcon size={40} color="#777777" />
            )}
            <View className="absolute bottom-0 right-0 rounded-full border-4 border-brand-dark bg-brand-blue p-2">
              <VerifiedIcon size={16} color="white" />
            </View>
          </Pressable>
          <Pressable onPress={pickImage} className="mt-4">
            <Text className="text-[15px] font-semibold text-brand-blue">
              {image ? "Change photo" : "Choose from library"}
            </Text>
          </Pressable>
        </View>

        <Button
          onPress={handleNext}
          isDisabled={saving}
          className="h-[50px] rounded-xl bg-brand-blue active:opacity-80"
        >
          {saving ? (
            <ButtonSpinner color="#fff" />
          ) : (
            <ButtonText className="text-[15px] font-semibold text-white">
              {image ? "Next" : "Skip"}
            </ButtonText>
          )}
        </Button>
      </VStack>
    </ScrollView>
  );
}
