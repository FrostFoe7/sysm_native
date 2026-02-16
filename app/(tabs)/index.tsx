// app/(tabs)/index.tsx

import React, { useState, useCallback, useRef } from "react";
import { FlatList, RefreshControl, Platform, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenLayout } from "@/components/ScreenLayout";
import { ThreadCard } from "@/components/ThreadCard";
import { AnimatedListItem } from "@/components/AnimatedListItem";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { ShareSheet } from "@/components/ShareSheet";
import { ThreadOverflowMenu } from "@/components/ThreadOverflowMenu";
import { EditThreadModal } from "@/components/EditThreadModal";
import { DesktopRightColumn } from "@/components/DesktopRightColumn";
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";
import { Fab, FabIcon } from "@/components/ui/fab";
import { EditIcon } from "@/constants/icons";
import { FEED_TABS } from "@/constants/app";
import { useThreadsFeed } from "@/hooks/use-threads";
import { useInteractionStore } from "@/store/useInteractionStore";
import type { ThreadWithAuthor } from "@/types/types";

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");

  const {
    data: feed,
    isLoading,
    isRefreshing,
    refresh,
    handleLike,
    handleRepost,
    handleDelete: triggerDelete,
    handleEdit: triggerEdit,
  } = useThreadsFeed(activeTab);

  const { likedThreads: likedMap, repostedThreads: repostMap } =
    useInteractionStore();

  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(
    null,
  );
  const [editingThread, setEditingThread] = useState<ThreadWithAuthor | null>(
    null,
  );
  const flatListRef = useRef<FlatList>(null);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleTabSwitch = useCallback((key: string) => {
    setActiveTab(key as "foryou" | "following");
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  const handleEditPress = useCallback((thread: ThreadWithAuthor) => {
    setEditingThread(thread);
  }, []);

  const handleThreadDeleted = useCallback(
    (threadId: string) => {
      triggerDelete(threadId);
    },
    [triggerDelete],
  );

  const handleThreadHidden = useCallback(
    (_threadId: string) => {
      refresh();
    },
    [refresh],
  );

  const handleThreadUpdated = useCallback(
    (updated: ThreadWithAuthor) => {
      triggerEdit(updated.id, updated.content, updated.media);
    },
    [triggerEdit],
  );

  const handleUserMuted = useCallback(
    (_userId: string) => {
      refresh();
    },
    [refresh],
  );

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
    [
      likedMap,
      repostMap,
      handleLike,
      handleReply,
      handleRepost,
      handleShare,
      handleMore,
      feed.length,
    ],
  );

  const keyExtractor = useCallback((item: ThreadWithAuthor) => item.id, []);

  const renderHeader = useCallback(
    () => (
      <View>
        <View className="items-center pb-2 pt-3">
          <Image
            source={require("@/assets/images/icon.png")}
            size="xs"
            className="mb-2"
            alt="Sysm Logo"
          />
        </View>
        <AnimatedTabBar
          tabs={FEED_TABS}
          activeKey={activeTab}
          onTabPress={handleTabSwitch}
        />
      </View>
    ),
    [activeTab, handleTabSwitch],
  );

  const renderEmpty = useCallback(
    () =>
      isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color="#0095f6" size="small" />
        </View>
      ) : (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-[15px] text-brand-muted">No threads yet</Text>
        </View>
      ),
    [isLoading],
  );

  return (
    <ScreenLayout>
      <View className="flex-1 lg:flex-row lg:justify-center">
        <View className="flex-1 lg:max-w-[600px]">
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
                colors={["#555555"]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 24,
              ...(Platform.OS === "web" ? { minHeight: "100%" } : {}),
            }}
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
        threadId={shareThreadId ?? ""}
      />
      <ThreadOverflowMenu
        isOpen={overflowThread !== null}
        onClose={() => setOverflowThread(null)}
        thread={overflowThread}
        onThreadDeleted={handleThreadDeleted}
        onThreadHidden={handleThreadHidden}
        onThreadEdited={handleEditPress}
        onUserMuted={handleUserMuted}
      />
      <EditThreadModal
        isOpen={editingThread !== null}
        onClose={() => setEditingThread(null)}
        thread={editingThread}
        onThreadUpdated={handleThreadUpdated}
      />

      {/* Mobile FAB (Hidden on Desktop) */}
      <View className="lg:hidden">
        <Fab
          size="lg"
          placement="bottom right"
          onPress={() => router.push("/create")}
          className="mb-[16px] mr-4 size-[56px] bg-brand-blue"
        >
          <FabIcon as={EditIcon} size={"md" as any} color="#ffffff" />
        </Fab>
      </View>
    </ScreenLayout>
  );
}
