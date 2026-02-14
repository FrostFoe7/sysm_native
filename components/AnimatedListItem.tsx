// components/AnimatedListItem.tsx
// Fade-in + slide-up entrance animation for list items

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { 
  useAnimatedStyle, 
  SafeAnimatedView, 
  isWeb,
  useSharedValue,
  withTiming,
  withDelay,
  Easing
} from '@/utils/animatedWebSafe';

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
  /** Max delay cap to avoid long waits for items far down the list */
  maxDelay?: number;
}

export function AnimatedListItem({
  index,
  children,
  maxDelay = 400,
}: AnimatedListItemProps) {
  const [isVisible, setIsVisible] = useState(isWeb);
  const opacity = useSharedValue(isWeb ? 1 : 0);
  const translateY = useSharedValue(isWeb ? 0 : 16);

  useEffect(() => {
    if (!isWeb) {
      const delay = Math.min(index * 60, maxDelay);
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
      );
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      setIsVisible(true);
    }
  }, [index, maxDelay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // On web, skip animations and render immediately
  if (isWeb) {
    return <View>{children}</View>;
  }

  return <SafeAnimatedView style={animatedStyle}>{children}</SafeAnimatedView>;
}
