// components/ThreadCard.tsx

import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';
import { ActionRow } from '@/components/ActionRow';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { formatRelativeTime, formatCount } from '@/db/selectors';
import type { ThreadWithAuthor } from '@/db/db';
import { BadgeCheck, MoreHorizontal, Repeat2 } from 'lucide-react-native';

interface ThreadCardProps {
  thread: ThreadWithAuthor;
  isLiked: boolean;
  isReposted?: boolean;
  onLike: (threadId: string) => void;
  onReply?: (threadId: string) => void;
  onRepost?: (threadId: string) => void;
  onShare?: (threadId: string) => void;
  onMorePress?: (threadId: string) => void;
  showDivider?: boolean;
  isDetailView?: boolean;
}

export function ThreadCard({
  thread,
  isLiked,
  isReposted = false,
  onLike,
  onReply,
  onRepost,
  onShare,
  onMorePress,
  showDivider = true,
  isDetailView = false,
}: ThreadCardProps) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    if (!isDetailView) {
      router.push(`/thread/${thread.id}`);
    }
  }, [thread.id, isDetailView, router]);

  const handleAvatarPress = useCallback(() => {
    router.push(`/profile/${thread.author.id}`);
  }, [thread.author.id, router]);

  const handleUsernamePress = useCallback(() => {
    router.push(`/profile/${thread.author.id}`);
  }, [thread.author.id, router]);

  const handleLike = useCallback(() => {
    onLike(thread.id);
  }, [thread.id, onLike]);

  const handleReply = useCallback(() => {
    if (onReply) {
      onReply(thread.id);
    } else {
      router.push(`/thread/${thread.id}`);
    }
  }, [thread.id, onReply, router]);

  const handleRepost = useCallback(() => {
    onRepost?.(thread.id);
  }, [thread.id, onRepost]);

  const handleShare = useCallback(() => {
    onShare?.(thread.id);
  }, [thread.id, onShare]);

  const handleMore = useCallback(() => {
    onMorePress?.(thread.id);
  }, [thread.id, onMorePress]);

  const cardContent = (
    <VStack>
      {/* Reposted by header */}
      {thread.reposted_by && (
        <HStack className="items-center px-4 pt-2 pl-[60px]" space="xs">
          <Repeat2 size={13} color="#555555" strokeWidth={2} />
          <Text className="text-[#555555] text-[13px]">
            {thread.reposted_by.display_name} reposted
          </Text>
        </HStack>
      )}

      <HStack className="px-4 py-3" space="md">
        {/* Left column: avatar + thread line */}
        <VStack className="items-center">
          <Pressable onPress={handleAvatarPress}>
            <Avatar size="sm">
              <AvatarImage source={{ uri: thread.author.avatar_url }} />
              <AvatarFallbackText>
                {thread.author.display_name}
              </AvatarFallbackText>
            </Avatar>
          </Pressable>
          {thread.reply_count > 0 && !isDetailView && (
            <View className="flex-1 w-[2px] bg-[#2a2a2a] mt-2 min-h-[20px] rounded-full" />
          )}
        </VStack>

        {/* Right column: content */}
        <VStack className="flex-1 flex-shrink" space="xs">
          {/* Header row */}
          <HStack className="items-center justify-between">
            <HStack className="items-center flex-1" space="xs">
              <Pressable onPress={handleUsernamePress}>
                <Text className="text-[#f3f5f7] font-semibold text-[15px]">
                  {thread.author.username}
                </Text>
              </Pressable>
              {thread.author.verified && (
                <BadgeCheck size={14} color="#0095f6" fill="#0095f6" strokeWidth={0} />
              )}
            </HStack>
            <HStack className="items-center" space="sm">
              <Text className="text-[#555555] text-[13px]">
                {formatRelativeTime(thread.created_at)}
              </Text>
              <Pressable
                hitSlop={10}
                className="p-1 -mr-1 rounded-full active:bg-white/5"
                onPress={handleMore}
              >
                <MoreHorizontal size={16} color="#555555" />
              </Pressable>
            </HStack>
          </HStack>

          {/* Content */}
          <Text
            className={`text-[#f3f5f7] text-[15px] leading-[21px] ${
              isDetailView ? '' : 'pr-2'
            }`}
          >
            {thread.content}
          </Text>

          {/* Action row */}
          <ActionRow
            likeCount={thread.like_count}
            replyCount={thread.reply_count}
            repostCount={thread.repost_count}
            isLiked={isLiked}
            isReposted={isReposted}
            onLike={handleLike}
            onReply={handleReply}
            onRepost={handleRepost}
            onShare={handleShare}
          />

          {/* Engagement summary for detail view */}
          {isDetailView && (
            <HStack className="mt-1" space="md">
              <Text className="text-[#555555] text-[13px]">
                {formatCount(thread.reply_count)}{' '}
                <Text className="text-[#555555] text-[13px]">
                  {thread.reply_count === 1 ? 'reply' : 'replies'}
                </Text>
              </Text>
              <Text className="text-[#555555] text-[13px]">·</Text>
              <Text className="text-[#555555] text-[13px]">
                {formatCount(thread.like_count)}{' '}
                <Text className="text-[#555555] text-[13px]">
                  {thread.like_count === 1 ? 'like' : 'likes'}
                </Text>
              </Text>
            </HStack>
          )}
        </VStack>
      </HStack>
    </VStack>
  );

  return (
    <View>
      {isDetailView ? (
        <View>{cardContent}</View>
      ) : (
        <AnimatedPressable onPress={handlePress} scaleValue={0.985}>
          {cardContent}
        </AnimatedPressable>
      )}

      {showDivider && <Divider className="bg-[#1e1e1e] ml-[60px]" />}
    </View>
  );
}
