// components/DesktopSidebar.tsx

import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { getCurrentUser } from '@/db/selectors';
import {
  Home,
  Search,
  SquarePen,
  Heart,
  User,
  Film,
  AlignJustify,
} from 'lucide-react-native';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  matchPaths: string[];
  fillWhenActive?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: Home,
    label: 'Home',
    path: '/(tabs)',
    matchPaths: ['/', '/(tabs)', '/(tabs)/index'],
    fillWhenActive: true,
  },
  {
    icon: Search,
    label: 'Search',
    path: '/(tabs)/explore',
    matchPaths: ['/(tabs)/explore', '/explore'],
  },
  {
    icon: SquarePen,
    label: 'New Thread',
    path: '/modal',
    matchPaths: ['/modal', '/(tabs)/new'],
  },
  {
    icon: Film,
    label: 'Reels',
    path: '/(tabs)/reels',
    matchPaths: ['/(tabs)/reels', '/reels'],
    fillWhenActive: true,
  },
  {
    icon: Heart,
    label: 'Activity',
    path: '/(tabs)/activity',
    matchPaths: ['/(tabs)/activity', '/activity'],
    fillWhenActive: true,
  },
  {
    icon: User,
    label: 'Profile',
    path: '/(tabs)/profile',
    matchPaths: ['/(tabs)/profile', '/profile'],
    fillWhenActive: true,
  },
];

function SidebarNavItem({
  item,
  isActive,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;
  const color = isActive ? '#f3f5f7' : '#777777';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl px-4 py-3 active:bg-white/5"
      style={{ gap: 16 }}
    >
      <View className="w-7 items-center">
        <Icon
          size={26}
          color={color}
          strokeWidth={isActive ? 2.5 : 1.8}
          fill={isActive && item.fillWhenActive ? color : 'transparent'}
        />
      </View>
      <Text
        className={`text-[16px] ${
          isActive ? 'font-semibold text-[#f3f5f7]' : 'text-[#777777]'
        }`}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = getCurrentUser();

  const isActive = useCallback(
    (item: NavItem) => {
      return item.matchPaths.some(
        (p) => pathname === p || pathname.startsWith(p + '/'),
      );
    },
    [pathname],
  );

  const handleNav = useCallback(
    (item: NavItem) => {
      if (item.path === '/modal') {
        router.push('/modal');
      } else {
        router.replace(item.path as any);
      }
    },
    [router],
  );

  return (
    <View className="h-full w-[240px] flex-col justify-between border-r border-[#1e1e1e] bg-[#101010] pb-6 pt-4">
      <VStack className="flex-1">
        {/* Logo / Brand */}
        <Pressable
          className="mb-2 px-5 py-4"
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Text className="text-[22px] font-bold tracking-tight text-[#f3f5f7]">
            Threads
          </Text>
        </Pressable>

        {/* Nav items */}
        <VStack className="px-2" space="xs">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.label}
              item={item}
              isActive={isActive(item)}
              onPress={() => handleNav(item)}
            />
          ))}
        </VStack>
      </VStack>

      {/* Bottom: user row + menu */}
      <VStack className="px-2">
        <Divider className="mb-3 bg-[#1e1e1e]" />
        <Pressable
          className="flex-row items-center rounded-xl px-4 py-3 active:bg-white/5"
          style={{ gap: 12 }}
          onPress={() => router.replace('/(tabs)/profile' as any)}
        >
          <Avatar size="sm">
            <AvatarImage source={{ uri: currentUser.avatar_url }} />
          </Avatar>
          <VStack className="flex-1">
            <Text className="text-[14px] font-semibold text-[#f3f5f7]" numberOfLines={1}>
              {currentUser.display_name}
            </Text>
            <Text className="text-[12px] text-[#555555]" numberOfLines={1}>
              @{currentUser.username}
            </Text>
          </VStack>
          <AlignJustify size={18} color="#555555" strokeWidth={1.8} />
        </Pressable>
      </VStack>
    </View>
  );
}
