// components/AnimatedTabBar.tsx
// Horizontally sliding underline tab indicator

import React, { useEffect, useState } from 'react';
import { Pressable, LayoutChangeEvent, View, Platform } from 'react-native';
import { useAnimatedStyle, isWeb, SafeAnimatedView } from '@/utils/animatedWebSafe';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';

// Only import Reanimated on native
let useSharedValue: any = null;
let withSpring: any = null;

if (!isWeb) {
  useSharedValue = require('react-native-reanimated').useSharedValue;
  withSpring = require('react-native-reanimated').withSpring;
}

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
  const [webTranslateX, setWebTranslateX] = useState(0);
  const [webWidth, setWebWidth] = useState(0);
  
  const translateX = !isWeb ? useSharedValue(0) : { value: 0 };
  const tabWidth = !isWeb ? useSharedValue(0) : { value: 0 };

  useEffect(() => {
    if (!isWeb && tabWidth.value !== undefined && tabWidth.value > 0) {
      translateX.value = withSpring(activeIndex * tabWidth.value, springConfig);
    } else if (isWeb) {
      setWebTranslateX(activeIndex * webWidth);
    } else {
      translateX.value = activeIndex * tabWidth.value;
    }
  }, [activeIndex, translateX, tabWidth, isWeb, webWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / tabs.length;
    if (!isWeb) {
      tabWidth.value = w;
      translateX.value = activeIndex * w;
    } else {
      setWebWidth(w);
      setWebTranslateX(activeIndex * w);
    }
  };

  const underlineStyle = !isWeb ? {
    transform: [{ translateX: translateX.value }],
    width: tabWidth.value,
  } : {
    transform: [{ translateX: webTranslateX }],
    width: webWidth,
    transition: 'transform 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  };

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
      {!isWeb ? (
        <SafeAnimatedView
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
        </SafeAnimatedView>
      ) : (
        <View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              height: 1.5,
              borderRadius: 1,
              left: activeIndex * (tabWidth.value || 0) + (tabWidth.value || 0) / 2 - 30,
              width: 60,
              backgroundColor: '#f3f5f7',
              transition: 'left 200ms ease-in-out',
            } as any,
          ]}
        />
      )}
    </View>
  );
}
