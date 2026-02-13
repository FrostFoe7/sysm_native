// app/(tabs)/profile.tsx

import React, { useState, useCallback } from 'react';
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
  getProfile,
  toggleThreadLike,
  isThreadLikedByCurrentUser,
  isRepostedByCurrentUser,
  toggleRepost,
} from '@/db/selectors';
import { CURRENT_USER_ID } from '@/db/db';
import { Menu, Settings } from 'lucide-react-native';
import type { ThreadWithAuthor } from '@/db/db';

const TABS = [
  { key: 'threads', label: 'Threads' },
  { key: 'replies', label: 'Replies' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('threads');
  const [profile, setProfile] = useState(() => getProfile(CURRENT_USER_ID));
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [repostMap, setRepostMap] = useState<Record<string, boolean>>({});
  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);

  useFocusEffect(
    useCallback(() => {
      const p = getProfile(CURRENT_USER_ID);
      if (p) {
        setProfile(p);
        const newLiked: Record<string, boolean> = {};
        const newReposted: Record<string, boolean> = {};
        for (const t of [...p.threads, ...p.replies]) {
          newLiked[t.id] = isThreadLikedByCurrentUser(t.id);
          newReposted[t.id] = isRepostedByCurrentUser(t.id);
        }
        setLikedMap(newLiked);
        setRepostMap(newReposted);
      }
    }, []),
  );

  const handleLike = useCallback((threadId: string) => {
    const result = toggleThreadLike(threadId);
    setLikedMap((prev) => ({ ...prev, [threadId]: result.liked }));
    setProfile((prev) => {
      if (!prev) return prev;
      const updateThreads = (arr: ThreadWithAuthor[]) =>
        arr.map((t) =>
          t.id === threadId ? { ...t, like_count: result.likeCount } : t,
        );
      return {
        ...prev,
        threads: updateThreads(prev.threads),
        replies: updateThreads(prev.replies),
      };
    });
  }, []);

  const handleRepost = useCallback((threadId: string) => {
    const result = toggleRepost(threadId);
    setRepostMap((prev) => ({ ...prev, [threadId]: result.reposted }));
    setProfile((prev) => {
      if (!prev) return prev;
      const updateThreads = (arr: ThreadWithAuthor[]) =>
        arr.map((t) =>
          t.id === threadId ? { ...t, repost_count: result.repostCount } : t,
        );
      return {
        ...prev,
        threads: updateThreads(prev.threads),
        replies: updateThreads(prev.replies),
      };
    });
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

  const data = activeTab === 'threads' ? profile.threads : profile.replies;

  return (
    <ScreenLayout>
      {/* Toolbar */}
      <HStack className="px-4 h-[44px] items-center justify-between">
        <Pressable hitSlop={8} className="p-1 active:opacity-60">
          <Menu size={24} color="#f3f5f7" />
        </Pressable>
        <Pressable hitSlop={8} className="p-1 active:opacity-60">
          <Settings size={24} color="#f3f5f7" />
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

      <AnimatedTabBar tabs={TABS} activeKey={activeTab} onTabPress={setActiveTab} />

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
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-[#555555] text-[15px]">
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