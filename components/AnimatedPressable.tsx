// components/AnimatedPressable.tsx
// Scale-down press feedback (like iOS press-and-hold)

import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withTiming(scaleValue, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
      onPressIn?.(e);
    },
    [scale, scaleValue, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
