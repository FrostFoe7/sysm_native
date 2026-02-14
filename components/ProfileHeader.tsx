// components/ProfileHeader.tsx

import React from 'react';
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
    <VStack className="px-4 pb-2 pt-4">
      {/* Top row: name + avatar */}
      <HStack className="mb-3 items-start justify-between">
        <VStack className="mr-4 flex-1 overflow-hidden" space="xs">
          <Heading
            size="xl"
            className="font-bold text-[#f3f5f7]"
            numberOfLines={1}
            style={{ overflow: 'hidden' }}
          >
            {user.display_name}
          </Heading>
          <HStack className="items-center" space="xs">
            <Text className="text-[15px] text-[#f3f5f7]" numberOfLines={1} style={{ flexShrink: 1 }}>
              {user.username}
            </Text>
            {user.verified && (
              <BadgeCheck size={14} color="#0095f6" fill="#0095f6" strokeWidth={0} />
            )}
            <Box className="ml-1 shrink-0 rounded-full bg-[#1e1e1e] px-2 py-0.5">
              <Text className="text-[11px] text-[#555555]">threads.net</Text>
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
        <Text className="mb-3 text-[15px] leading-[21px] text-[#f3f5f7]" numberOfLines={5}>
          {user.bio}
        </Text>
      )}

      {/* Stats row */}
      <HStack className="mb-4 items-center" space="sm">
        <Text className="text-[14px] text-[#555555]">
          {formatCount(followerCount)} followers
        </Text>
        <Text className="text-[14px] text-[#555555]">·</Text>
        <HStack className="items-center" space="xs">
          <Globe size={13} color="#555555" strokeWidth={1.8} />
          <Text className="text-[14px] text-[#555555]">{user.username}</Text>
        </HStack>
      </HStack>

      {/* Action buttons */}
      <HStack className="mb-2" space="sm">
        {isCurrentUser ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-lg border-[#333333] bg-transparent"
              onPress={onEditProfile}
            >
              <ButtonText className="text-[14px] font-semibold text-[#f3f5f7]">
                Edit profile
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-lg border-[#333333] bg-transparent"
            >
              <ButtonText className="text-[14px] font-semibold text-[#f3f5f7]">
                Share profile
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
                  isFollowing ? 'text-[#f3f5f7]' : 'text-black'
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
              <ButtonText className="text-[14px] font-semibold text-[#f3f5f7]">
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
