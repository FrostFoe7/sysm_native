// components/DesktopRightColumn.tsx
// Right sidebar for desktop: profile card, suggested follows, trending threads

import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { BadgeCheck, TrendingUp } from 'lucide-react-native';
import { UserService } from '@/services/user.service';
import { ThreadService } from '@/services/thread.service';
import { analytics } from '@/services/analytics.service';
import type { User } from '@/types/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BONE_COLOR } from '@/constants/ui';

function RightColumnSkeleton() {
  return (
    <VStack space="lg" className="p-4">
      <HStack className="items-center" space="md">
        <Skeleton variant="circular" className={`size-11 ${BONE_COLOR}`} />
        <VStack space="xs" className="flex-1">
          <Skeleton variant="rounded" className={`h-3 w-24 ${BONE_COLOR}`} />
          <Skeleton variant="rounded" className={`h-2.5 w-16 ${BONE_COLOR}`} />
        </VStack>
      </HStack>
      <Divider className="bg-brand-border" />
      <Skeleton variant="rounded" className={`h-3 w-32 ${BONE_COLOR}`} />
      {[1, 2, 3].map((i) => (
        <HStack key={i} className="items-center" space="md">
          <Skeleton variant="circular" className={`size-9 ${BONE_COLOR}`} />
          <VStack space="xs" className="flex-1">
            <Skeleton variant="rounded" className={`h-3 w-20 ${BONE_COLOR}`} />
            <Skeleton variant="rounded" className={`h-2.5 w-14 ${BONE_COLOR}`} />
          </VStack>
          <Skeleton variant="rounded" className={`h-7 w-[72px] rounded-lg ${BONE_COLOR}`} />
        </HStack>
      ))}
    </VStack>
  );
}

export function DesktopRightColumn() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [suggestions, setSuggestions] = useState<(User & { isFollowing: boolean })[]>([]);
  const [trending, setTrending] = useState<{ id: string; content: string; author_username: string; category?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [user, suggestedUsers, trendingThreads] = await Promise.all([
          UserService.getCurrentUser(),
          UserService.getSuggestedFollows(),
          ThreadService.getTrending(),
        ]);
        setCurrentUser(user);
        setSuggestions(suggestedUsers);
        setTrending(trendingThreads.slice(0, 5).map((t: any) => ({
          id: t.id,
          content: t.content ?? '',
          author_username: t.author?.username ?? '',
          category: t.category,
        })));
      } catch (e) {
        console.error('Failed to load right column:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleFollow = async (userId: string) => {
    const result = await UserService.toggleFollow(userId);
    setSuggestions((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, isFollowing: result.following, followers_count: result.followersCount } : u,
      ),
    );
    analytics.track(result.following ? 'follow' : 'unfollow', { contentId: userId });
  };

  const handleProfilePress = (userId: string) => {
    analytics.track('profile_visit', { profileId: userId });
    router.push(`/profile/${userId}`);
  };

  if (isLoading) {
    return (
      <View className="w-[320px] shrink-0 pl-6">
        <View className="sticky top-0">
          <RightColumnSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View className="w-[320px] shrink-0 pl-6">
      <View className="sticky top-0 pt-4">
        <VStack space="lg">
          {/* Current User Card */}
          {currentUser && (
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              className="active:opacity-80"
            >
              <HStack className="items-center px-2" space="md">
                <Avatar size="md" className="size-11">
                  <AvatarImage source={{ uri: currentUser.avatar_url }} />
                </Avatar>
                <VStack className="flex-1">
                  <HStack className="items-center" space="xs">
                    <Text className="text-sm font-semibold text-brand-light" numberOfLines={1}>
                      {currentUser.display_name}
                    </Text>
                    {currentUser.verified && (
                      <BadgeCheck size={12} color="#0095F6" fill="#0095F6" />
                    )}
                  </HStack>
                  <Text className="text-xs text-brand-muted">@{currentUser.username}</Text>
                </VStack>
              </HStack>
            </Pressable>
          )}

          <Divider className="bg-brand-border" />

          {/* Suggested Follows */}
          <VStack space="md" className="px-2">
            <HStack className="items-center justify-between">
              <Text className="text-sm font-semibold text-brand-muted">Suggested for you</Text>
              <Pressable onPress={() => router.push('/(tabs)/explore')}>
                <Text className="text-xs font-semibold text-brand-blue">See All</Text>
              </Pressable>
            </HStack>

            {suggestions.slice(0, 5).map((user) => (
              <HStack key={user.id} className="items-center" space="sm">
                <Pressable onPress={() => handleProfilePress(user.id)}>
                  <Avatar size="sm" className="size-9">
                    <AvatarImage source={{ uri: user.avatar_url }} />
                  </Avatar>
                </Pressable>
                <VStack className="min-w-0 flex-1">
                  <Pressable onPress={() => handleProfilePress(user.id)}>
                    <HStack className="items-center" space="xs">
                      <Text className="text-[13px] font-semibold text-brand-light" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {user.username}
                      </Text>
                      {user.verified && <BadgeCheck size={11} color="#0095F6" fill="#0095F6" />}
                    </HStack>
                    <Text className="text-[11px] text-brand-muted" numberOfLines={1}>
                      {user.display_name}
                    </Text>
                  </Pressable>
                </VStack>
                <Pressable
                  onPress={() => handleFollow(user.id)}
                  className={`rounded-lg px-3 py-1.5 ${
                    user.isFollowing ? 'border border-brand-border' : 'bg-brand-blue'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${user.isFollowing ? 'text-brand-light' : 'text-white'}`}>
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </HStack>
            ))}
          </VStack>

          <Divider className="bg-brand-border" />

          {/* Trending */}
          {trending.length > 0 && (
            <VStack space="sm" className="px-2">
              <HStack className="items-center" space="xs">
                <TrendingUp size={14} color="#999999" />
                <Text className="text-sm font-semibold text-brand-muted">Trending</Text>
              </HStack>

              {trending.map((item, idx) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/thread/${item.id}`)}
                    className="rounded-lg p-2 active:bg-white/5"
                  >
                    <HStack className="items-start" space="sm">
                      <Text className="text-xs font-bold text-brand-muted">{idx + 1}</Text>
                      <VStack className="min-w-0 flex-1" space="xs">
                        <Text className="text-[13px] text-brand-light" numberOfLines={2}>
                          {item.content.slice(0, 80)}
                          {item.content.length > 80 ? '...' : ''}
                        </Text>
                        <HStack className="items-center" space="xs">
                          <Text className="text-[11px] text-brand-muted">
                            @{item.author_username}
                          </Text>
                          {item.category && (
                            <>
                              <Text className="text-[11px] text-brand-muted">·</Text>
                              <Text className="text-[11px] text-brand-muted">
                                {item.category}
                              </Text>
                            </>
                          )}
                        </HStack>
                      </VStack>
                    </HStack>
                  </Pressable>
              ))}
            </VStack>
          )}

          <Divider className="bg-brand-border" />

          {/* Footer */}
          <VStack className="px-2 pt-2" space="xs">
            <Text className="text-2xs text-brand-muted/50">
              About · Help · Press · API · Jobs · Privacy · Terms
            </Text>
            <Text className="text-2xs text-brand-muted/50">
              © 2026 Sysm from Meta
            </Text>
          </VStack>
        </VStack>
      </View>
    </View>
  );
}
