// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { HapticTab } from '@/components/haptic-tab';
import { DesktopSidebar } from '@/components/DesktopSidebar';

const DESKTOP_BREAKPOINT = 1024;

function TabsNavigator({ hideTabBar }: { hideTabBar: boolean }) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#f3f5f7',
        tabBarInactiveTintColor: '#555555',
        tabBarShowLabel: false,
        tabBarStyle: hideTabBar
          ? { display: 'none' }
          : {
              backgroundColor: '#101010',
              borderTopColor: '#1e1e1e',
              borderTopWidth: 0.5,
              height: Platform.OS === 'web' ? 60 : 84,
              paddingTop: 8,
              elevation: 0,
            },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Home
                size={26}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
                fill={focused ? color : 'transparent'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Search
                size={26}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Heart
                size={26}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
                fill={focused ? color : 'transparent'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <User
                size={26}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
                fill={focused ? color : 'transparent'}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  if (isDesktop) {
    return (
      <View className="flex-1 flex-row bg-[#101010]">
        <DesktopSidebar />
        <View className="flex-1">
          <TabsNavigator hideTabBar />
        </View>
      </View>
    );
  }

  return <TabsNavigator hideTabBar={false} />;
}
