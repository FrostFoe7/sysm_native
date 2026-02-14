// app/modal.tsx

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  SafeAnimatedView, 
  FadeInDown, 
  isWeb 
} from '@/utils/animatedWebSafe';
import { Composer } from '@/components/Composer';
import { Box } from '@/components/ui/box';
import { createNewThread } from '@/db/selectors';
import type { MediaItem } from '@/db/db';

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
      <SafeAnimatedView
        entering={FadeInDown?.duration(300).springify().damping(20).stiffness(200)}
        className="flex-1"
      >
        <Box
          className={`flex-1 ${
            isWeb ? 'w-full max-w-[680px] self-center' : ''
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
