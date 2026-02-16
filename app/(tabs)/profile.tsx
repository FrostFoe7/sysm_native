// app/(tabs)/profile.tsx

import React, { useState, useCallback, useEffect } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenLayout } from "@/components/ScreenLayout";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ThreadCard } from "@/components/ThreadCard";
import { ShareSheet } from "@/components/ShareSheet";
import { ThreadOverflowMenu } from "@/components/ThreadOverflowMenu";
import { FollowersModal } from "@/components/FollowersModal";
import { AnimatedListItem } from "@/components/AnimatedListItem";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { DesktopRightColumn } from "@/components/DesktopRightColumn";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { ThreadService } from "@/services/thread.service";
import { SettingsIcon, CommunityIcon } from "@/constants/icons";
import type { ThreadWithAuthor } from "@/types/types";
import { PROFILE_TABS } from "@/constants/app";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("threads");
  const { userId } = useAuthStore();

  const { profile, isLoading, refresh: refetch } = useCurrentUserProfile();

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
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersTab, setFollowersTab] = useState<"followers" | "following">(
    "followers",
  );

  // Sync maps when profile loads
  useEffect(() => {
    if (profile) {
      const syncLikes = async () => {
        const newLiked: Record<string, boolean> = {};
        const newReposted: Record<string, boolean> = {};
        const allThreads = [...profile.threads, ...profile.replies];
        const checks = allThreads.map(async (t) => {
          const [liked, reposted] = await Promise.all([
            ThreadService.isLikedByCurrentUser(t.id),
            ThreadService.isRepostedByCurrentUser(t.id),
          ]);
          newLiked[t.id] = liked;
          newReposted[t.id] = reposted;
        });
        await Promise.all(checks);
        syncInteractions({ liked: newLiked, reposted: newReposted });
      };
      syncLikes();
    }
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

  const handleThreadDeleted = useCallback(
    (_threadId: string) => {
      refetch();
    },
    [refetch],
  );

  const handleThreadHidden = useCallback(
    (_threadId: string) => {
      refetch();
    },
    [refetch],
  );

  const handleUserMuted = useCallback(
    (_userId: string) => {
      refetch();
    },
    [refetch],
  );

  const handleFollowersPress = useCallback(() => {
    setFollowersTab("followers");
    setFollowersModalOpen(true);
  }, []);

  const handleFollowingPress = useCallback(() => {
    setFollowersTab("following");
    setFollowersModalOpen(true);
  }, []);

  if (!profile && !isLoading) return null;

  if (isLoading) return null;

  const data = activeTab === "threads" ? profile!.threads : profile!.replies;

  return (
    <ScreenLayout>
      <View className="flex-1 lg:flex-row lg:justify-center">
        <View className="flex-1 lg:max-w-[600px]">
          {/* Toolbar */}
          <HStack className="h-[44px] items-center justify-between px-4">
            <Pressable hitSlop={8} className="p-1 active:opacity-60">
              <CommunityIcon size={24} color="#f3f5f7" />
            </Pressable>
            <Pressable hitSlop={8} className="p-1 active:opacity-60">
              <SettingsIcon size={24} color="#f3f5f7" />
            </Pressable>
          </HStack>

          <ProfileHeader
            user={profile!.user}
            threadCount={profile!.threads.length}
            followerCount={profile!.followersCount}
            followingCount={profile!.followingCount}
            isCurrentUser
            onEditProfile={() => router.push("/profile/edit")}
            onFollowersPress={handleFollowersPress}
            onFollowingPress={handleFollowingPress}
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
            scrollEnabled
            nestedScrollEnabled
            ListEmptyComponent={
              <View className="items-center justify-center py-16">
                <Text className="text-[15px] text-brand-muted">
                  {activeTab === "threads"
                    ? "No threads yet"
                    : "No replies yet"}
                </Text>
              </View>
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
      <FollowersModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        userId={userId ?? ""}
        initialTab={followersTab}
      />
    </ScreenLayout>
  );
}
