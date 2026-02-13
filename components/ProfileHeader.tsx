// components/ProfileHeader.tsx

import React from 'react';
import { Pressable, Platform } from 'react-native';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Box } from '@/components/ui/box';
import { formatCount } from '@/db/selectors';
import { BadgeCheck, Globe } from 'lucide-react-native';
import type { User } from '@/db/db';

interface ProfileHeaderProps {
  user: User;
  threadCount: number;
  followerCount: number;
  followingCount: number;
  isCurrentUser: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onEditProfile?: () => void;
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
}: ProfileHeaderProps) {
  return (
    <VStack className="px-4 pt-4 pb-2">
      {/* Top row: name + avatar */}
      <HStack className="items-start justify-between mb-3">
        <VStack className="flex-1 mr-4" space="xs">
          <Heading size="xl" className="text-[#f3f5f7] font-bold">
            {user.display_name}
          </Heading>
          <HStack className="items-center" space="xs">
            <Text className="text-[#f3f5f7] text-[15px]">
              {user.username}
            </Text>
            {user.verified && (
              <BadgeCheck size={14} color="#0095f6" fill="#0095f6" strokeWidth={0} />
            )}
            <Box className="bg-[#1e1e1e] rounded-full px-2 py-0.5 ml-1">
              <Text className="text-[#555555] text-[11px]">threads.net</Text>
            </Box>
          </HStack>
        </VStack>

        <Avatar size="lg">
          <AvatarImage source={{ uri: user.avatar_url }} />
          <AvatarFallbackText>{user.display_name}</AvatarFallbackText>
        </Avatar>
      </HStack>

      {/* Bio */}
      {user.bio.length > 0 && (
        <Text className="text-[#f3f5f7] text-[15px] leading-[21px] mb-3">
          {user.bio}
        </Text>
      )}

      {/* Stats row */}
      <HStack className="items-center mb-4" space="sm">
        <Text className="text-[#555555] text-[14px]">
          {formatCount(followerCount)} followers
        </Text>
        <Text className="text-[#555555] text-[14px]">·</Text>
        <HStack className="items-center" space="xs">
          <Globe size={13} color="#555555" strokeWidth={1.8} />
          <Text className="text-[#555555] text-[14px]">{user.username}</Text>
        </HStack>
      </HStack>

      {/* Action buttons */}
      <HStack className="mb-2" space="sm">
        {isCurrentUser ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg border-[#333333] bg-transparent h-9"
              onPress={onEditProfile}
            >
              <ButtonText className="text-[#f3f5f7] text-[14px] font-semibold">
                Edit profile
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg border-[#333333] bg-transparent h-9"
            >
              <ButtonText className="text-[#f3f5f7] text-[14px] font-semibold">
                Share profile
              </ButtonText>
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              className={`flex-1 rounded-lg h-9 ${
                isFollowing
                  ? 'bg-transparent border border-[#333333]'
                  : 'bg-white'
              }`}
              onPress={onFollowToggle}
            >
              <ButtonText
                className={`text-[14px] font-semibold ${
                  isFollowing ? 'text-[#f3f5f7]' : 'text-black'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg border-[#333333] bg-transparent h-9"
            >
              <ButtonText className="text-[#f3f5f7] text-[14px] font-semibold">
                Mention
              </ButtonText>
            </Button>
          </>
        )}
      </HStack>

      <Divider className="bg-[#1e1e1e]" />
    </VStack>
  );
}
