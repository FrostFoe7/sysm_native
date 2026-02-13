// app/profile/[id].tsx

import React, { useState, useCallback, useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ThreadCard } from '@/components/ThreadCard';
import { ShareSheet } from '@/components/ShareSheet';
import { ThreadOverflowMenu } from '@/components/ThreadOverflowMenu';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import {
  getProfile,
  toggleThreadLike,
  toggleUserFollow,
  isThreadLikedByCurrentUser,
  isUserFollowedByCurrentUser,
  isRepostedByCurrentUser,
  toggleRepost,
} from '@/db/selectors';
import type { ThreadWithAuthor } from '@/db/db';
import { ProfileHeaderSkeleton, FeedSkeleton, TabBarSkeleton } from '@/components/skeletons';

const TABS = [
  { key: 'threads', label: 'Threads' },
  { key: 'replies', label: 'Replies' },
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('threads');
  const [profile, setProfile] = useState(() => (id ? getProfile(id) : null));
  const [isFollowing, setIsFollowing] = useState(() =>
    id ? isUserFollowedByCurrentUser(id) : false,
  );
  const [followersCount, setFollowersCount] = useState(
    () => profile?.followersCount ?? 0,
  );
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [repostMap, setRepostMap] = useState<Record<string, boolean>>({});
  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Follow button scale animation
  const followScale = useSharedValue(1);
  const followAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: followScale.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const p = getProfile(id);
      if (p) {
        setProfile(p);
        setIsFollowing(isUserFollowedByCurrentUser(id));
        setFollowersCount(p.followersCount);
        const newLiked: Record<string, boolean> = {};
        const newReposted: Record<string, boolean> = {};
        for (const t of [...p.threads, ...p.replies]) {
          newLiked[t.id] = isThreadLikedByCurrentUser(t.id);
          newReposted[t.id] = isRepostedByCurrentUser(t.id);
        }
        setLikedMap(newLiked);
        setRepostMap(newReposted);
      }
      if (isLoading) {
        const t = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(t);
      }
    }, [id, isLoading]),
  );

  const handleFollow = useCallback(() => {
    if (!id) return;
    // Bounce animation on follow toggle
    followScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      followScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    }, 100);
    const result = toggleUserFollow(id);
    setIsFollowing(result.following);
    setFollowersCount((c) =>
      result.following ? c + 1 : Math.max(0, c - 1),
    );
  }, [id, followScale]);

  const handleLike = useCallback((threadId: string) => {
    const result = toggleThreadLike(threadId);
    setLikedMap((prev) => ({ ...prev, [threadId]: result.liked }));
    setProfile((prev) => {
      if (!prev) return prev;
      const update = (arr: ThreadWithAuthor[]) =>
        arr.map((t) =>
          t.id === threadId ? { ...t, like_count: result.likeCount } : t,
        );
      return { ...prev, threads: update(prev.threads), replies: update(prev.replies) };
    });
  }, []);

  const handleRepost = useCallback((threadId: string) => {
    const result = toggleRepost(threadId);
    setRepostMap((prev) => ({ ...prev, [threadId]: result.reposted }));
    setProfile((prev) => {
      if (!prev) return prev;
      const update = (arr: ThreadWithAuthor[]) =>
        arr.map((t) =>
          t.id === threadId ? { ...t, repost_count: result.repostCount } : t,
        );
      return { ...prev, threads: update(prev.threads), replies: update(prev.replies) };
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
    if (!id) return;
    const p = getProfile(id);
    if (p) setProfile(p);
  }, [id]);

  const handleThreadHidden = useCallback((_threadId: string) => {
    if (!id) return;
    const p = getProfile(id);
    if (p) setProfile(p);
  }, [id]);

  const handleUserMuted = useCallback((_userId: string) => {
    if (!id) return;
    const p = getProfile(id);
    if (p) setProfile(p);
  }, [id]);

  if (!profile) return null;

  if (isLoading) {
    return (
      <ScreenLayout>
        <ProfileHeaderSkeleton isCurrentUser={false} />
        <TabBarSkeleton />
        <FeedSkeleton count={4} />
      </ScreenLayout>
    );
  }

  const data = activeTab === 'threads' ? profile.threads : profile.replies;

  return (
    <ScreenLayout>
      <ProfileHeader
        user={profile.user}
        threadCount={profile.threads.length}
        followerCount={followersCount}
        followingCount={profile.followingCount}
        isCurrentUser={false}
        isFollowing={isFollowing}
        onFollowToggle={handleFollow}
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
    </ScreenLayout>
  );
}
