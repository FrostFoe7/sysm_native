// components/AnimatedTabBar.tsx
// Horizontally sliding underline tab indicator

import React, { useEffect, useState } from 'react';
import { Pressable, LayoutChangeEvent, View } from 'react-native';
import { 
  useAnimatedStyle, 
  isWeb, 
  SafeAnimatedView,
  useSharedValue,
  withSpring
} from '@/utils/animatedWebSafe';
import { SPRING_CONFIG } from '@/constants/ui';
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

export function AnimatedTabBar({ tabs, activeKey, onTabPress }: AnimatedTabBarProps) {
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);
  const [webTranslateX, setWebTranslateX] = useState(0);
  const [webWidth, setWebWidth] = useState(0);
  
  const translateX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  useEffect(() => {
    if (!isWeb && tabWidth.value > 0) {
      translateX.value = withSpring(activeIndex * tabWidth.value, SPRING_CONFIG);
    } else if (isWeb && webWidth > 0) {
      setWebTranslateX(activeIndex * webWidth);
    }
  }, [activeIndex, webWidth, tabWidth.value, translateX]);

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

  const animatedUnderlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: isWeb ? webTranslateX : translateX.value }],
    width: isWeb ? webWidth : tabWidth.value,
  }));

  return (
    <View className="border-b border-[#1e1e1e] z-10 bg-[#101010]" style={{ position: 'relative' }} onLayout={handleLayout}>
      <HStack style={{ paddingBottom: 2 }}>
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
      <SafeAnimatedView
        style={[
          {
            position: 'absolute',
            bottom: 0,
            height: 1.5,
            borderRadius: 1,
            backgroundColor: '#f3f5f7',
          },
          animatedUnderlineStyle,
          isWeb && ({ transition: 'transform 300ms cubic-bezier(0.4, 0.0, 0.2, 1), width 300ms ease' } as any)
        ]}
      >
        <View className="mx-auto h-full w-[60px] rounded-full bg-[#f3f5f7]" />
      </SafeAnimatedView>
    </View>
  );
}
