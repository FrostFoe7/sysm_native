// components/ActionRow.tsx

import React from "react";
import { Pressable } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { AnimatedHeart } from "@/components/AnimatedHeart";
import { ChatIcon, ShareIcon, RepostIcon } from "@/constants/icons";
import { formatCount } from "@/services/format";

interface ActionRowProps {
  likeCount: number;
  replyCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted?: boolean;
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
  isReposted = false,
  onLike,
  onReply,
  onRepost,
  onShare,
}: ActionRowProps) {
  const repostColor = isReposted ? "#00ba7c" : "#999999";

  return (
    <HStack className="-ml-2 mr-[-8px] mt-1 items-center" space="xs">
      {/* Like — animated bounce */}
      <HStack className="items-center">
        <AnimatedHeart isLiked={isLiked} onPress={onLike} />
        {likeCount > 0 && (
          <Text
            className={`-ml-1 text-[13px] ${
              isLiked ? "text-brand-red" : "text-brand-muted-alt"
            }`}
          >
            {formatCount(likeCount)}
          </Text>
        )}
      </HStack>

      {/* Reply */}
      <Pressable
        onPress={onReply}
        className="flex-row items-center rounded-full p-2 active:bg-white/5"
        hitSlop={8}
      >
        <ChatIcon size={19} color="#999999" />
        {replyCount > 0 && (
          <Text className="ml-1 text-[13px] text-brand-muted-alt">
            {formatCount(replyCount)}
          </Text>
        )}
      </Pressable>

      {/* Repost */}
      <Pressable
        onPress={onRepost}
        className="flex-row items-center rounded-full p-2 active:bg-white/5"
        hitSlop={8}
      >
        <RepostIcon size={19} color={repostColor} />
        {repostCount > 0 && (
          <Text style={{ color: repostColor }} className="ml-1 text-[13px]">
            {formatCount(repostCount)}
          </Text>
        )}
      </Pressable>

      {/* Share */}
      <Pressable
        onPress={onShare}
        className="rounded-full p-2 active:bg-white/5"
        hitSlop={8}
      >
        <ShareIcon size={18} color="#999999" />
      </Pressable>
    </HStack>
  );
}
