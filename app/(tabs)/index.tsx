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
import { SquarePen } from 'lucide-react-native';
import { FeedSkeleton } from '@/components/skeletons';
import { FEED_TABS } from '@/constants/app';
import { useThreadsFeed } from '@/hooks/use-threads';
import { useInteractionStore } from '@/store/useInteractionStore';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  
  const { 
    data: feed, 
    isLoading, 
    isRefreshing, 
    refresh, 
    handleLike, 
    handleRepost 
  } = useThreadsFeed();

  const { likedThreads: likedMap, repostedThreads: repostMap } = useInteractionStore();

  const [activeTab, setActiveTab] = useState('foryou');
  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

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
        <View className="items-center pb-2 pt-3">
          <Text className="mb-2 text-[28px] font-bold tracking-tight text-brand-light">
            𝕋
          </Text>
        </View>
              <AnimatedTabBar
                tabs={FEED_TABS}
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
          <Text className="text-[15px] text-brand-muted">No threads yet</Text>
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
            refreshing={isRefreshing}
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
          className="mb-[16px] mr-4 size-[56px]"
        >
          <FabIcon as={SquarePen} size="lg" />
        </Fab>
      )}
    </ScreenLayout>
  );
}
