// app/modal.tsx

import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import { SafeAnimatedView, FadeInDown, isWeb } from "@/utils/animatedWebSafe";
import { Composer } from "@/components/Composer";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { ThreadService } from "@/services/thread.service";
import type { MediaItem } from "@/types/types";

export default function ComposerModal() {
  const router = useRouter();

  const handleSubmit = useCallback(
    async (content: string, media?: MediaItem[]) => {
      try {
        await ThreadService.createThread(content, undefined, media);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.navigate("/(tabs)");
        }
      } catch (err) {
        console.error("Failed to create thread:", err);
      }
    },
    [router],
  );

  return (
    <View className="flex-1 bg-brand-elevated">
      <SafeAnimatedView
        entering={FadeInDown?.duration(300)
          .springify()
          .damping(20)
          .stiffness(200)}
        className="flex-1"
      >
        <Box
          className={`flex-1 ${
            isWeb ? "w-full max-w-[680px] self-center" : ""
          }`}
        >
          <Composer
            onSubmit={handleSubmit}
            placeholder="What's new?"
            autoFocus
          />
        </Box>
      </SafeAnimatedView>
    </View>
  );
}
