// components/skeletons.tsx

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';

const BONE = 'bg-[#1e1e1e]';

// ─── Thread card skeleton ────────────────────────────

export function ThreadCardSkeleton({ showDivider = true, showMedia = false }: { showDivider?: boolean; showMedia?: boolean }) {
  return (
    <View>
      <HStack className="px-4 py-3" space="md">
        {/* Avatar */}
        <Skeleton variant="circular" className={`size-9 ${BONE}`} />

        {/* Content */}
        <VStack className="flex-1" space="sm">
          {/* Username + timestamp */}
          <HStack className="items-center justify-between">
            <Skeleton variant="rounded" className={`h-[14px] w-[120px] ${BONE}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[28px] ${BONE}`} />
          </HStack>
          {/* Body lines */}
          <Skeleton variant="rounded" className={`h-[14px] w-full ${BONE}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[85%] ${BONE}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[55%] ${BONE}`} />
          {/* Media placeholder */}
          {showMedia && (
            <Skeleton variant="rounded" className={`h-[180px] w-full rounded-xl ${BONE}`} />
          )}
          {/* Action row */}
          <HStack className="mt-1 items-center" space="lg">
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
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
          <Skeleton variant="rounded" className={`h-[22px] w-[160px] ${BONE}`} />
          <HStack className="items-center" space="xs">
            <Skeleton variant="rounded" className={`h-[14px] w-[100px] ${BONE}`} />
            <Skeleton variant="rounded" className={`h-[16px] w-[70px] rounded-full ${BONE}`} />
          </HStack>
        </VStack>
        <Skeleton variant="circular" className={`size-[56px] ${BONE}`} />
      </HStack>

      {/* Bio lines */}
      <VStack className="mb-3" space="xs">
        <Skeleton variant="rounded" className={`h-[14px] w-full ${BONE}`} />
        <Skeleton variant="rounded" className={`h-[14px] w-[70%] ${BONE}`} />
      </VStack>

      {/* Stats */}
      <HStack className="mb-4 items-center" space="sm">
        <Skeleton variant="rounded" className={`h-[13px] w-[90px] ${BONE}`} />
        <Skeleton variant="rounded" className={`h-[13px] w-[80px] ${BONE}`} />
      </HStack>

      {/* Buttons */}
      <HStack className="mb-2" space="sm">
        <Skeleton variant="rounded" className={`h-9 flex-1 rounded-lg ${BONE}`} />
        <Skeleton variant="rounded" className={`h-9 flex-1 rounded-lg ${BONE}`} />
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
        <Skeleton variant="circular" className={`size-9 ${BONE}`} />
        <VStack className="flex-1" space="sm">
          <HStack className="items-center" space="xs">
            <Skeleton variant="rounded" className={`h-[13px] w-[100px] ${BONE}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[24px] ${BONE}`} />
          </HStack>
          <Skeleton variant="rounded" className={`h-[13px] w-[140px] ${BONE}`} />
          <Skeleton variant="rounded" className={`h-[12px] w-[200px] ${BONE}`} />
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
        <Skeleton variant="circular" className={`size-10 ${BONE}`} />
        <VStack className="flex-1" space="sm">
          <Skeleton variant="rounded" className={`h-[14px] w-[120px] ${BONE}`} />
          <Skeleton variant="rounded" className={`h-[12px] w-[90px] ${BONE}`} />
        </VStack>
        <Skeleton variant="rounded" className={`h-[32px] w-[90px] rounded-lg ${BONE}`} />
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
        <Skeleton variant="rounded" className={`h-[16px] w-[80px] ${BONE}`} />
      </View>
      {/* User rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <ExploreUserSkeleton key={`eu-sk-${i}`} />
      ))}
      {/* Second section */}
      <View className="px-4 pb-2 pt-5">
        <Skeleton variant="rounded" className={`h-[16px] w-[80px] ${BONE}`} />
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
        <Skeleton variant="circular" className={`size-9 ${BONE}`} />
        <VStack className="flex-1" space="sm">
          <HStack className="items-center justify-between">
            <Skeleton variant="rounded" className={`h-[14px] w-[120px] ${BONE}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[60px] ${BONE}`} />
          </HStack>
          <Skeleton variant="rounded" className={`h-[14px] w-full ${BONE}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[90%] ${BONE}`} />
          <Skeleton variant="rounded" className={`h-[14px] w-[70%] ${BONE}`} />
          {/* Action row */}
          <HStack className="mt-1 items-center" space="lg">
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`size-[20px] ${BONE}`} />
          </HStack>
          {/* Engagement */}
          <HStack className="mt-1" space="md">
            <Skeleton variant="rounded" className={`h-[12px] w-[70px] ${BONE}`} />
            <Skeleton variant="rounded" className={`h-[12px] w-[50px] ${BONE}`} />
          </HStack>
        </VStack>
      </HStack>
      {/* Date */}
      <View className="px-4 pb-2">
        <Skeleton variant="rounded" className={`h-[12px] w-[150px] ${BONE}`} />
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
        <Skeleton variant="rounded" className={`h-[14px] w-[60px] ${BONE}`} />
      </View>
      <View className="flex-1 items-center py-3">
        <Skeleton variant="rounded" className={`h-[14px] w-[60px] ${BONE}`} />
      </View>
    </HStack>
  );
}
