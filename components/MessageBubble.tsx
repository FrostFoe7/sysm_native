// components/MessageBubble.tsx

import React, { useCallback, useState } from 'react';
import { Pressable, View, Image } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, Reply, CornerUpLeft } from 'lucide-react-native';
import { formatRelativeTime } from '@/db/selectors';
import { REACTION_EMOJIS } from '@/constants/app';
import { CURRENT_USER_ID } from '@/constants/app';
import type { MessageWithSender } from '@/types/types';

interface MessageBubbleProps {
  message: MessageWithSender;
  isGroupChat: boolean;
  showAvatar: boolean;    // show sender avatar (for consecutive msgs from same sender)
  showTimestamp: boolean;  // show time for first/last in a cluster
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onImagePress?: (url: string) => void;
  onThreadPress?: (threadId: string) => void;
  onReelPress?: (reelId: string) => void;
  onProfilePress?: (userId: string) => void;
}

export function MessageBubble({
  message,
  isGroupChat,
  showAvatar,
  showTimestamp,
  onReply,
  onReaction,
  onImagePress,
  onThreadPress,
  onReelPress,
  onProfilePress,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const isMe = message.sender_id === CURRENT_USER_ID;
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <View className="items-center px-4 py-2">
        <Text className="text-center text-[12px] text-brand-muted">
          {message.content}
        </Text>
      </View>
    );
  }

  if (message.is_deleted) {
    return (
      <View className={`flex-row px-4 py-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <View className="rounded-2xl border border-brand-border-secondary px-4 py-2">
          <Text className="text-[13px] italic text-brand-muted">
            Message deleted
          </Text>
        </View>
      </View>
    );
  }

  const handleLongPress = useCallback(() => {
    setShowReactions(!showReactions);
  }, [showReactions]);

  const handleReaction = useCallback(
    (emoji: string) => {
      onReaction?.(message.id, emoji);
      setShowReactions(false);
    },
    [message.id, onReaction],
  );

  // Check if current user has reacted with this emoji
  const hasReacted = (emoji: string) =>
    message.reactions.some((r) => r.user_id === CURRENT_USER_ID && r.emoji === emoji);

  // Aggregate reactions
  const reactionCounts = message.reactions.reduce(
    (acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const bubbleBg = isMe ? 'bg-brand-blue' : 'bg-[#262626]';
  const textColor = isMe ? 'text-white' : 'text-brand-light';
  const replyTextColor = isMe ? 'text-white/60' : 'text-[#777]';

  return (
    <View className="px-4 py-[2px]">
      {/* Reaction picker */}
      {showReactions && (
        <View className={`mb-1 flex-row ${isMe ? 'justify-end' : isGroupChat && showAvatar ? 'ml-10 justify-start' : 'justify-start'}`}>
          <HStack className="rounded-full bg-[#262626] px-2 py-1" space="xs">
            {REACTION_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => handleReaction(emoji)}
                className={`rounded-full px-1.5 py-0.5 ${hasReacted(emoji) ? 'bg-white/10' : ''}`}
              >
                <Text className="text-[18px]">{emoji}</Text>
              </Pressable>
            ))}
          </HStack>
        </View>
      )}

      <View className={`flex-row items-end ${isMe ? 'justify-end' : 'justify-start'}`}>
        {/* Avatar for group chats (received msgs) */}
        {!isMe && isGroupChat && (
          <Pressable
            className="mb-1 mr-2"
            onPress={() => onProfilePress?.(message.sender_id)}
          >
            {showAvatar ? (
              <Avatar size="xs" className="h-[28px] w-[28px]">
                <AvatarImage source={{ uri: message.sender.avatar_url }} />
              </Avatar>
            ) : (
              <View className="w-[28px]" />
            )}
          </Pressable>
        )}

        <View style={{ maxWidth: '75%' }}>
          {/* Sender name in group chats */}
          {!isMe && isGroupChat && showAvatar && (
            <HStack className="mb-0.5 ml-3 items-center" space="xs">
              <Text className="text-[11px] font-semibold text-[#777]">
                {message.sender.display_name}
              </Text>
              {message.sender.verified && (
                <BadgeCheck size={10} color="brand-blue" fill="brand-blue" />
              )}
            </HStack>
          )}

          {/* Reply preview */}
          {message.replyTo && (
            <View
              className={`mb-0.5 ml-3 mr-3 rounded-t-xl border-l-2 border-brand-blue px-3 py-1 ${isMe ? 'bg-[#0077cc]' : 'bg-brand-border'}`}
            >
              <Text className={`text-[11px] font-semibold ${replyTextColor}`} numberOfLines={1}>
                {message.replyTo.sender.display_name}
              </Text>
              <Text className={`text-[11px] ${replyTextColor}`} numberOfLines={1}>
                {message.replyTo.content}
              </Text>
            </View>
          )}

          <Pressable
            onLongPress={handleLongPress}
            className={`rounded-2xl px-3.5 py-2.5 ${bubbleBg} ${
              message.replyTo ? 'rounded-t-lg' : ''
            }`}
          >
            {/* Text message */}
            {message.type === 'text' && (
              <Text className={`text-[15px] leading-5 ${textColor}`}>
                {message.content}
              </Text>
            )}

            {/* Image message */}
            {message.type === 'image' && (
              <Pressable onPress={() => message.media_url && onImagePress?.(message.media_url)}>
                {message.content ? (
                  <Text className={`mb-2 text-[15px] leading-5 ${textColor}`}>
                    {message.content}
                  </Text>
                ) : null}
                <Image
                  source={{ uri: message.media_url ?? '' }}
                  className="h-[200px] w-[250px] rounded-xl"
                  resizeMode="cover"
                />
              </Pressable>
            )}

            {/* Video message */}
            {message.type === 'video' && (
              <View>
                {message.content ? (
                  <Text className={`mb-2 text-[15px] leading-5 ${textColor}`}>
                    {message.content}
                  </Text>
                ) : null}
                <View className="h-[200px] w-[250px] items-center justify-center rounded-xl bg-black">
                  <Image
                    source={{ uri: message.media_thumbnail ?? message.media_url ?? '' }}
                    className="h-full w-full rounded-xl"
                    resizeMode="cover"
                  />
                  <View className="absolute items-center justify-center rounded-full bg-black/50 p-3">
                    <Text className="text-[20px] text-white">▶</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Thread share */}
            {message.type === 'thread_share' && message.sharedThread && (
              <Pressable onPress={() => message.shared_thread_id && onThreadPress?.(message.shared_thread_id)}>
                {message.content ? (
                  <Text className={`mb-2 text-[15px] leading-5 ${textColor}`}>
                    {message.content}
                  </Text>
                ) : null}
                <View className={`rounded-xl border p-3 ${isMe ? 'border-white/20 bg-white/10' : 'border-[#333] bg-[#1a1a1a]'}`}>
                  <HStack className="mb-1 items-center" space="xs">
                    <Avatar size="xs" className="h-[18px] w-[18px]">
                      <AvatarImage source={{ uri: message.sharedThread.author.avatar_url }} />
                    </Avatar>
                    <Text className={`text-[12px] font-semibold ${isMe ? 'text-white/80' : 'text-[#999]'}`}>
                      {message.sharedThread.author.username}
                    </Text>
                  </HStack>
                  <Text className={`text-[13px] ${isMe ? 'text-white/90' : 'text-[#ccc]'}`} numberOfLines={3}>
                    {message.sharedThread.content}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Reel share */}
            {message.type === 'reel_share' && message.sharedReel && (
              <Pressable onPress={() => message.shared_reel_id && onReelPress?.(message.shared_reel_id)}>
                {message.content ? (
                  <Text className={`mb-2 text-[15px] leading-5 ${textColor}`}>
                    {message.content}
                  </Text>
                ) : null}
                <View className={`rounded-xl border p-2 ${isMe ? 'border-white/20 bg-white/10' : 'border-[#333] bg-[#1a1a1a]'}`}>
                  <HStack className="items-center" space="sm">
                    <Image
                      source={{ uri: message.sharedReel.thumbnailUrl }}
                      className="h-[72px] w-[54px] rounded-lg"
                      resizeMode="cover"
                    />
                    <VStack className="flex-1">
                      <HStack className="items-center" space="xs">
                        <Avatar size="xs" className="h-[16px] w-[16px]">
                          <AvatarImage source={{ uri: message.sharedReel.author.avatar_url }} />
                        </Avatar>
                        <Text className={`text-[12px] font-semibold ${isMe ? 'text-white/80' : 'text-[#999]'}`}>
                          {message.sharedReel.author.username}
                        </Text>
                      </HStack>
                      <Text className={`mt-0.5 text-[12px] ${isMe ? 'text-white/70' : 'text-[#777]'}`} numberOfLines={2}>
                        {message.sharedReel.caption}
                      </Text>
                    </VStack>
                  </HStack>
                </View>
              </Pressable>
            )}

            {/* Voice note */}
            {message.type === 'voice_note' && (
              <HStack className="items-center" space="sm">
                <View className="size-8 items-center justify-center rounded-full bg-white/20">
                  <Text className="text-[14px]">▶</Text>
                </View>
                <View className="h-[4px] flex-1 rounded-full bg-white/30">
                  <View className="h-full w-[60%] rounded-full bg-white/70" />
                </View>
                <Text className={`text-[11px] ${isMe ? 'text-white/60' : 'text-[#777]'}`}>
                  0:12
                </Text>
              </HStack>
            )}
          </Pressable>

          {/* Reactions display */}
          {Object.keys(reactionCounts).length > 0 && (
            <HStack
              className={`-mt-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'} ${isMe ? 'mr-2' : 'ml-2'}`}
              space="xs"
            >
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <Pressable
                  key={emoji}
                  onPress={() => onReaction?.(message.id, emoji)}
                  className={`flex-row items-center rounded-full border px-1.5 py-0.5 ${
                    hasReacted(emoji) ? 'border-brand-blue bg-brand-blue/20' : 'border-[#333] bg-brand-border'
                  }`}
                >
                  <Text className="text-[12px]">{emoji}</Text>
                  {count > 1 && (
                    <Text className="ml-0.5 text-[10px] text-[#999]">{count}</Text>
                  )}
                </Pressable>
              ))}
            </HStack>
          )}

          {/* Timestamp + delivery status */}
          {showTimestamp && (
            <HStack
              className={`mt-0.5 items-center ${isMe ? 'justify-end pr-1' : isGroupChat ? 'pl-1' : 'pl-1'}`}
              space="xs"
            >
              <Text className="text-[10px] text-brand-muted">
                {formatRelativeTime(message.created_at)}
              </Text>
              {isMe && (
                <Text className="text-[10px] text-brand-muted">
                  {message.status === 'sending'
                    ? '○'
                    : message.status === 'sent'
                      ? '✓'
                      : message.status === 'delivered'
                        ? '✓✓'
                        : '✓✓'}
                </Text>
              )}
              {isMe && message.status === 'seen' && (
                <Text className="text-[10px] text-brand-blue">✓✓</Text>
              )}
            </HStack>
          )}
        </View>

        {/* Reply swipe icon (visual) */}
        {!isMe && (
          <Pressable
            onPress={() => onReply?.(message.id)}
            className="mb-2 ml-2 opacity-0 active:opacity-100"
          >
            <CornerUpLeft size={16} color="brand-muted" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Date Separator ─────────────────────────────────────────────────────────────

export function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (d.toDateString() === today.toDateString()) {
    label = 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    label = 'Yesterday';
  } else {
    label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <View className="items-center py-3">
      <View className="rounded-full bg-brand-border px-3 py-1">
        <Text className="text-[11px] font-medium text-[#777]">{label}</Text>
      </View>
    </View>
  );
}
