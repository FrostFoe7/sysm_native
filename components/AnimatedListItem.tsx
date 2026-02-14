// components/AnimatedListItem.tsx
// Fade-in + slide-up entrance animation for list items

import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useAnimatedStyle, SafeAnimatedView, isWeb } from '@/utils/animatedWebSafe';

// Only import Reanimated on native
let useSharedValue: any = null;
let withTiming: any = null;
let withDelay: any = null;
let Easing: any = null;

if (!isWeb) {
  useSharedValue = require('react-native-reanimated').useSharedValue;
  withTiming = require('react-native-reanimated').withTiming;
  withDelay = require('react-native-reanimated').withDelay;
  Easing = require('react-native-reanimated').Easing;
}

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
  const [isVisible, setIsVisible] = useState(isWeb); // Web items visible immediately
  const opacity = !isWeb ? useSharedValue(1) : { value: 1 };
  const translateY = !isWeb ? useSharedValue(0) : { value: 0 };

  useEffect(() => {
    if (!isWeb) {
      opacity.value = 0;
      translateY.value = 16;
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
  }, [index, maxDelay, opacity, translateY, isWeb]);

  const animatedStyle = !isWeb ? {
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  } : {
    opacity: 1,
    transform: [{ translateY: 0 }],
  };

  // On web, skip animations and render immediately
  if (isWeb) {
    return <View>{children}</View>;
  }

  return <SafeAnimatedView style={animatedStyle}>{children}</SafeAnimatedView>;
}
