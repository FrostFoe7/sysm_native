// components/AnimatedPressable.tsx
// Scale-down press feedback (like iOS press-and-hold)

import React, { useCallback, useState } from "react";
import { type PressableProps, type ViewStyle } from "react-native";
import {
  useAnimatedStyle,
  SafeAnimatedPressable,
  isWeb,
  useSharedValue,
  withTiming,
  Easing,
} from "@/utils/animatedWebSafe";

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
  const scale = useSharedValue(1);

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
    [scaleValue, onPressIn, scale],
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
    [onPressOut, scale],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isWeb ? scaleWeb : scale.value }],
  }));

  return (
    <SafeAnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        style as ViewStyle,
        isWeb && ({ transition: "transform 150ms ease-out" } as any),
      ]}
      {...rest}
    >
      {children}
    </SafeAnimatedPressable>
  );
}
