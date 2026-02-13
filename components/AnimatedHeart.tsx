// components/AnimatedHeart.tsx
// Bouncy scale animation on the heart icon when liked

import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';

interface AnimatedHeartProps {
  isLiked: boolean;
  onPress: () => void;
  size?: number;
}

const springConfig = { damping: 6, stiffness: 400, mass: 0.4 };

export function AnimatedHeart({ isLiked, onPress, size = 19 }: AnimatedHeartProps) {
  const scale = useSharedValue(1);
  const liked = useSharedValue(isLiked ? 1 : 0);

  useEffect(() => {
    liked.value = isLiked ? 1 : 0;
  }, [isLiked, liked]);

  const handlePress = () => {
    // Bounce animation
    scale.value = withSequence(
      withSpring(0.7, { damping: 20, stiffness: 600 }),
      withSpring(1.3, springConfig),
      withSpring(1, springConfig),
    );
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      className="p-2 rounded-full active:bg-white/5"
    >
      <Animated.View style={animatedStyle}>
        <Heart
          size={size}
          color={isLiked ? '#ff3040' : '#777777'}
          fill={isLiked ? '#ff3040' : 'transparent'}
          strokeWidth={isLiked ? 0 : 1.8}
        />
      </Animated.View>
    </Pressable>
  );
}
