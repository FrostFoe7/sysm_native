// app/modal.tsx

import React, { useCallback } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Composer } from '@/components/Composer';
import { Box } from '@/components/ui/box';
import { createNewThread } from '@/db/selectors';
import type { MediaItem } from '@/db/db';

const isWeb = Platform.OS !== 'ios' && Platform.OS !== 'android' && Platform.OS !== 'macos' && Platform.OS !== 'windows';

export default function ComposerModal() {
  const router = useRouter();

  const handleSubmit = useCallback(
    (content: string, media?: MediaItem[]) => {
      createNewThread(content, undefined, media);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate('/(tabs)');
      }
    },
    [router],
  );

  return (
    <View className="flex-1 bg-[#181818]">
      {!isWeb ? (
        <Animated.View
          entering={FadeInDown.duration(300).springify().damping(20).stiffness(200)}
          className="flex-1"
        >
          <Box
            className={`flex-1 ${
              isWeb ? 'max-w-[680px] self-center w-full' : ''
            }`}
          >
            <Composer
              onSubmit={handleSubmit}
              placeholder="What's new?"
              autoFocus
            />
          </Box>
        </Animated.View>
      ) : (
        <View className="flex-1">
          <Box
            className={`flex-1 ${
              isWeb ? 'max-w-[680px] self-center w-full' : ''
            }`}
          >
            <Composer
              onSubmit={handleSubmit}
              placeholder="What's new?"
              autoFocus
            />
          </Box>
        </View>
      )}
    </View>
  );
}
