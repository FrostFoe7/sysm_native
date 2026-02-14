// components/AnimatedHeart.tsx
// Bouncy scale animation on the heart icon when liked

import React, { useEffect, useState } from 'react';
import { Pressable, Platform } from 'react-native';
import { Heart } from 'lucide-react-native';
import { SafeAnimatedView, isWeb } from '@/utils/animatedWebSafe';

// Only import Reanimated on native
let useSharedValue: any = null;
let withSpring: any = null;
let withSequence: any = null;

if (!isWeb) {
  useSharedValue = require('react-native-reanimated').useSharedValue;
  withSpring = require('react-native-reanimated').withSpring;
  withSequence = require('react-native-reanimated').withSequence;
}

interface AnimatedHeartProps {
  isLiked: boolean;
  onPress: () => void;
  size?: number;
}

const springConfig = { damping: 6, stiffness: 400, mass: 0.4 };

export function AnimatedHeart({ isLiked, onPress, size = 19 }: AnimatedHeartProps) {
  const [scaleWeb, setScaleWeb] = useState(1);
  const scale = !isWeb ? useSharedValue(1) : { value: 1 };
  const liked = !isWeb ? useSharedValue(isLiked ? 1 : 0) : { value: isLiked ? 1 : 0 };

  useEffect(() => {
    if (!isWeb) {
      liked.value = isLiked ? 1 : 0;
    }
  }, [isLiked, liked, isWeb]);

  const handlePress = () => {
    if (!isWeb) {
      // Bounce animation on native only
      scale.value = withSequence(
        withSpring(0.7, { damping: 20, stiffness: 600 }),
        withSpring(1.3, springConfig),
        withSpring(1, springConfig),
      );
    } else {
      // Web: quick scale animation via state
      setScaleWeb(1.3);
      setTimeout(() => setScaleWeb(1), 200);
    }
    onPress();
  };

  const heartColor = isLiked ? '#ff3040' : '#777777';
  const heartFill = isLiked ? '#ff3040' : 'transparent';

  const heartIcon = (
    <Heart
      size={size}
      color={heartColor}
      fill={heartFill}
      strokeWidth={isLiked ? 0 : 1.8}
    />
  );

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      className="p-2 rounded-full active:bg-white/5"
    >
      {!isWeb ? (
        <SafeAnimatedView style={{ transform: [{ scale: scale.value }] }}>
          {heartIcon}
        </SafeAnimatedView>
      ) : (
        <div style={{ transform: `scale(${scaleWeb})`, transition: 'transform 200ms ease-out' }}>
          {heartIcon}
        </div>
      )}
    </Pressable>
  );
}
