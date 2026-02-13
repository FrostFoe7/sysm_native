// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { Home, Search, SquarePen, Heart, User } from 'lucide-react-native';
import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#f3f5f7',
        tabBarInactiveTintColor: '#555555',
        tabBarShowLabel: false,
        tabBarStyle: {
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
        name="new"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <SquarePen
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
