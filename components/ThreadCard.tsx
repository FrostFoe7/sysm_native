// components/ThreadCard.tsx

import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';
import { ActionRow } from '@/components/ActionRow';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MediaGallery } from '@/components/MediaGallery';
import { FullscreenMediaViewer } from '@/components/FullscreenMediaViewer';
import { formatRelativeTime, formatCount } from '@/services/format';
import type { ThreadWithAuthor } from '@/types/types';
import { VerifiedIcon, RepostIcon, MoreIcon } from '@/constants/icons';

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
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

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
        <HStack className="items-center px-4 pl-[60px] pt-2" space="xs">
          <RepostIcon size={13} color="#555555" />
          <Text className="text-[13px] text-brand-muted" numberOfLines={1}>
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
            </Avatar>
          </Pressable>
          {thread.reply_count > 0 && !isDetailView && (
            <View className="mt-2 min-h-[20px] w-[2px] flex-1 rounded-full bg-brand-border-secondary" />
          )}
        </VStack>

        {/* Right column: content */}
        <VStack className="flex-1 shrink" space="xs">
          {/* Header row */}
          <HStack className="items-center justify-between">
            <HStack className="mr-2 flex-1 items-center overflow-hidden" space="xs">
              <Pressable onPress={handleUsernamePress} style={{ flexShrink: 1 }}>
                <Text className="text-[15px] font-semibold text-brand-light" numberOfLines={1}>
                  {thread.author.username}
                </Text>
              </Pressable>
              {thread.author.verified && (
                <VerifiedIcon size={14} color="#0095f6" />
              )}
            </HStack>
            <HStack className="shrink-0 items-center" space="sm">
              <Text className="text-[13px] text-brand-muted">
                {formatRelativeTime(thread.created_at)}
              </Text>
              <Pressable
                hitSlop={10}
                className="-mr-1 rounded-full p-1 active:bg-white/5"
                onPress={handleMore}
              >
                <MoreIcon size={16} color="#555555" />
              </Pressable>
            </HStack>
          </HStack>

          {/* Content */}
          <Text
            className="text-[15px] leading-[21px] text-brand-light"
            numberOfLines={isDetailView ? undefined : 12}
            style={{ overflow: 'hidden' }}
          >
            {thread.content}
          </Text>

          {/* Media gallery */}
          {thread.media && thread.media.length > 0 && (
            <View className="mt-2">
              <MediaGallery
                media={thread.media}
                onMediaPress={(index) => {
                  setMediaViewerIndex(index);
                  setMediaViewerOpen(true);
                }}
                maxHeight={isDetailView ? 400 : 280}
              />
            </View>
          )}

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
              <Text className="text-[13px] text-brand-muted">
                {formatCount(thread.reply_count)}{' '}
                <Text className="text-[13px] text-brand-muted">
                  {thread.reply_count === 1 ? 'reply' : 'replies'}
                </Text>
              </Text>
              <Text className="text-[13px] text-brand-muted">·</Text>
              <Text className="text-[13px] text-brand-muted">
                {formatCount(thread.like_count)}{' '}
                <Text className="text-[13px] text-brand-muted">
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

      {showDivider && <Divider className="ml-[60px] bg-brand-border" />}

      {/* Fullscreen media viewer */}
      {thread.media && thread.media.length > 0 && (
        <FullscreenMediaViewer
          isOpen={mediaViewerOpen}
          media={thread.media}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerOpen(false)}
        />
      )}
    </View>
  );
}
