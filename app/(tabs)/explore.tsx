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
import { Avatar, AvatarImage } from '@/components/ui/avatar';
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
} from '@/db/selectors';
import { Search, X, BadgeCheck } from 'lucide-react-native';
import { ExploreSkeleton } from '@/components/skeletons';
import type { User, ThreadWithAuthor } from '@/types/types';
import { useInteractionStore } from '@/store/useInteractionStore';

type ExploreItem =
  | { type: 'section-header'; title: string }
  | { type: 'user'; user: User; isFollowed: boolean }
  | { type: 'thread'; thread: ThreadWithAuthor; isLiked: boolean; isReposted: boolean };

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { 
    likedThreads: likedMap, 
    repostedThreads: repostMap, 
    followingUsers: followMap,
    setLiked,
    setReposted,
    setFollowing
  } = useInteractionStore();

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

  const handleLike = useCallback(async (threadId: string) => {
    const wasLiked = !!likedMap[threadId];
    setLiked(threadId, !wasLiked);
    try {
      await toggleThreadLike(threadId);
    } catch (error) {
      setLiked(threadId, wasLiked);
    }
  }, [likedMap, setLiked]);

  const handleRepost = useCallback(async (threadId: string) => {
    const wasReposted = !!repostMap[threadId];
    setReposted(threadId, !wasReposted);
    try {
      await toggleRepost(threadId);
    } catch (error) {
      setReposted(threadId, wasReposted);
    }
  }, [repostMap, setReposted]);

  const handleFollow = useCallback(async (userId: string) => {
    const wasFollowing = !!followMap[userId];
    setFollowing(userId, !wasFollowing);
    try {
      const result = await toggleUserFollow(userId);
      setFollowing(userId, result.following);
    } catch (error) {
      setFollowing(userId, wasFollowing);
    }
  }, [followMap, setFollowing]);

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
            <Box className="px-4 pb-2 pt-5">
              <Heading size="sm" className="text-brand-light">
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
              <HStack className="items-center px-4 py-3" space="md">
                <Avatar size="md">
                  <AvatarImage source={{ uri: item.user.avatar_url }} />
                </Avatar>
                <VStack className="flex-1 overflow-hidden">
                  <HStack className="items-center" space="xs">
                    <Text className="text-[15px] font-bold text-brand-light" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {item.user.display_name}
                    </Text>
                    {item.user.verified && (
                      <BadgeCheck size={14} color="brand-blue" fill="brand-blue" />
                    )}
                  </HStack>
                  <Text className="text-[14px] text-brand-muted" numberOfLines={1}>
                    @{item.user.username}
                  </Text>
                  {item.user.bio ? (
                    <Text className="mt-0.5 text-[13px] text-[#999]" numberOfLines={1}>
                      {item.user.bio}
                    </Text>
                  ) : null}
                </VStack>
                <Button
                  size="sm"
                  variant={item.isFollowed ? 'outline' : 'solid'}
                  className={
                    item.isFollowed
                      ? 'min-w-[90px] rounded-lg border-[#333] bg-transparent'
                      : 'min-w-[90px] rounded-lg bg-brand-light'
                  }
                  onPress={() => handleFollow(item.user.id)}
                >
                  <ButtonText
                    className={`text-[13px] font-semibold ${
                      item.isFollowed ? 'text-brand-muted' : 'text-brand-dark'
                    }`}
                  >
                    {item.isFollowed ? 'Following' : 'Follow'}
                  </ButtonText>
                </Button>
              </HStack>
              <Divider className="ml-[72px] bg-brand-border" />
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
        <View className="sticky top-0 z-10 bg-brand-dark p-4">
          <HStack className="h-[48px] items-center rounded-xl bg-brand-border px-4" space="sm">
            <Search size={18} color="brand-muted" />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Search"
              placeholderTextColor="brand-muted"
              numberOfLines={1}
              className="h-full flex-1 text-[15px] text-brand-light"
              style={Platform.OS === 'web' ? { outlineStyle: 'none' as any } : undefined}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => {
                setQuery('');
                setIsLoading(false);
              }} hitSlop={8}>
                <X size={16} color="brand-muted" />
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
                <Text className="text-[15px] text-brand-muted">No results for &quot;{query}&quot;</Text>
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
