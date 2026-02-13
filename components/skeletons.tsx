// components/skeletons.tsx

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';

const BONE = 'bg-[#1e1e1e]';

// ─── Thread card skeleton ────────────────────────────

export function ThreadCardSkeleton({ showDivider = true }: { showDivider?: boolean }) {
  return (
    <View>
      <HStack className="px-4 py-3" space="md">
        {/* Avatar */}
        <Skeleton variant="circular" className={`w-9 h-9 ${BONE}`} />

        {/* Content */}
        <VStack className="flex-1" space="sm">
          {/* Username + timestamp */}
          <HStack className="items-center justify-between">
            <Skeleton variant="rounded" className={`w-[120px] h-[14px] ${BONE}`} />
            <Skeleton variant="rounded" className={`w-[28px] h-[12px] ${BONE}`} />
          </HStack>
          {/* Body lines */}
          <Skeleton variant="rounded" className={`w-full h-[14px] ${BONE}`} />
          <Skeleton variant="rounded" className={`w-[85%] h-[14px] ${BONE}`} />
          <Skeleton variant="rounded" className={`w-[55%] h-[14px] ${BONE}`} />
          {/* Action row */}
          <HStack className="items-center mt-1" space="lg">
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
          </HStack>
        </VStack>
      </HStack>
      {showDivider && <Divider className="bg-[#1e1e1e] ml-[60px]" />}
    </View>
  );
}

// ─── Feed skeleton (multiple thread cards) ────────────

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ThreadCardSkeleton key={`feed-sk-${i}`} showDivider={i < count - 1} />
      ))}
    </View>
  );
}

// ─── Profile header skeleton ─────────────────────────

export function ProfileHeaderSkeleton({ isCurrentUser = true }: { isCurrentUser?: boolean }) {
  return (
    <VStack className="px-4 pt-4 pb-2">
      {/* Top row: name + avatar */}
      <HStack className="items-start justify-between mb-3">
        <VStack className="flex-1 mr-4" space="sm">
          <Skeleton variant="rounded" className={`w-[160px] h-[22px] ${BONE}`} />
          <HStack className="items-center" space="xs">
            <Skeleton variant="rounded" className={`w-[100px] h-[14px] ${BONE}`} />
            <Skeleton variant="rounded" className={`w-[70px] h-[16px] rounded-full ${BONE}`} />
          </HStack>
        </VStack>
        <Skeleton variant="circular" className={`w-[56px] h-[56px] ${BONE}`} />
      </HStack>

      {/* Bio lines */}
      <VStack className="mb-3" space="xs">
        <Skeleton variant="rounded" className={`w-full h-[14px] ${BONE}`} />
        <Skeleton variant="rounded" className={`w-[70%] h-[14px] ${BONE}`} />
      </VStack>

      {/* Stats */}
      <HStack className="items-center mb-4" space="sm">
        <Skeleton variant="rounded" className={`w-[90px] h-[13px] ${BONE}`} />
        <Skeleton variant="rounded" className={`w-[80px] h-[13px] ${BONE}`} />
      </HStack>

      {/* Buttons */}
      <HStack className="mb-2" space="sm">
        <Skeleton variant="rounded" className={`flex-1 h-9 rounded-lg ${BONE}`} />
        <Skeleton variant="rounded" className={`flex-1 h-9 rounded-lg ${BONE}`} />
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
        <Skeleton variant="circular" className={`w-9 h-9 ${BONE}`} />
        <VStack className="flex-1" space="sm">
          <HStack className="items-center" space="xs">
            <Skeleton variant="rounded" className={`w-[100px] h-[13px] ${BONE}`} />
            <Skeleton variant="rounded" className={`w-[24px] h-[12px] ${BONE}`} />
          </HStack>
          <Skeleton variant="rounded" className={`w-[140px] h-[13px] ${BONE}`} />
          <Skeleton variant="rounded" className={`w-[200px] h-[12px] ${BONE}`} />
        </VStack>
      </HStack>
      <Divider className="bg-[#1e1e1e] ml-[64px]" />
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
      <HStack className="px-4 py-3 items-center" space="md">
        <Skeleton variant="circular" className={`w-10 h-10 ${BONE}`} />
        <VStack className="flex-1" space="sm">
          <Skeleton variant="rounded" className={`w-[120px] h-[14px] ${BONE}`} />
          <Skeleton variant="rounded" className={`w-[90px] h-[12px] ${BONE}`} />
        </VStack>
        <Skeleton variant="rounded" className={`w-[90px] h-[32px] rounded-lg ${BONE}`} />
      </HStack>
      <Divider className="bg-[#1e1e1e] ml-[72px]" />
    </View>
  );
}

// ─── Explore screen skeleton ──────────────────────────

export function ExploreSkeleton() {
  return (
    <View>
      {/* Section header */}
      <View className="px-4 pt-5 pb-2">
        <Skeleton variant="rounded" className={`w-[80px] h-[16px] ${BONE}`} />
      </View>
      {/* User rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <ExploreUserSkeleton key={`eu-sk-${i}`} />
      ))}
      {/* Second section */}
      <View className="px-4 pt-5 pb-2">
        <Skeleton variant="rounded" className={`w-[80px] h-[16px] ${BONE}`} />
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
        <Skeleton variant="circular" className={`w-9 h-9 ${BONE}`} />
        <VStack className="flex-1" space="sm">
          <HStack className="items-center justify-between">
            <Skeleton variant="rounded" className={`w-[120px] h-[14px] ${BONE}`} />
            <Skeleton variant="rounded" className={`w-[60px] h-[12px] ${BONE}`} />
          </HStack>
          <Skeleton variant="rounded" className={`w-full h-[14px] ${BONE}`} />
          <Skeleton variant="rounded" className={`w-[90%] h-[14px] ${BONE}`} />
          <Skeleton variant="rounded" className={`w-[70%] h-[14px] ${BONE}`} />
          {/* Action row */}
          <HStack className="items-center mt-1" space="lg">
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
            <Skeleton variant="circular" className={`w-[20px] h-[20px] ${BONE}`} />
          </HStack>
          {/* Engagement */}
          <HStack className="mt-1" space="md">
            <Skeleton variant="rounded" className={`w-[70px] h-[12px] ${BONE}`} />
            <Skeleton variant="rounded" className={`w-[50px] h-[12px] ${BONE}`} />
          </HStack>
        </VStack>
      </HStack>
      {/* Date */}
      <View className="px-4 pb-2">
        <Skeleton variant="rounded" className={`w-[150px] h-[12px] ${BONE}`} />
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
      <View className="flex-1 py-3 items-center">
        <Skeleton variant="rounded" className={`w-[60px] h-[14px] ${BONE}`} />
      </View>
      <View className="flex-1 py-3 items-center">
        <Skeleton variant="rounded" className={`w-[60px] h-[14px] ${BONE}`} />
      </View>
    </HStack>
  );
}
