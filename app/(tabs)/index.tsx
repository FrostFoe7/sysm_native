// app/(tabs)/index.tsx

import React, { useState, useCallback, useRef } from 'react';
import { FlatList, RefreshControl, Platform, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThreadCard } from '@/components/ThreadCard';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { ShareSheet } from '@/components/ShareSheet';
import { ThreadOverflowMenu } from '@/components/ThreadOverflowMenu';
import { Text } from '@/components/ui/text';
import { Fab, FabIcon } from '@/components/ui/fab';
import {
  getFeed,
  isThreadLikedByCurrentUser,
  isRepostedByCurrentUser,
  toggleThreadLike,
  toggleRepost,
} from '@/db/selectors';
import { SquarePen } from 'lucide-react-native';
import { FeedSkeleton } from '@/components/skeletons';
import type { ThreadWithAuthor } from '@/db/db';

const TABS = [
  { key: 'foryou', label: 'For you' },
  { key: 'following', label: 'Following' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  
  const [feed, setFeed] = useState<ThreadWithAuthor[]>(() => getFeed());
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const t of getFeed()) {
      map[t.id] = isThreadLikedByCurrentUser(t.id);
    }
    return map;
  });
  const [repostMap, setRepostMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const t of getFeed()) {
      map[t.id] = isRepostedByCurrentUser(t.id);
    }
    return map;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('foryou');
  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const refreshFeed = useCallback(() => {
    const freshFeed = getFeed();
    setFeed(freshFeed);
    const likeMap: Record<string, boolean> = {};
    const rpMap: Record<string, boolean> = {};
    for (const t of freshFeed) {
      likeMap[t.id] = isThreadLikedByCurrentUser(t.id);
      rpMap[t.id] = isRepostedByCurrentUser(t.id);
    }
    setLikedMap(likeMap);
    setRepostMap(rpMap);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshFeed();
      if (isLoading) {
        const t = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(t);
      }
    }, [refreshFeed, isLoading]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      refreshFeed();
      setRefreshing(false);
    }, 600);
  }, [refreshFeed]);

  const handleLike = useCallback((threadId: string) => {
    const result = toggleThreadLike(threadId);
    setLikedMap((prev) => ({ ...prev, [threadId]: result.liked }));
    setFeed((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, like_count: result.likeCount } : t,
      ),
    );
  }, []);

  const handleRepost = useCallback((threadId: string) => {
    const result = toggleRepost(threadId);
    setRepostMap((prev) => ({ ...prev, [threadId]: result.reposted }));
    setFeed((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, repost_count: result.repostCount } : t,
      ),
    );
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
      const thread = feed.find((t) => t.id === threadId) ?? null;
      setOverflowThread(thread);
    },
    [feed],
  );

  const handleThreadDeleted = useCallback((threadId: string) => {
    setFeed((prev) => prev.filter((t) => t.id !== threadId));
  }, []);

  const handleThreadHidden = useCallback((threadId: string) => {
    setFeed((prev) => prev.filter((t) => t.id !== threadId));
  }, []);

  const handleUserMuted = useCallback((userId: string) => {
    setFeed((prev) => prev.filter((t) => t.user_id !== userId));
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ThreadWithAuthor; index: number }) => (
      <AnimatedListItem index={index}>
        <ThreadCard
          thread={item}
          isLiked={likedMap[item.id] ?? false}
          isReposted={repostMap[item.id] ?? false}
          onLike={handleLike}
          onReply={handleReply}
          onRepost={handleRepost}
          onShare={handleShare}
          onMorePress={handleMore}
          showDivider={index < feed.length - 1}
        />
      </AnimatedListItem>
    ),
    [likedMap, repostMap, handleLike, handleReply, handleRepost, handleShare, handleMore, feed.length],
  );

  const keyExtractor = useCallback((item: ThreadWithAuthor) => item.id, []);

  const renderHeader = useCallback(
    () => (
      <View>
        <View className="items-center pt-3 pb-2">
          <Text className="text-[#f3f5f7] text-[28px] font-bold tracking-tight mb-2">
            𝕋
          </Text>
        </View>
        <AnimatedTabBar
          tabs={TABS}
          activeKey={activeTab}
          onTabPress={setActiveTab}
        />
      </View>
    ),
    [activeTab],
  );

  const renderEmpty = useCallback(
    () => (
      isLoading ? <FeedSkeleton /> : (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-[#555555] text-[15px]">No threads yet</Text>
        </View>
      )
    ),
    [isLoading],
  );

  return (
    <ScreenLayout>
      <FlatList
        ref={flatListRef}
        data={feed}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#555555"
            colors={['#555555']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 24,
          ...(Platform.OS === 'web' ? { minHeight: '100%' } : {}),
        }}
      />
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
      {!isDesktop && (
        <Fab
          size="lg"
          placement="bottom right"
          onPress={() => router.push('/modal')}
          className="mr-4 mb-[16px] w-[56px] h-[56px]"
        >
          <FabIcon as={SquarePen} size="lg" />
        </Fab>
      )}
    </ScreenLayout>
  );
}
