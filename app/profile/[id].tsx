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
} from '@/db/selectors';
import type { ThreadWithAuthor } from '@/db/db';

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
        for (const t of [...p.threads, ...p.replies]) {
          newLiked[t.id] = isThreadLikedByCurrentUser(t.id);
        }
        setLikedMap(newLiked);
      }
    }, [id]),
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

  const handleReply = useCallback(
    (threadId: string) => {
      router.push(`/thread/${threadId}`);
    },
    [router],
  );

  if (!profile) return null;

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
              onLike={handleLike}
              onReply={handleReply}
              showDivider={index < data.length - 1}
            />
          </AnimatedListItem>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-[#555555] text-[15px]">
              {activeTab === 'threads' ? 'No threads yet' : 'No replies yet'}
            </Text>
          </View>
        }
      />
    </ScreenLayout>
  );
}
