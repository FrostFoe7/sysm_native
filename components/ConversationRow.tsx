// components/ConversationRow.tsx

import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Divider } from '@/components/ui/divider';
import { BadgeCheck, BellOff, Pin, Volume2 } from 'lucide-react-native';
import { formatRelativeTime, formatMessagePreview } from '@/db/selectors';
import type { ConversationWithDetails } from '@/types/types';

interface ConversationRowProps {
  conversation: ConversationWithDetails;
  onPress: (conversationId: string) => void;
  onLongPress?: (conversationId: string) => void;
}

export function ConversationRow({ conversation, onPress, onLongPress }: ConversationRowProps) {
  const { conversation: conv, otherUsers, lastMessage, unreadCount, typingUsers } = conversation;
  const isGroup = conv.type === 'group';
  const hasUnread = unreadCount > 0;
  const isTyping = typingUsers.length > 0;

  // Display info
  const displayName = isGroup
    ? conv.name ?? 'Group'
    : otherUsers[0]?.display_name ?? 'Unknown';
  const displayAvatar = isGroup
    ? conv.avatar_url ?? 'https://i.pravatar.cc/150?u=group'
    : otherUsers[0]?.avatar_url ?? '';
  const isVerified = !isGroup && otherUsers[0]?.verified;

  const handlePress = useCallback(() => {
    onPress(conv.id);
  }, [conv.id, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(conv.id);
  }, [conv.id, onLongPress]);

  // Typing indicator text
  const typingText = isTyping
    ? isGroup
      ? `${typingUsers.map((u) => u.display_name.split(' ')[0]).join(', ')} typing...`
      : 'typing...'
    : null;

  // Last message preview
  const lastMessageText = lastMessage ? formatMessagePreview(lastMessage) : '';
  const lastMessageTime = lastMessage ? formatRelativeTime(lastMessage.created_at) : '';
  const isLastMessageFromMe = lastMessage?.sender_id === 'u-000';

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      className="active:bg-white/5"
    >
      <HStack className="px-4 py-3" space="md">
        {/* Avatar */}
        <View className="relative">
          <Avatar size="md" className="h-[52px] w-[52px]">
            <AvatarImage source={{ uri: displayAvatar }} />
          </Avatar>
          {/* Online indicator for 1:1 */}
          {!isGroup && (
            <View className="absolute -bottom-0.5 -right-0.5 size-[14px] rounded-full border-2 border-[#101010] bg-[#00c853]" />
          )}
          {/* Group member count badge */}
          {isGroup && (
            <View className="absolute -bottom-0.5 -right-0.5 min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-[#101010] bg-[#333] px-1">
              <Text className="text-[9px] font-bold text-[#f3f5f7]">
                {conversation.participants.length}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <VStack className="flex-1 justify-center" space="xs">
          <HStack className="items-center justify-between">
            <HStack className="flex-1 items-center" space="xs">
              <Text
                className={`text-[15px] ${hasUnread ? 'font-bold text-[#f3f5f7]' : 'font-semibold text-[#f3f5f7]'}`}
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {displayName}
              </Text>
              {isVerified && (
                <BadgeCheck size={14} color="#0095f6" fill="#0095f6" />
              )}
              {conv.is_muted && (
                <BellOff size={12} color="#555555" />
              )}
              {conv.is_pinned && (
                <Pin size={12} color="#555555" fill="#555555" />
              )}
            </HStack>
            <Text className="ml-2 shrink-0 text-[12px] text-[#555555]">
              {lastMessageTime}
            </Text>
          </HStack>
          <HStack className="items-center justify-between">
            <Text
              className={`flex-1 text-[13px] ${hasUnread ? 'font-medium text-[#999]' : 'text-[#555555]'}`}
              numberOfLines={1}
            >
              {typingText ? (
                <Text className="text-[13px] font-medium text-[#0095f6]">{typingText}</Text>
              ) : isLastMessageFromMe ? (
                `You: ${lastMessageText}`
              ) : isGroup && lastMessage ? (
                `${lastMessage.sender.display_name.split(' ')[0]}: ${lastMessageText}`
              ) : (
                lastMessageText
              )}
            </Text>
            {hasUnread && (
              <View className="ml-2 min-w-[20px] items-center justify-center rounded-full bg-[#0095f6] px-[6px] py-[2px]">
                <Text className="text-[11px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </HStack>
        </VStack>
      </HStack>
      <Divider className="ml-[76px] bg-[#1e1e1e]" />
    </Pressable>
  );
}
