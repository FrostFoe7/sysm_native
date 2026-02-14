// components/skeletons.tsx

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';
import { BONE_COLOR } from '@/constants/ui';

// ─── Thread card skeleton ────────────────────────────

export function ThreadCardSkeleton({ showDivider = true, showMedia = false }: { showDivider?: boolean; showMedia?: boolean }) {
  return (
    <View>
      <HStack className="px-4 py-3" space="md">
        {/* Avatar */}
        <Skeleton variant="circular" className={`size-9 ${BONE_COLOR}`} />

        {/* Content */}
        <VStack className="flex-1" space="sm">
          {/* Username + timestamp */}
          <HStack className="items-center justify-between">
            <Skeleton variant="rounded" className={`h-[14px] w-[120px] ${BONE_COLOR}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[28px] ${BONE_COLOR}`} />
          </HStack>
          {/* Body lines */}
          <Skeleton variant="rounded" className={`h-[14px] w-full ${BONE_COLOR}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[85%] ${BONE_COLOR}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[55%] ${BONE_COLOR}`} />
          {/* Media placeholder */}
          {showMedia && (
            <Skeleton variant="rounded" className={`h-[180px] w-full rounded-xl ${BONE_COLOR}`} />
          )}
          {/* Action row */}
          <HStack className="mt-1 items-center" space="lg">
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
          </HStack>
        </VStack>
      </HStack>
      {showDivider && <Divider className="ml-[60px] bg-[#1e1e1e]" />}
    </View>
  );
}

// ─── Feed skeleton (multiple thread cards) ────────────

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ThreadCardSkeleton key={`feed-sk-${i}`} showDivider={i < count - 1} showMedia={i % 3 === 1} />
      ))}
    </View>
  );
}

// ─── Profile header skeleton ─────────────────────────

export function ProfileHeaderSkeleton({ isCurrentUser = true }: { isCurrentUser?: boolean }) {
  return (
    <VStack className="px-4 pb-2 pt-4">
      {/* Top row: name + avatar */}
      <HStack className="mb-3 items-start justify-between">
        <VStack className="mr-4 flex-1" space="sm">
          <Skeleton variant="rounded" className={`h-[22px] w-[160px] ${BONE_COLOR}`} />
          <HStack className="items-center" space="xs">
            <Skeleton variant="rounded" className={`h-[14px] w-[100px] ${BONE_COLOR}`} />
            <Skeleton variant="rounded" className={`h-[16px] w-[70px] rounded-full ${BONE_COLOR}`} />
          </HStack>
        </VStack>
        <Skeleton variant="circular" className={`size-[56px] ${BONE_COLOR}`} />
      </HStack>

      {/* Bio lines */}
      <VStack className="mb-3" space="xs">
        <Skeleton variant="rounded" className={`h-[14px] w-full ${BONE_COLOR}`} />
        <Skeleton variant="rounded" className={`h-[14px] w-[70%] ${BONE_COLOR}`} />
      </VStack>

      {/* Stats */}
      <HStack className="mb-4 items-center" space="sm">
        <Skeleton variant="rounded" className={`h-[13px] w-[90px] ${BONE_COLOR}`} />
        <Skeleton variant="rounded" className={`h-[13px] w-[80px] ${BONE_COLOR}`} />
      </HStack>

      {/* Buttons */}
      <HStack className="mb-2" space="sm">
        <Skeleton variant="rounded" className={`h-9 flex-1 rounded-lg ${BONE_COLOR}`} />
        <Skeleton variant="rounded" className={`h-9 flex-1 rounded-lg ${BONE_COLOR}`} />
      </HStack>

      <Divider className="bg-[#1e1e1e]" />
    </VStack>
  );
}

// ─── Activity item skeleton ───────────────────────────

export function ActivityItemSkeleton() {
  return (
    <View>
      <HStack className="px-4 py-3" space="md">
        <Skeleton variant="circular" className={`size-9 ${BONE_COLOR}`} />
        <VStack className="flex-1" space="sm">
          <HStack className="items-center" space="xs">
            <Skeleton variant="rounded" className={`h-[13px] w-[100px] ${BONE_COLOR}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[24px] ${BONE_COLOR}`} />
          </HStack>
          <Skeleton variant="rounded" className={`h-[13px] w-[140px] ${BONE_COLOR}`} />
          <Skeleton variant="rounded" className={`h-[12px] w-[200px] ${BONE_COLOR}`} />
        </VStack>
      </HStack>
      <Divider className="ml-[64px] bg-[#1e1e1e]" />
    </View>
  );
}

// ─── Activity screen skeleton ─────────────────────────

export function ActivitySkeleton({ count = 8 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={`act-sk-${i}`} />
      ))}
    </View>
  );
}

// ─── Explore user row skeleton ────────────────────────

export function ExploreUserSkeleton() {
  return (
    <View>
      <HStack className="items-center px-4 py-3" space="md">
        <Skeleton variant="circular" className={`size-10 ${BONE_COLOR}`} />
        <VStack className="flex-1" space="sm">
          <Skeleton variant="rounded" className={`h-[14px] w-[120px] ${BONE_COLOR}`} />
          <Skeleton variant="rounded" className={`h-[12px] w-[90px] ${BONE_COLOR}`} />
        </VStack>
        <Skeleton variant="rounded" className={`h-[32px] w-[90px] rounded-lg ${BONE_COLOR}`} />
      </HStack>
      <Divider className="ml-[72px] bg-[#1e1e1e]" />
    </View>
  );
}

// ─── Explore screen skeleton ──────────────────────────

export function ExploreSkeleton() {
  return (
    <View>
      {/* Section header */}
      <View className="px-4 pb-2 pt-5">
        <Skeleton variant="rounded" className={`h-[16px] w-[80px] ${BONE_COLOR}`} />
      </View>
      {/* User rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <ExploreUserSkeleton key={`eu-sk-${i}`} />
      ))}
      {/* Second section */}
      <View className="px-4 pb-2 pt-5">
        <Skeleton variant="rounded" className={`h-[16px] w-[80px] ${BONE_COLOR}`} />
      </View>
      {/* Thread cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <ThreadCardSkeleton key={`et-sk-${i}`} showDivider={i < 2} />
      ))}
    </View>
  );
}

// ─── Thread detail skeleton ───────────────────────────

export function ThreadDetailSkeleton() {
  return (
    <View>
      {/* Main thread */}
      <HStack className="px-4 py-3" space="md">
        <Skeleton variant="circular" className={`size-9 ${BONE_COLOR}`} />
        <VStack className="flex-1" space="sm">
          <HStack className="items-center justify-between">
            <Skeleton variant="rounded" className={`h-[14px] w-[120px] ${BONE_COLOR}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[60px] ${BONE_COLOR}`} />
          </HStack>
          <Skeleton variant="rounded" className={`h-[14px] w-full ${BONE_COLOR}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[90%] ${BONE_COLOR}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[70%] ${BONE_COLOR}`} />
          {/* Action row */}
          <HStack className="mt-1 items-center" space="lg">
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE_COLOR}`} />
          </HStack>
          {/* Engagement */}
          <HStack className="mt-1" space="md">
            <Skeleton variant="rounded" className={`h-[12px] w-[70px] ${BONE_COLOR}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[50px] ${BONE_COLOR}`} />
          </HStack>
        </VStack>
      </HStack>
      {/* Date */}
      <View className="px-4 pb-2">
        <Skeleton variant="rounded" className={`h-[12px] w-[150px] ${BONE_COLOR}`} />
      </View>
      <Divider className="bg-[#1e1e1e]" />
      {/* Reply skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <ThreadCardSkeleton key={`td-sk-${i}`} showDivider={i < 2} />
      ))}
    </View>
  );
}

// ─── Tab bar skeleton ─────────────────────────────────

export function TabBarSkeleton() {
  return (
    <HStack className="border-b border-[#1e1e1e]">
      <View className="flex-1 items-center py-3">
        <Skeleton variant="rounded" className={`h-[14px] w-[60px] ${BONE_COLOR}`} />
      </View>
      <View className="flex-1 items-center py-3">
        <Skeleton variant="rounded" className={`h-[14px] w-[60px] ${BONE_COLOR}`} />
      </View>
    </HStack>
  );
}

// ─── Conversation row skeleton ────────────────────────

export function ConversationRowSkeleton() {
  return (
    <View>
      <HStack className="px-4 py-3" space="md">
        <Skeleton variant="circular" className={`size-[52px] ${BONE_COLOR}`} />
        <VStack className="flex-1 justify-center" space="sm">
          <HStack className="items-center justify-between">
            <Skeleton variant="rounded" className={`h-[14px] w-[140px] ${BONE_COLOR}`} />
            <Skeleton variant="rounded" className={`h-[11px] w-[32px] ${BONE_COLOR}`} />
          </HStack>
          <Skeleton variant="rounded" className={`h-[13px] w-[200px] ${BONE_COLOR}`} />
        </VStack>
      </HStack>
      <Divider className="ml-[76px] bg-[#1e1e1e]" />
    </View>
  );
}

// ─── Inbox screen skeleton ────────────────────────────

export function InboxSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ConversationRowSkeleton key={`inbox-sk-${i}`} />
      ))}
    </View>
  );
}

// ─── Chat message skeleton ────────────────────────────

export function ChatMessageSkeleton({ isMe = false }: { isMe?: boolean }) {
  return (
    <View className={`flex-row px-4 py-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && <Skeleton variant="circular" className={`mr-2 size-[28px] ${BONE_COLOR}`} />}
      <VStack space="xs">
        <Skeleton
          variant="rounded"
          className={`h-[36px] rounded-2xl ${isMe ? 'w-[180px]' : 'w-[220px]'} ${BONE_COLOR}`}
        />
      </VStack>
    </View>
  );
}

// ─── Chat screen skeleton ─────────────────────────────

export function ChatSkeleton() {
  return (
    <View className="flex-1 pt-4">
      <ChatMessageSkeleton isMe={false} />
      <ChatMessageSkeleton isMe={false} />
      <ChatMessageSkeleton isMe={true} />
      <ChatMessageSkeleton isMe={false} />
      <ChatMessageSkeleton isMe={true} />
      <ChatMessageSkeleton isMe={true} />
      <ChatMessageSkeleton isMe={false} />
      <ChatMessageSkeleton isMe={true} />
    </View>
  );
}
