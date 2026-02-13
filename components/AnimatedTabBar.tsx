// components/AnimatedTabBar.tsx
// Horizontally sliding underline tab indicator

import React, { useEffect } from 'react';
import { Pressable, LayoutChangeEvent, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';

interface Tab {
  key: string;
  label: string;
}

interface AnimatedTabBarProps {
  tabs: Tab[];
  activeKey: string;
  onTabPress: (key: string) => void;
}

const springConfig = { damping: 20, stiffness: 200 };

export function AnimatedTabBar({ tabs, activeKey, onTabPress }: AnimatedTabBarProps) {
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);
  const translateX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  useEffect(() => {
    if (tabWidth.value > 0) {
      translateX.value = withSpring(activeIndex * tabWidth.value, springConfig);
    }
  }, [activeIndex, translateX, tabWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / tabs.length;
    tabWidth.value = w;
    translateX.value = activeIndex * w;
  };

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: tabWidth.value,
  }));

  return (
    <View className="border-b border-[#1e1e1e]" onLayout={handleLayout}>
      <HStack>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            className="flex-1 items-center py-3"
          >
            <Text
              className={`text-[15px] font-semibold ${
                activeKey === tab.key ? 'text-[#f3f5f7]' : 'text-[#555555]'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </HStack>
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            height: 1.5,
            borderRadius: 1,
          },
          underlineStyle,
        ]}
      >
        <View className="mx-auto w-[60px] h-full bg-[#f3f5f7] rounded-full" />
      </Animated.View>
    </View>
  );
}
