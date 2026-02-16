// app/profile/[id].tsx

import React, { useState, useCallback, useEffect } from "react";
import { FlatList, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenLayout } from "@/components/ScreenLayout";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ThreadCard } from "@/components/ThreadCard";
import { ShareSheet } from "@/components/ShareSheet";
import { ThreadOverflowMenu } from "@/components/ThreadOverflowMenu";
import { AnimatedListItem } from "@/components/AnimatedListItem";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { Text } from "@/components/ui/text";
import { ThreadService } from "@/services/thread.service";
import type { ThreadWithAuthor } from "@/types/types";
import {
  ProfileHeaderSkeleton,
  FeedSkeleton,
  TabBarSkeleton,
} from "@/components/skeletons";
import { PROFILE_TABS } from "@/constants/app";
import { useUserProfile } from "@/hooks/use-user";
import { useInteractionStore } from "@/store/useInteractionStore";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("threads");

  const {
    profile,
    isLoading,
    isFollowing,
    followersCount,
    handleFollowToggle,
  } = useUserProfile(id ?? "");

  const {
    likedThreads: likedMap,
    repostedThreads: repostMap,
    setLiked,
    setReposted,
    syncInteractions,
  } = useInteractionStore();

  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(
    null,
  );

  // Sync maps when profile loads
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const newLiked: Record<string, boolean> = {};
      const newReposted: Record<string, boolean> = {};
      for (const t of [...profile.threads, ...profile.replies]) {
        newLiked[t.id] = await ThreadService.isLikedByCurrentUser(t.id);
        newReposted[t.id] = await ThreadService.isRepostedByCurrentUser(t.id);
      }
      syncInteractions({ liked: newLiked, reposted: newReposted });
    })();
  }, [profile, syncInteractions]);

  const handleLike = useCallback(
    (threadId: string) => {
      const wasLiked = !!likedMap[threadId];
      setLiked(threadId, !wasLiked);
      ThreadService.toggleLike(threadId).catch(() =>
        setLiked(threadId, wasLiked),
      );
    },
    [likedMap, setLiked],
  );

  const handleRepost = useCallback(
    (threadId: string) => {
      const wasReposted = !!repostMap[threadId];
      setReposted(threadId, !wasReposted);
      ThreadService.toggleRepost(threadId).catch(() =>
        setReposted(threadId, wasReposted),
      );
    },
    [repostMap, setReposted],
  );

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
      if (!profile) return;
      const all = [...profile.threads, ...profile.replies];
      setOverflowThread(all.find((t) => t.id === threadId) ?? null);
    },
    [profile],
  );

  const handleThreadDeleted = useCallback(() => {
    // Re-fetch via hook if needed
  }, []);

  const handleThreadHidden = useCallback(() => {}, []);
  const handleUserMuted = useCallback(() => {}, []);

  if (isLoading) {
    return (
      <ScreenLayout>
        <ProfileHeaderSkeleton isCurrentUser={false} />
        <TabBarSkeleton />
        <FeedSkeleton count={4} />
      </ScreenLayout>
    );
  }

  if (!profile) return null;

  const data = activeTab === "threads" ? profile.threads : profile.replies;

  return (
    <ScreenLayout>
      <ProfileHeader
        user={profile.user}
        threadCount={profile.threads.length}
        followerCount={followersCount}
        followingCount={profile.followingCount}
        isCurrentUser={false}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
      />

      <AnimatedTabBar
        tabs={PROFILE_TABS}
        activeKey={activeTab}
        onTabPress={setActiveTab}
      />

      <FlatList
        data={data}
        renderItem={({ item, index }) => (
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
              showDivider={index < data.length - 1}
            />
          </AnimatedListItem>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-[15px] text-brand-muted">
              {activeTab === "threads" ? "No threads yet" : "No replies yet"}
            </Text>
          </View>
        }
      />
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
        onUserMuted={handleUserMuted}
      />
    </ScreenLayout>
  );
}
