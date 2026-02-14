// components/AnimatedPressable.tsx
// Scale-down press feedback (like iOS press-and-hold)

import React, { useCallback, useState } from 'react';
import { Pressable, type PressableProps, type ViewStyle, Platform } from 'react-native';
import { useAnimatedStyle, SafeAnimatedView, isWeb } from '@/utils/animatedWebSafe';

// Only import Reanimated on native
let Animated: any = null;
let useSharedValue: any = null;
let withTiming: any = null;
let Easing: any = null;

if (!isWeb) {
  Animated = require('react-native-reanimated').default;
  useSharedValue = require('react-native-reanimated').useSharedValue;
  withTiming = require('react-native-reanimated').withTiming;
  Easing = require('react-native-reanimated').Easing;
}

const AnimatedPressableBase = !isWeb ? Animated.createAnimatedComponent(Pressable) : Pressable;

interface AnimatedPressableComponentProps extends PressableProps {
  scaleValue?: number;
  children: React.ReactNode;
}

export function AnimatedPressable({
  scaleValue = 0.985,
  children,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: AnimatedPressableComponentProps) {
  const [scaleWeb, setScaleWeb] = useState(1);
  const scale = !isWeb ? useSharedValue(1) : { value: 1 };

  const handlePressIn = useCallback(
    (e: any) => {
      if (!isWeb) {
        scale.value = withTiming(scaleValue, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        setScaleWeb(scaleValue);
      }
      onPressIn?.(e);
    },
    [scale, scaleValue, onPressIn, isWeb],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      if (!isWeb) {
        scale.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        setScaleWeb(1);
      }
      onPressOut?.(e);
    },
    [scale, onPressOut, isWeb],
  );

  const animatedStyle = !isWeb ? {
    transform: [{ scale: scale.value }],
  } : {
    transform: [{ scale: scaleWeb }],
  };

  // On web, use plain Pressable without animations
  if (isWeb) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[{ transform: [{ scale: scaleWeb }] }, style as ViewStyle]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style as ViewStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
