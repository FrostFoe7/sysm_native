// components/FollowersModal.tsx
// Modal showing followers/following lists — Instagram-style

import React, { useState, useCallback, useEffect } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { BadgeCheck, X } from 'lucide-react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { BONE_COLOR } from '@/constants/ui';
import { UserService } from '@/services/user.service';
import { formatCount } from '@/services/format';
import { analytics } from '@/services/analytics.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types/types';

const TABS = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
];

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following';
}

function UserRowSkeleton() {
  return (
    <HStack className="items-center px-4 py-3" space="md">
      <Skeleton variant="circular" className={`size-11 ${BONE_COLOR}`} />
      <VStack className="flex-1" space="xs">
        <Skeleton variant="rounded" className={`h-3.5 w-24 ${BONE_COLOR}`} />
        <Skeleton variant="rounded" className={`h-3 w-16 ${BONE_COLOR}`} />
      </VStack>
      <Skeleton variant="rounded" className={`h-8 w-[80px] rounded-lg ${BONE_COLOR}`} />
    </HStack>
  );
}

export function FollowersModal({ isOpen, onClose, userId, initialTab = 'followers' }: FollowersModalProps) {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.userId);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState<(User & { isFollowedByMe: boolean })[]>([]);
  const [following, setFollowing] = useState<(User & { isFollowedByMe: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [followerUsers, followingUsers] = await Promise.all([
        UserService.getFollowers(userId),
        UserService.getFollowing(userId),
      ]);

      const followerResults = await Promise.all(
        followerUsers.map(async (u) => ({
          ...u,
          isFollowedByMe: currentUserId ? await UserService.isFollowing(u.id) : false,
        })),
      );
      setFollowers(followerResults);

      const followingResults = await Promise.all(
        followingUsers.map(async (u) => ({
          ...u,
          isFollowedByMe: currentUserId ? await UserService.isFollowing(u.id) : false,
        })),
      );
      setFollowing(followingResults);
    } catch (e) {
      console.error('Failed to load followers/following:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentUserId]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    loadData();
  }, [isOpen, userId, initialTab, loadData]);

  const handleFollowToggle = useCallback(async (targetUserId: string) => {
    const result = await UserService.toggleFollow(targetUserId);
    analytics.track(result.following ? 'follow' : 'unfollow', { contentId: targetUserId });

    const updater = (list: (User & { isFollowedByMe: boolean })[]) =>
      list.map((u) => (u.id === targetUserId ? { ...u, isFollowedByMe: result.following, followers_count: result.followersCount } : u));

    setFollowers(updater);
    setFollowing(updater);
  }, []);

  const handleProfilePress = useCallback((targetUserId: string) => {
    analytics.track('profile_visit', { profileId: targetUserId });
    onClose();
    router.push(`/profile/${targetUserId}`);
  }, [onClose, router]);

  const data = activeTab === 'followers' ? followers : following;

  const renderItem = useCallback(({ item }: { item: User & { isFollowedByMe: boolean } }) => {
    const isSelf = item.id === currentUserId;
    return (
      <Pressable
        onPress={() => handleProfilePress(item.id)}
        className="active:bg-white/5"
      >
        <HStack className="items-center px-4 py-3" space="md">
          <Avatar size="md" className="size-11">
            <AvatarImage source={{ uri: item.avatar_url }} />
          </Avatar>
          <VStack className="min-w-0 flex-1">
            <HStack className="items-center" space="xs">
              <Text className="text-[14px] font-semibold text-brand-light" numberOfLines={1} style={{ flexShrink: 1 }}>
                {item.username}
              </Text>
              {item.verified && <BadgeCheck size={12} color="#0095F6" fill="#0095F6" />}
            </HStack>
            <Text className="text-[13px] text-brand-muted" numberOfLines={1}>
              {item.display_name} · {formatCount(item.followers_count)} followers
            </Text>
          </VStack>
          {!isSelf && (
            <Button
              size="sm"
              className={`h-8 rounded-lg px-4 ${
                item.isFollowedByMe ? 'border border-[#333] bg-transparent' : 'bg-white'
              }`}
              onPress={() => handleFollowToggle(item.id)}
            >
              <ButtonText className={`text-[13px] font-semibold ${item.isFollowedByMe ? 'text-brand-light' : 'text-black'}`}>
                {item.isFollowedByMe ? 'Following' : 'Follow'}
              </ButtonText>
            </Button>
          )}
        </HStack>
      </Pressable>
    );
  }, [handleFollowToggle, handleProfilePress, currentUserId]);

  if (!isOpen) return null;

  return (
    <View className="absolute inset-0 z-50 bg-brand-dark">
      {/* Header */}
      <View className="border-b border-brand-border pb-1 pt-3">
        <HStack className="items-center justify-between px-4 pb-2">
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={24} color="#ffffff" />
          </Pressable>
          <Text className="text-[16px] font-bold text-brand-light">
            {activeTab === 'followers' ? 'Followers' : 'Following'}
          </Text>
          <View style={{ width: 24 }} />
        </HStack>
        <AnimatedTabBar
          tabs={TABS}
          activeKey={activeTab}
          onTabPress={(key) => setActiveTab(key as 'followers' | 'following')}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <VStack>
          {[1, 2, 3, 4, 5].map((i) => (
            <UserRowSkeleton key={i} />
          ))}
        </VStack>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <Divider className="ml-[68px] bg-brand-border" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-[15px] text-brand-muted">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}
