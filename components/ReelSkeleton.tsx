// components/ReelSkeleton.tsx
// Fullscreen skeleton matching Reels layout exactly

import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function ReelSkeleton() {
  const { width, height } = useWindowDimensions();

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Video area skeleton */}
      <Skeleton
        variant="rounded"
        className="bg-[#1a1a1a]"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Right side action buttons skeleton */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: 120,
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* Avatar */}
        <Skeleton
          variant="circular"
          className="bg-[#2a2a2a]"
          style={{ width: 44, height: 44 }}
        />
        {/* Like */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Skeleton
            variant="circular"
            className="bg-[#2a2a2a]"
            style={{ width: 36, height: 36 }}
          />
          <Skeleton
            variant="rounded"
            className="bg-[#2a2a2a]"
            style={{ width: 24, height: 10, borderRadius: 4 }}
          />
        </View>
        {/* Comment */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Skeleton
            variant="circular"
            className="bg-[#2a2a2a]"
            style={{ width: 36, height: 36 }}
          />
          <Skeleton
            variant="rounded"
            className="bg-[#2a2a2a]"
            style={{ width: 24, height: 10, borderRadius: 4 }}
          />
        </View>
        {/* Share */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Skeleton
            variant="circular"
            className="bg-[#2a2a2a]"
            style={{ width: 36, height: 36 }}
          />
          <Skeleton
            variant="rounded"
            className="bg-[#2a2a2a]"
            style={{ width: 24, height: 10, borderRadius: 4 }}
          />
        </View>
        {/* Menu */}
        <Skeleton
          variant="circular"
          className="bg-[#2a2a2a]"
          style={{ width: 28, height: 28 }}
        />
      </View>

      {/* Bottom overlay skeleton */}
      <View
        style={{
          position: 'absolute',
          bottom: 24,
          left: 12,
          right: 72,
          gap: 8,
        }}
      >
        {/* Username */}
        <Skeleton
          variant="rounded"
          className="bg-[#2a2a2a]"
          style={{ width: 120, height: 16, borderRadius: 4 }}
        />
        {/* Caption line 1 */}
        <Skeleton
          variant="rounded"
          className="bg-[#2a2a2a]"
          style={{ width: '90%', height: 14, borderRadius: 4 }}
        />
        {/* Caption line 2 */}
        <Skeleton
          variant="rounded"
          className="bg-[#2a2a2a]"
          style={{ width: '70%', height: 14, borderRadius: 4 }}
        />
        {/* Music label */}
        <Skeleton
          variant="rounded"
          className="bg-[#2a2a2a]"
          style={{ width: 160, height: 12, borderRadius: 4, marginTop: 4 }}
        />
      </View>
    </View>
  );
}
