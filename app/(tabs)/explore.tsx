// app/(tabs)/explore.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, TextInput, Pressable, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThreadCard } from '@/components/ThreadCard';
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
  getExploreUsers,
  getTrendingThreads,
  searchAll,
  toggleThreadLike,
  toggleUserFollow,
  isThreadLikedByCurrentUser,
  isUserFollowedByCurrentUser,
  formatCount,
} from '@/db/selectors';
import { Search, X, BadgeCheck } from 'lucide-react-native';
import type { User, ThreadWithAuthor } from '@/db/db';

type ExploreItem =
  | { type: 'section-header'; title: string }
  | { type: 'user'; user: User; isFollowed: boolean }
  | { type: 'thread'; thread: ThreadWithAuthor; isLiked: boolean };

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, []),
  );

  const exploreData = useMemo(() => {
    void refreshKey;
    if (query.trim()) {
      const results = searchAll(query.trim());
      const items: ExploreItem[] = [];
      if (results.users.length > 0) {
        items.push({ type: 'section-header', title: 'People' });
        for (const u of results.users) {
          items.push({
            type: 'user',
            user: u,
            isFollowed: followMap[u.id] ?? isUserFollowedByCurrentUser(u.id),
          });
        }
      }
      if (results.threads.length > 0) {
        items.push({ type: 'section-header', title: 'Threads' });
        for (const t of results.threads) {
          items.push({
            type: 'thread',
            thread: t,
            isLiked: likedMap[t.id] ?? isThreadLikedByCurrentUser(t.id),
          });
        }
      }
      return items;
    }

    const suggestedUsers = getExploreUsers();
    const trendingThreads = getTrendingThreads();
    const items: ExploreItem[] = [];

    if (suggestedUsers.length > 0) {
      items.push({ type: 'section-header', title: 'Suggested' });
      for (const u of suggestedUsers) {
        items.push({
          type: 'user',
          user: u,
          isFollowed: followMap[u.id] ?? isUserFollowedByCurrentUser(u.id),
        });
      }
    }

    if (trendingThreads.length > 0) {
      items.push({ type: 'section-header', title: 'Trending' });
      for (const t of trendingThreads) {
        items.push({
          type: 'thread',
          thread: t,
          isLiked: likedMap[t.id] ?? isThreadLikedByCurrentUser(t.id),
        });
      }
    }

    return items;
  }, [query, refreshKey, likedMap, followMap]);

  const handleLike = useCallback((threadId: string) => {
    const result = toggleThreadLike(threadId);
    setLikedMap((prev) => ({ ...prev, [threadId]: result.liked }));
  }, []);

  const handleFollow = useCallback((userId: string) => {
    const result = toggleUserFollow(userId);
    setFollowMap((prev) => ({ ...prev, [userId]: result.following }));
  }, []);

  const handleReply = useCallback(
    (threadId: string) => {
      router.push(`/thread/${threadId}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ExploreItem; index: number }) => {
      if (item.type === 'section-header') {
        return (
          <AnimatedListItem index={index}>
            <Box className="px-4 pt-5 pb-2">
              <Heading size="sm" className="text-[#f3f5f7]">
                {item.title}
              </Heading>
            </Box>
          </AnimatedListItem>
        );
      }

      if (item.type === 'user') {
        return (
          <AnimatedListItem index={index}>
            <AnimatedPressable
              onPress={() => router.push(`/profile/${item.user.id}`)}
              scaleValue={0.98}
            >
              <HStack className="px-4 py-3 items-center" space="md">
                <Avatar size="md">
                  <AvatarImage source={{ uri: item.user.avatar_url }} />
                  <AvatarFallbackText>{item.user.display_name}</AvatarFallbackText>
                </Avatar>
                <VStack className="flex-1">
                  <HStack className="items-center" space="xs">
                    <Text className="text-[#f3f5f7] font-bold text-[15px]">
                      {item.user.display_name}
                    </Text>
                    {item.user.verified && (
                      <BadgeCheck size={14} color="#0095f6" fill="#0095f6" />
                    )}
                  </HStack>
                  <Text className="text-[#555555] text-[14px]">
                    @{item.user.username}
                  </Text>
                  {item.user.bio ? (
                    <Text className="text-[#999] text-[13px] mt-0.5" numberOfLines={1}>
                      {item.user.bio}
                    </Text>
                  ) : null}
                </VStack>
                <Button
                  size="sm"
                  variant={item.isFollowed ? 'outline' : 'solid'}
                  className={
                    item.isFollowed
                      ? 'rounded-lg border-[#333] bg-transparent min-w-[90px]'
                      : 'rounded-lg bg-[#f3f5f7] min-w-[90px]'
                  }
                  onPress={() => handleFollow(item.user.id)}
                >
                  <ButtonText
                    className={`text-[13px] font-semibold ${
                      item.isFollowed ? 'text-[#555555]' : 'text-[#101010]'
                    }`}
                  >
                    {item.isFollowed ? 'Following' : 'Follow'}
                  </ButtonText>
                </Button>
              </HStack>
              <Divider className="bg-[#1e1e1e] ml-[72px]" />
            </AnimatedPressable>
          </AnimatedListItem>
        );
      }

      if (item.type === 'thread') {
        return (
          <AnimatedListItem index={index}>
            <ThreadCard
              thread={item.thread}
              isLiked={item.isLiked}
              onLike={handleLike}
              onReply={handleReply}
              showDivider
            />
          </AnimatedListItem>
        );
      }

      return null;
    },
    [handleLike, handleFollow, handleReply, router],
  );

  return (
    <ScreenLayout>
      {/* Search bar */}
      <Box className="px-4 pt-2 pb-3">
        <HStack className="bg-[#1e1e1e] rounded-xl px-3 items-center h-[38px]" space="sm">
          <Search size={16} color="#555555" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#555555"
            className="flex-1 text-[#f3f5f7] text-[15px] h-full"
            style={Platform.OS === 'web' ? { outlineStyle: 'none' as any } : undefined}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color="#555555" />
            </Pressable>
          )}
        </HStack>
      </Box>

      <FlatList
        data={exploreData}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.type === 'section-header') return `header-${item.title}`;
          if (item.type === 'user') return `user-${item.user.id}`;
          if (item.type === 'thread') return `thread-${item.thread.id}`;
          return `item-${index}`;
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          query.trim() ? (
            <View className="items-center justify-center py-16">
              <Text className="text-[#555555] text-[15px]">No results for "{query}"</Text>
            </View>
          ) : null
        }
      />
    </ScreenLayout>
  );
}
