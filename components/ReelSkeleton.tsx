// components/ReelSkeleton.tsx
// Fullscreen skeleton matching Reels layout exactly

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function ReelSkeleton() {
  return (
    <View className="relative flex-1 bg-[#0a0a0a]">
      {/* Video area skeleton */}
      <View className="absolute inset-0">
        <Skeleton variant="rounded" className="size-full bg-[#1a1a1a]" />
      </View>

      {/* Right side action buttons skeleton */}
      <View className="absolute bottom-[120px] right-3 items-center" style={{ gap: 20 }}>
        {/* Avatar */}
        <Skeleton
          variant="circular"
          className="size-11 bg-brand-border-secondary"
        />
        {/* Like */}
        <View className="items-center" style={{ gap: 4 }}>
          <Skeleton
            variant="circular"
            className="size-9 bg-brand-border-secondary"
          />
          <Skeleton
            variant="rounded"
            className="h-2.5 w-6 rounded bg-brand-border-secondary"
          />
        </View>
        {/* Comment */}
        <View className="items-center" style={{ gap: 4 }}>
          <Skeleton
            variant="circular"
            className="size-9 bg-brand-border-secondary"
          />
          <Skeleton
            variant="rounded"
            className="h-2.5 w-6 rounded bg-brand-border-secondary"
          />
        </View>
        {/* Share */}
        <View className="items-center" style={{ gap: 4 }}>
          <Skeleton
            variant="circular"
            className="size-9 bg-brand-border-secondary"
          />
          <Skeleton
            variant="rounded"
            className="h-2.5 w-6 rounded bg-brand-border-secondary"
          />
        </View>
        {/* Menu */}
        <Skeleton
          variant="circular"
          className="size-7 bg-brand-border-secondary"
        />
      </View>

      {/* Bottom overlay skeleton */}
      <View className="absolute bottom-6 left-3 right-[72px]" style={{ gap: 8 }}>
        {/* Username */}
        <Skeleton
          variant="rounded"
          className="h-4 w-[120px] rounded bg-brand-border-secondary"
        />
        {/* Caption line 1 */}
        <Skeleton
          variant="rounded"
          className="h-3.5 w-[90%] rounded bg-brand-border-secondary"
        />
        {/* Caption line 2 */}
        <Skeleton
          variant="rounded"
          className="h-3.5 w-[70%] rounded bg-brand-border-secondary"
        />
        {/* Music label */}
        <Skeleton
          variant="rounded"
          className="mt-1 h-3 w-[160px] rounded bg-brand-border-secondary"
        />
      </View>
    </View>
  );
}
