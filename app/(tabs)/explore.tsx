// app/(tabs)/explore.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, TextInput, Pressable, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThreadCard } from '@/components/ThreadCard';
import { ShareSheet } from '@/components/ShareSheet';
import { ThreadOverflowMenu } from '@/components/ThreadOverflowMenu';
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
  isRepostedByCurrentUser,
  toggleRepost,
  formatCount,
} from '@/db/selectors';
import { Search, X, BadgeCheck } from 'lucide-react-native';
import { ExploreSkeleton } from '@/components/skeletons';
import type { User, ThreadWithAuthor } from '@/db/db';

type ExploreItem =
  | { type: 'section-header'; title: string }
  | { type: 'user'; user: User; isFollowed: boolean }
  | { type: 'thread'; thread: ThreadWithAuthor; isLiked: boolean; isReposted: boolean };

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [repostMap, setRepostMap] = useState<Record<string, boolean>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);
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

  // Reset loading when query changes
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setIsLoading(false);
  }, []);

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
            isReposted: repostMap[t.id] ?? isRepostedByCurrentUser(t.id),
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
          isReposted: repostMap[t.id] ?? isRepostedByCurrentUser(t.id),
        });
      }
    }

    return items;
  }, [query, refreshKey, likedMap, repostMap, followMap]);

  const handleLike = useCallback((threadId: string) => {
    const result = toggleThreadLike(threadId);
    setLikedMap((prev) => ({ ...prev, [threadId]: result.liked }));
  }, []);

  const handleRepost = useCallback((threadId: string) => {
    const result = toggleRepost(threadId);
    setRepostMap((prev) => ({ ...prev, [threadId]: result.reposted }));
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

  const handleShare = useCallback((threadId: string) => {
    setShareThreadId(threadId);
  }, []);

  const handleMore = useCallback(
    (threadId: string) => {
      const allThreads = exploreData
        .filter((d): d is ExploreItem & { type: 'thread' } => d.type === 'thread')
        .map((d) => d.thread);
      setOverflowThread(allThreads.find((t) => t.id === threadId) ?? null);
    },
    [exploreData],
  );

  const handleThreadDeleted = useCallback((threadId: string) => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleThreadHidden = useCallback((_threadId: string) => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleUserMuted = useCallback((_userId: string) => {
    setRefreshKey((k) => k + 1);
  }, []);

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
                <VStack className="flex-1 overflow-hidden">
                  <HStack className="items-center" space="xs">
                    <Text className="text-[#f3f5f7] font-bold text-[15px]" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {item.user.display_name}
                    </Text>
                    {item.user.verified && (
                      <BadgeCheck size={14} color="#0095f6" fill="#0095f6" />
                    )}
                  </HStack>
                  <Text className="text-[#555555] text-[14px]" numberOfLines={1}>
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
              isReposted={item.isReposted}
              onLike={handleLike}
              onReply={handleReply}
              onRepost={handleRepost}
              onShare={handleShare}
              onMorePress={handleMore}
              showDivider
            />
          </AnimatedListItem>
        );
      }

      return null;
    },
    [handleLike, handleFollow, handleReply, handleRepost, handleShare, handleMore, router],
  );

  return (
    <ScreenLayout>
      <View className="flex-1">
        {/* Sticky Search bar */}
        <View className="sticky top-0 z-10 px-4 pt-4 pb-4 bg-[#101010]">
          <HStack className="bg-[#1e1e1e] rounded-xl px-4 items-center h-[48px]" space="sm">
            <Search size={18} color="#555555" />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Search"
              placeholderTextColor="#555555"
              numberOfLines={1}
              className="flex-1 text-[#f3f5f7] text-[15px] h-full"
              style={Platform.OS === 'web' ? { outlineStyle: 'none' as any } : undefined}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => {
                setQuery('');
                setIsLoading(false);
              }} hitSlop={8}>
                <X size={16} color="#555555" />
              </Pressable>
            )}
          </HStack>
        </View>

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
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            isLoading ? (
              <ExploreSkeleton />
            ) : query.trim() ? (
              <View className="items-center justify-center py-16">
                <Text className="text-[#555555] text-[15px]">No results for &quot;{query}&quot;</Text>
              </View>
            ) : null
          }
        />
      </View>
      <ShareSheet
        isOpen={shareThreadId !== null}
        onClose={() => setShareThreadId(null)}
        threadId={shareThreadId ?? ''}
      />
      <ThreadOverflowMenu
        isOpen={overflowThread !== null}
        onClose={() => setOverflowThread(null)}
        thread={overflowThread}
        onThreadDeleted={handleThreadDeleted}
        onThreadHidden={handleThreadHidden}
        onUserMuted={handleUserMuted}
      />
    </ScreenLayout>
  );
}
