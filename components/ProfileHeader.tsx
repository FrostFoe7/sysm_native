// components/ProfileHeader.tsx

import React from "react";
import { Pressable } from "react-native";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Box } from "@/components/ui/box";
import { formatCount } from "@/services/format";
import {
  VerifiedIcon,
  EditIcon,
  ShareIcon,
  FollowIcon,
  FollowingIcon,
  MessageIcon,
} from "@/constants/icons";
import type { User } from "@/types/types";

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
  onMessagePress?: () => void;
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
  onMessagePress,
}: ProfileHeaderProps) {
  return (
    <VStack className="w-full shrink-0 px-4 pb-4 pt-2" space="md">
      {/* Top row: name + avatar */}
      <HStack className="w-full items-start justify-between">
        <VStack className="flex-1 gap-1">
          <Heading
            size="2xl"
            className="text-[24px] font-bold tracking-tight text-brand-light"
            numberOfLines={1}
          >
            {user.display_name}
          </Heading>
          <HStack className="items-center gap-1.5">
            <Text className="text-[15px] text-brand-light" numberOfLines={1}>
              {user.username}
            </Text>
            {user.verified && <VerifiedIcon size={14} color="#0095f6" />}
            <Box className="rounded-full bg-brand-border-secondary px-2 py-0.5">
              <Text className="text-[11px] font-medium text-brand-muted">
                threads.net
              </Text>
            </Box>
          </HStack>
        </VStack>

        <Avatar size="xl">
          <AvatarImage source={{ uri: user.avatar_url }} />
        </Avatar>
      </HStack>

      {/* Bio */}
      {user.bio && user.bio.length > 0 && (
        <Text className="text-[15px] leading-[21px] text-brand-light">
          {user.bio}
        </Text>
      )}

      {/* Stats row */}
      <HStack className="items-center gap-2">
        <Pressable onPress={onFollowersPress} hitSlop={8} className="active:opacity-60">
          <Text className="text-[14px] text-brand-muted">
            {formatCount(followerCount)} followers
          </Text>
        </Pressable>
      </HStack>

      {/* Action buttons */}
      <HStack className="mt-2 w-full gap-3">
        {isCurrentUser ? (
          <>
            <Button
              variant="outline"
              size="md"
              className="h-[36px] flex-1 items-center justify-center rounded-xl border-brand-border-secondary bg-transparent active:bg-white/5"
              onPress={onEditProfile}
            >
              <ButtonText className="text-[14px] font-bold text-brand-light">
                Edit profile
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              size="md"
              className="h-[36px] flex-1 items-center justify-center rounded-xl border-brand-border-secondary bg-transparent active:bg-white/5"
            >
              <ButtonText className="text-[14px] font-bold text-brand-light">
                Share profile
              </ButtonText>
            </Button>
          </>
        ) : (
          <>
            <Button
              size="md"
              className={`h-[36px] flex-1 items-center justify-center rounded-xl ${
                isFollowing
                  ? "border border-brand-border-secondary bg-transparent active:bg-white/5"
                  : "bg-brand-light active:opacity-90"
              }`}
              onPress={onFollowToggle}
            >
              <ButtonText
                className={`text-[14px] font-bold ${
                  isFollowing ? "text-brand-light" : "text-brand-dark"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              size="md"
              className="h-[36px] flex-1 items-center justify-center rounded-xl border-brand-border-secondary bg-transparent active:bg-white/5"
              onPress={onMessagePress}
            >
              <ButtonText className="text-[14px] font-bold text-brand-light">
                Message
              </ButtonText>
            </Button>
          </>
        )}
      </HStack>
    </VStack>
  );
}
