// components/AnimatedHeart.tsx
// Bouncy scale animation on the heart icon when liked

import React, { useEffect, useState } from "react";
import { Pressable } from "react-native";
import {
  SafeAnimatedView,
  isWeb,
  useSharedValue,
  withSpring,
  withSequence,
  useAnimatedStyle,
} from "@/utils/animatedWebSafe";
import { BOUNCY_SPRING_CONFIG } from "@/constants/ui";
import { HeartIcon, HeartFillIcon } from "@/constants/icons";

interface AnimatedHeartProps {
  isLiked: boolean;
  onPress: () => void;
  size?: number;
}

export function AnimatedHeart({
  isLiked,
  onPress,
  size = 19,
}: AnimatedHeartProps) {
  const [scaleWeb, setScaleWeb] = useState(1);
  const scale = useSharedValue(1);
  const liked = useSharedValue(isLiked ? 1 : 0);

  useEffect(() => {
    liked.value = isLiked ? 1 : 0;
  }, [isLiked, liked]);

  const handlePress = () => {
    if (!isWeb) {
      scale.value = withSequence(
        withSpring(0.7, { damping: 20, stiffness: 600 }),
        withSpring(1.3, BOUNCY_SPRING_CONFIG),
        withSpring(1, BOUNCY_SPRING_CONFIG),
      );
    } else {
      // Web: quick scale animation via state
      setScaleWeb(1.3);
      setTimeout(() => setScaleWeb(1), 200);
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isWeb ? scaleWeb : scale.value }],
  }));

  const heartColor = isLiked ? "#ff3040" : "#777777";

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      className="rounded-full p-2 active:bg-white/5"
    >
      <SafeAnimatedView
        style={[
          animatedStyle,
          isWeb && ({ transition: "transform 200ms ease-out" } as any),
        ]}
      >
        {isLiked ? (
          <HeartFillIcon size={size} color={heartColor} />
        ) : (
          <HeartIcon size={size} color={heartColor} />
        )}
      </SafeAnimatedView>
    </Pressable>
  );
}
