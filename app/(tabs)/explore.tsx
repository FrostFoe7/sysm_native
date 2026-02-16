// app/(tabs)/explore.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FlatList, TextInput, Pressable, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThreadCard } from '@/components/ThreadCard';
import { ShareSheet } from '@/components/ShareSheet';
import { ThreadOverflowMenu } from '@/components/ThreadOverflowMenu';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { DesktopRightColumn } from '@/components/DesktopRightColumn';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { UserService } from '@/services/user.service';
import { ThreadService } from '@/services/thread.service';
import { Search, X } from 'lucide-react-native';
import { VerifiedIcon, FollowIcon, FollowingIcon } from '@/constants/icons';
import { ExploreSkeleton } from '@/components/skeletons';
import type { User, ThreadWithAuthor } from '@/types/types';
import { useInteractionStore } from '@/store/useInteractionStore';
import { useExploreFeed } from '@/hooks/use-explore';
import type { ExploreItem as RankedExploreItem } from '@/services/ranking.service';

type ExploreListItem =
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

  // Ranked explore feed via rpc_explore_feed (non-search default view)
  const {
    data: exploreFeed,
    isLoading: exploreLoading,
  } = useExploreFeed();

  // Search results (only when query is non-empty)
  const [searchData, setSearchData] = useState<ExploreListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchData([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);

    (async () => {
      try {
        const results = await UserService.searchAll(query.trim());
        if (cancelled) return;
        const items: ExploreListItem[] = [];
        if (results.users.length > 0) {
          items.push({ type: 'section-header', title: 'People' });
          for (const u of results.users) {
            items.push({
              type: 'user',
              user: u,
              isFollowed: followMap[u.id] ?? false,
            });
          }
        }
        if (results.threads.length > 0) {
          items.push({ type: 'section-header', title: 'Threads' });
          for (const t of results.threads) {
            items.push({
              type: 'thread',
              thread: t,
              isLiked: likedMap[t.id] ?? false,
              isReposted: repostMap[t.id] ?? false,
            });
          }
        }
        setSearchData(items);
      } catch {
        console.error('Search failed');
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [query, refreshKey, likedMap, repostMap, followMap]);

  // Build explore list from server-ranked feed (non-search)
  const exploreListData: ExploreListItem[] = useMemo(() => {
    if (query.trim()) {
      return searchData;
    }
    if (exploreFeed.length > 0) {
      return [
        { type: 'section-header' as const, title: 'Discover' },
        ...exploreFeed
          .filter((item: RankedExploreItem) => item.content_type === 'thread' && item.thread)
          .map((item: RankedExploreItem) => ({
            type: 'thread' as const,
            thread: item.thread!,
            isLiked: item.is_liked ?? likedMap[item.content_id] ?? false,
            isReposted: repostMap[item.content_id] ?? false,
          })),
      ];
    }
    return [];
  }, [query, searchData, exploreFeed, likedMap, repostMap]);

  const isLoading = query.trim() ? isSearching : exploreLoading;

  const handleLike = useCallback(async (threadId: string) => {
    const wasLiked = !!likedMap[threadId];
    setLiked(threadId, !wasLiked);
    try {
      await ThreadService.toggleLike(threadId);
    } catch {
      setLiked(threadId, wasLiked);
    }
  }, [likedMap, setLiked]);

  const handleRepost = useCallback(async (threadId: string) => {
    const wasReposted = !!repostMap[threadId];
    setReposted(threadId, !wasReposted);
    try {
      await ThreadService.toggleRepost(threadId);
    } catch {
      setReposted(threadId, wasReposted);
    }
  }, [repostMap, setReposted]);

  const handleFollow = useCallback(async (userId: string) => {
    const wasFollowing = !!followMap[userId];
    setFollowing(userId, !wasFollowing);
    try {
      const result = await UserService.toggleFollow(userId);
      setFollowing(userId, result.following);
    } catch {
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
      const allThreads = exploreListData
        .filter((d): d is ExploreListItem & { type: 'thread' } => d.type === 'thread')
        .map((d) => d.thread);
      setOverflowThread(allThreads.find((t) => t.id === threadId) ?? null);
    },
    [exploreListData]
  );

  const handleThreadDeleted = useCallback((_threadId: string) => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleThreadHidden = useCallback((_threadId: string) => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleUserMuted = useCallback((_userId: string) => {
    setRefreshKey((k) => k + 1);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ExploreListItem; index: number }) => {
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
                      <VerifiedIcon size={14} color="#0095f6" />
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
                      ? 'min-w-[110px] flex-row items-center justify-center rounded-lg border-brand-border-secondary bg-transparent'
                      : 'min-w-[110px] flex-row items-center justify-center rounded-lg bg-brand-light'
                  }
                  onPress={() => handleFollow(item.user.id)}
                >
                  <ButtonIcon 
                    as={item.isFollowed ? FollowingIcon : FollowIcon} 
                    size={"sm" as any} 
                    color={item.isFollowed ? "#f3f5f7" : "#101010"} 
                    className="mr-1.5"
                  />
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
      <View className="flex-1 lg:flex-row lg:justify-center">
        <View className="flex-1 lg:max-w-[600px]">
          {/* Sticky Search bar */}
          <View className="sticky top-0 z-10 bg-brand-dark p-4 lg:pt-8">
            <HStack className="h-[48px] items-center rounded-xl bg-brand-border px-4" space="sm">
              <Search size={18} color="#555555" />
              <TextInput
                value={query}
                onChangeText={handleQueryChange}
                placeholder="Search"
                placeholderTextColor="#555555"
                numberOfLines={1}
                className="h-full flex-1 text-[15px] text-brand-light"
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
          </View>

          <FlatList
            data={exploreListData}
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

        {/* Desktop Sidebar (lg: breakpoint) */}
        <View className="hidden lg:flex">
          <DesktopRightColumn />
        </View>
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
