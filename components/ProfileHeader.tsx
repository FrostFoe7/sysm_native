// components/ProfileHeader.tsx

import React from 'react';
import { Pressable } from 'react-native';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Box } from '@/components/ui/box';
import { formatCount } from '@/services/format';
import { BadgeCheck } from 'lucide-react-native';
import type { User } from '@/types/types';

interface ProfileHeaderProps {
  user: User;
  threadCount: number;
  followerCount: number;
  followingCount: number;
  isCurrentUser: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onEditProfile?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export function ProfileHeader({
  user,
  threadCount,
  followerCount,
  followingCount,
  isCurrentUser,
  isFollowing = false,
  onFollowToggle,
  onEditProfile,
  onFollowersPress,
  onFollowingPress,
}: ProfileHeaderProps) {
  return (
    <VStack className="w-full flex-shrink-0 px-4 pt-4 pb-4" space="md">
      {/* Top row: name + avatar */}
      <HStack className="items-start justify-between w-full gap-3">
        <VStack className="flex-1 gap-1">
          <Heading
            size="xl"
            className="font-bold text-brand-light"
            numberOfLines={1}
          >
            {user.display_name}
          </Heading>
          <HStack className="items-center gap-1 flex-wrap">
            <Text className="text-[15px] text-brand-light" numberOfLines={1}>
              @{user.username}
            </Text>
            {user.verified && (
              <BadgeCheck size={14} color="brand-blue" fill="brand-blue" strokeWidth={0} />
            )}
            <Box className="rounded-full bg-brand-border px-2 py-0.5">
              <Text className="text-[11px] text-brand-muted">threads.net</Text>
            </Box>
          </HStack>
        </VStack>

        <Avatar size="lg">
          <AvatarImage source={{ uri: user.avatar_url }} />
        </Avatar>
      </HStack>

      {/* Bio */}
      {user.bio.length > 0 && (
        <Text className="text-[15px] leading-[21px] text-brand-light">
          {user.bio}
        </Text>
      )}

      {/* Stats row */}
      <HStack className="items-center gap-2">
        <Pressable onPress={onFollowersPress} hitSlop={8}>
          <Text className="text-[13px] text-brand-muted-alt">
            <Text className="font-semibold text-brand-light">{formatCount(followerCount)}</Text> followers
          </Text>
        </Pressable>
        <Text className="text-[13px] text-brand-muted-alt">·</Text>
        <Pressable onPress={onFollowingPress} hitSlop={8}>
          <Text className="text-[13px] text-brand-muted-alt">
            <Text className="font-semibold text-brand-light">{formatCount(followingCount)}</Text> following
          </Text>
        </Pressable>
      </HStack>

      {/* Action buttons */}
      <HStack className="w-full gap-2">
        {isCurrentUser ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-lg border-[#333333] bg-transparent"
              onPress={onEditProfile}
            >
              <ButtonText className="text-[14px] font-semibold text-brand-light">
                Edit profile
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-lg border-[#333333] bg-transparent"
            >
              <ButtonText className="text-[14px] font-semibold text-brand-light">
                Share
              </ButtonText>
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              className={`h-9 flex-1 rounded-lg ${
                isFollowing
                  ? 'border border-[#333333] bg-transparent'
                  : 'bg-white'
              }`}
              onPress={onFollowToggle}
            >
              <ButtonText
                className={`text-[14px] font-semibold ${
                  isFollowing ? 'text-brand-light' : 'text-black'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-lg border-[#333333] bg-transparent"
            >
              <ButtonText className="text-[14px] font-semibold text-brand-light">
                Mention
              </ButtonText>
            </Button>
          </>
        )}
      </HStack>

      <Divider className="bg-brand-border" />
    </VStack>
  );
}
