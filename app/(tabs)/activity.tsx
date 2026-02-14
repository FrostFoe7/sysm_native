// app/(tabs)/activity.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, Pressable, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useAnimatedStyle } from '@/utils/animatedWebSafe';
import { ScreenLayout } from '@/components/ScreenLayout';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonText } from '@/components/ui/button';
import {
  getActivity,
  toggleUserFollow,
  isUserFollowedByCurrentUser,
  formatRelativeTime,
} from '@/db/selectors';
import {
  Heart,
  MessageCircle,
  UserPlus,
  BadgeCheck,
} from 'lucide-react-native';
import type { ActivityItem } from '@/db/selectors';
import { ActivitySkeleton } from '@/components/skeletons';

type TabKey = 'all' | 'replies' | 'mentions' | 'follows';

export default function ActivityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
      if (isLoading) {
        const t = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(t);
      }
    }, [isLoading]),
  );

  const allActivity = useMemo(() => {
    void refreshKey;
    return getActivity();
  }, [refreshKey]);

  const filteredActivity = useMemo(() => {
    if (activeTab === 'all') return allActivity;
    if (activeTab === 'replies') return allActivity.filter((a) => a.type === 'reply');
    if (activeTab === 'follows') return allActivity.filter((a) => a.type === 'follow');
    if (activeTab === 'mentions') return [];
    return allActivity;
  }, [allActivity, activeTab]);

  const handleFollow = useCallback((userId: string) => {
    const result = toggleUserFollow(userId);
    setFollowMap((prev) => ({ ...prev, [userId]: result.following }));
  }, []);

  const getTypeMeta = (type: ActivityItem['type']) => {
    switch (type) {
      case 'like':
        return { icon: Heart, color: '#ff3040', fill: '#ff3040', label: 'liked your thread' };
      case 'reply':
        return { icon: MessageCircle, color: '#0095f6', fill: undefined, label: 'replied to your thread' };
      case 'follow':
        return { icon: UserPlus, color: '#bf5af2', fill: undefined, label: 'started following you' };
      default:
        return { icon: Heart, color: '#555555', fill: undefined, label: '' };
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'replies', label: 'Replies' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'follows', label: 'Follows' },
  ];

  const renderItem = useCallback(
    ({ item, index }: { item: ActivityItem; index: number }) => {
      const meta = getTypeMeta(item.type);
      const IconComponent = meta.icon;
      const isFollowed = followMap[item.actor.id] ?? isUserFollowedByCurrentUser(item.actor.id);

      return (
        <AnimatedListItem index={index}>
          <AnimatedPressable
            onPress={() => {
              if (item.type === 'follow') {
                router.push(`/profile/${item.actor.id}`);
              } else if (item.thread) {
                router.push(`/thread/${item.thread.id}`);
              }
            }}
            scaleValue={0.98}
          >
            <HStack className="px-4 py-3" space="md">
              <View className="relative">
                <Avatar size="sm">
                  <AvatarImage source={{ uri: item.actor.avatar_url }} />
                  <AvatarFallbackText>{item.actor.display_name}</AvatarFallbackText>
                </Avatar>
                <View
                  className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full items-center justify-center border-2 border-[#101010]"
                  style={{ backgroundColor: meta.color }}
                >
                  <IconComponent
                    size={10}
                    color="white"
                    fill={meta.fill || 'none'}
                    strokeWidth={2.5}
                  />
                </View>
              </View>
              <VStack className="flex-1 overflow-hidden">
                <HStack className="items-center" space="xs">
                  <Text className="text-[#f3f5f7] font-bold text-[14px]" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {item.actor.username}
                  </Text>
                  {item.actor.verified && (
                    <BadgeCheck size={14} color="#0095f6" fill="#0095f6" />
                  )}
                  <Text className="text-[#555555] text-[13px] flex-shrink-0">
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </HStack>
                <Text className="text-[#999] text-[14px]" numberOfLines={1}>{meta.label}</Text>
                {item.thread && item.thread.content ? (
                  <Text className="text-[#777] text-[13px] mt-0.5" numberOfLines={2}>
                    {item.thread.content}
                  </Text>
                ) : null}
              </VStack>
              {item.type === 'follow' && (
                <Button
                  size="sm"
                  variant={isFollowed ? 'outline' : 'solid'}
                  className={
                    isFollowed
                      ? 'rounded-lg border-[#333] bg-transparent min-w-[90px]'
                      : 'rounded-lg bg-[#f3f5f7] min-w-[90px]'
                  }
                  onPress={() => handleFollow(item.actor.id)}
                >
                  <ButtonText
                    className={`text-[13px] font-semibold ${
                      isFollowed ? 'text-[#555555]' : 'text-[#101010]'
                    }`}
                  >
                    {isFollowed ? 'Following' : 'Follow back'}
                  </ButtonText>
                </Button>
              )}
            </HStack>
            <Divider className="bg-[#1e1e1e] ml-[64px]" />
          </AnimatedPressable>
        </AnimatedListItem>
      );
    },
    [followMap, handleFollow, router],
  );

  return (
    <ScreenLayout>
      <Box className="px-4 pt-3 pb-1">
        <Heading size="2xl" className="text-[#f3f5f7]">
          Activity
        </Heading>
      </Box>

      {/* Animated pill tabs */}
      <HStack className="px-4 py-2 overflow-hidden" space="sm">
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`px-4 py-[6px] rounded-full border flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-[#f3f5f7] border-[#f3f5f7]'
                : 'bg-transparent border-[#333]'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                activeTab === tab.key ? 'text-[#101010]' : 'text-[#555555]'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </HStack>

      <FlatList
        data={filteredActivity}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          isLoading ? (
            <ActivitySkeleton />
          ) : (
            <View className="items-center justify-center py-16">
              <Text className="text-[#555555] text-[15px]">No activity yet</Text>
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}
