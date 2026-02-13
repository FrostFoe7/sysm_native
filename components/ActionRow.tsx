// components/ActionRow.tsx

import React from 'react';
import { Pressable } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { AnimatedHeart } from '@/components/AnimatedHeart';
import { MessageCircle, Repeat2, Send } from 'lucide-react-native';
import { formatCount } from '@/db/selectors';

interface ActionRowProps {
  likeCount: number;
  replyCount: number;
  repostCount: number;
  isLiked: boolean;
  onLike: () => void;
  onReply: () => void;
  onRepost?: () => void;
  onShare?: () => void;
}

export function ActionRow({
  likeCount,
  replyCount,
  repostCount,
  isLiked,
  onLike,
  onReply,
  onRepost,
  onShare,
}: ActionRowProps) {
  return (
    <HStack className="items-center mt-1 -ml-2" space="xs">
      {/* Like — animated bounce */}
      <HStack className="items-center">
        <AnimatedHeart isLiked={isLiked} onPress={onLike} />
        {likeCount > 0 && (
          <Text
            className={`text-[13px] -ml-1 ${
              isLiked ? 'text-[#ff3040]' : 'text-[#777777]'
            }`}
          >
            {formatCount(likeCount)}
          </Text>
        )}
      </HStack>

      {/* Reply */}
      <Pressable
        onPress={onReply}
        className="flex-row items-center p-2 rounded-full active:bg-white/5"
        hitSlop={8}
      >
        <MessageCircle size={19} color="#777777" strokeWidth={1.8} />
        {replyCount > 0 && (
          <Text className="text-[#777777] text-[13px] ml-1">
            {formatCount(replyCount)}
          </Text>
        )}
      </Pressable>

      {/* Repost */}
      <Pressable
        onPress={onRepost}
        className="flex-row items-center p-2 rounded-full active:bg-white/5"
        hitSlop={8}
      >
        <Repeat2 size={19} color="#777777" strokeWidth={1.8} />
        {repostCount > 0 && (
          <Text className="text-[#777777] text-[13px] ml-1">
            {formatCount(repostCount)}
          </Text>
        )}
      </Pressable>

      {/* Share */}
      <Pressable
        onPress={onShare}
        className="p-2 rounded-full active:bg-white/5"
        hitSlop={8}
      >
        <Send size={18} color="#777777" strokeWidth={1.8} />
      </Pressable>
    </HStack>
  );
}
