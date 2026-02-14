// app/(tabs)/profile.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ThreadCard } from '@/components/ThreadCard';
import { ShareSheet } from '@/components/ShareSheet';
import { ThreadOverflowMenu } from '@/components/ThreadOverflowMenu';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import {
  toggleThreadLike,
  isThreadLikedByCurrentUser,
  isRepostedByCurrentUser,
  toggleRepost,
} from '@/db/selectors';
import { Menu, Settings } from 'lucide-react-native';
import { ProfileHeaderSkeleton, FeedSkeleton, TabBarSkeleton } from '@/components/skeletons';
import type { ThreadWithAuthor } from '@/types/types';
import { PROFILE_TABS } from '@/constants/app';
import { useCurrentUserProfile } from '@/hooks/use-user-profile';
import { useInteractionStore } from '@/store/useInteractionStore';

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('threads');
  
  const { profile, isLoading } = useCurrentUserProfile();

  const { 
    likedThreads: likedMap, 
    repostedThreads: repostMap, 
    setLiked, 
    setReposted,
    syncInteractions
  } = useInteractionStore();

  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);

  // Sync maps when profile loads
  useEffect(() => {
    if (profile) {
      const newLiked: Record<string, boolean> = {};
      const newReposted: Record<string, boolean> = {};
      for (const t of [...profile.threads, ...profile.replies]) {
        newLiked[t.id] = isThreadLikedByCurrentUser(t.id);
        newReposted[t.id] = isRepostedByCurrentUser(t.id);
      }
      syncInteractions({ liked: newLiked, reposted: newReposted });
    }
  }, [profile, syncInteractions]);

  const handleLike = useCallback((threadId: string) => {
    const wasLiked = !!likedMap[threadId];
    setLiked(threadId, !wasLiked);
    toggleThreadLike(threadId).catch(() => setLiked(threadId, wasLiked));
  }, [likedMap, setLiked]);

  const handleRepost = useCallback((threadId: string) => {
    const wasReposted = !!repostMap[threadId];
    setReposted(threadId, !wasReposted);
    toggleRepost(threadId).catch(() => setReposted(threadId, wasReposted));
  }, [repostMap, setReposted]);

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

  const handleThreadDeleted = useCallback((_threadId: string) => {
    const p = getProfile(CURRENT_USER_ID);
    if (p) setProfile(p);
  }, []);

  const handleThreadHidden = useCallback((_threadId: string) => {
    const p = getProfile(CURRENT_USER_ID);
    if (p) setProfile(p);
  }, []);

  const handleUserMuted = useCallback((_userId: string) => {
    const p = getProfile(CURRENT_USER_ID);
    if (p) setProfile(p);
  }, []);

  if (!profile) return null;

  if (isLoading) {
    return (
      <ScreenLayout>
        <HStack className="h-[44px] items-center justify-between px-4">
          <Pressable hitSlop={8} className="p-1 active:opacity-60">
            <Menu size={24} color="brand-light" />
          </Pressable>
          <Pressable hitSlop={8} className="p-1 active:opacity-60">
            <Settings size={24} color="brand-light" />
          </Pressable>
        </HStack>
        <ProfileHeaderSkeleton isCurrentUser />
        <TabBarSkeleton />
        <FeedSkeleton count={4} />
      </ScreenLayout>
    );
  }

  const data = activeTab === 'threads' ? profile.threads : profile.replies;

  return (
    <ScreenLayout>
      {/* Toolbar */}
      <HStack className="h-[44px] items-center justify-between px-4">
        <Pressable hitSlop={8} className="p-1 active:opacity-60">
          <Menu size={24} color="brand-light" />
        </Pressable>
        <Pressable hitSlop={8} className="p-1 active:opacity-60">
          <Settings size={24} color="brand-light" />
        </Pressable>
      </HStack>

      <ProfileHeader
        user={profile.user}
        threadCount={profile.threads.length}
        followerCount={profile.followersCount}
        followingCount={profile.followingCount}
        isCurrentUser
        onEditProfile={() => router.push('/profile/edit')}
      />

      <AnimatedTabBar tabs={PROFILE_TABS} activeKey={activeTab} onTabPress={setActiveTab} />

      <FlatList
        data={data}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <ThreadCard
              thread={item}
              isLiked={likedMap[item.id] ?? isThreadLikedByCurrentUser(item.id)}
              isReposted={repostMap[item.id] ?? isRepostedByCurrentUser(item.id)}
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
              {activeTab === 'threads' ? 'No threads yet' : 'No replies yet'}
            </Text>
          </View>
        }
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
    </ScreenLayout>  );
}