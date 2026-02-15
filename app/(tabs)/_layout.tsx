// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { Home, Search, Heart, User, Film, Send } from 'lucide-react-native';
import { HapticTab } from '@/components/haptic-tab';
import { DesktopSidebar } from '@/components/DesktopSidebar';

function TabsNavigator({ hideTabBar }: { hideTabBar: boolean }) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: 'brand-light',
        tabBarInactiveTintColor: 'brand-muted',
        tabBarShowLabel: false,
        tabBarStyle: hideTabBar
          ? { display: 'none' }
          : {
              backgroundColor: 'brand-dark',
              borderTopColor: 'brand-border',
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
        name="reels"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Film
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
        name="inbox"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Send
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
  return (
    <>
      {/* Desktop Layout (lg: breakpoint) */}
      <View className="hidden flex-1 flex-row bg-brand-dark lg:flex">
        <DesktopSidebar />
        <View className="flex-1">
          <TabsNavigator hideTabBar={true} />
        </View>
      </View>

      {/* Mobile/Tablet Layout (up to lg breakpoint) */}
      <View className="flex-1 lg:hidden">
        <TabsNavigator hideTabBar={false} />
      </View>
    </>
  );
}
