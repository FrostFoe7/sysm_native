// components/MediaGallery.tsx

import React, { useCallback, useState, memo } from 'react';
import { View, Pressable, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { SafeView } from '@/utils/animatedWebSafe';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { MediaItem } from '@/db/db';

interface MediaGalleryProps {
  media: MediaItem[];
  onMediaPress?: (index: number) => void;
  isVisible?: boolean;
  maxHeight?: number;
}

const BORDER_RADIUS = 12;
const GAP = 2;

function MediaSkeleton({ style }: { style?: any }) {
  return (
    <Skeleton
      variant="rounded"
      className="bg-[#1e1e1e]"
      style={[{ borderRadius: BORDER_RADIUS }, style]}
    />
  );
}

function SingleMedia({
  item,
  onPress,
  isVisible,
  maxHeight,
}: {
  item: MediaItem;
  onPress?: () => void;
  isVisible: boolean;
  maxHeight: number;
}) {
  const [loaded, setLoaded] = useState(false);

  if (item.type === 'video') {
    return (
      <View style={{ width: '100%', height: maxHeight, borderRadius: BORDER_RADIUS, overflow: 'hidden' }}>
        <VideoPlayer
          uri={item.uri}
          thumbnailUri={item.thumbnailUri}
          width={item.width}
          height={item.height}
          autoPlay
          muted
          isVisible={isVisible}
          onPress={onPress}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} style={{ width: '100%', height: maxHeight, borderRadius: BORDER_RADIUS, overflow: 'hidden' }}>
      {!loaded && <MediaSkeleton style={{ position: 'absolute', width: '100%', height: '100%' }} />}
      <Image
        source={{ uri: item.uri }}
        style={{ width: '100%', height: '100%', borderRadius: BORDER_RADIUS }}
        contentFit="cover"
        transition={200}
        onLoad={() => setLoaded(true)}
      />
    </Pressable>
  );
}

function DuoMedia({
  media,
  onPress,
  isVisible,
  maxHeight,
}: {
  media: MediaItem[];
  onPress?: (index: number) => void;
  isVisible: boolean;
  maxHeight: number;
}) {
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  return (
    <SafeView style={{ flexDirection: 'row', height: maxHeight, gap: GAP, borderRadius: BORDER_RADIUS, overflow: 'hidden' }}>
      {media.slice(0, 2).map((item, i) => (
        <View key={i} style={{ flex: 1, overflow: 'hidden' }}>
          {item.type === 'video' ? (
            <VideoPlayer
              uri={item.uri}
              thumbnailUri={item.thumbnailUri}
              autoPlay={i === 0}
              muted
              isVisible={isVisible}
              onPress={() => onPress?.(i)}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Pressable onPress={() => onPress?.(i)} style={{ flex: 1 }}>
              {!loaded[i] && <MediaSkeleton style={{ position: 'absolute', width: '100%', height: '100%' }} />}
              <Image
                source={{ uri: item.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                onLoad={() => setLoaded((p) => ({ ...p, [i]: true }))}
              />
            </Pressable>
          )}
        </View>
      ))}
    </SafeView>
  );
}

function TriMedia({
  media,
  onPress,
  isVisible,
  maxHeight,
}: {
  media: MediaItem[];
  onPress?: (index: number) => void;
  isVisible: boolean;
  maxHeight: number;
}) {
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  const renderItem = (item: MediaItem, idx: number, style: any) => {
    if (item.type === 'video') {
      return (
        <VideoPlayer
          key={idx}
          uri={item.uri}
          thumbnailUri={item.thumbnailUri}
          autoPlay={idx === 0}
          muted
          isVisible={isVisible}
          onPress={() => onPress?.(idx)}
          style={style}
        />
      );
    }
    return (
      <Pressable key={idx} onPress={() => onPress?.(idx)} style={style}>
        {!loaded[idx] && <MediaSkeleton style={{ position: 'absolute', width: '100%', height: '100%' }} />}
        <Image
          source={{ uri: item.uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          onLoad={() => setLoaded((p) => ({ ...p, [idx]: true }))}
        />
      </Pressable>
    );
  };

  return (
    <SafeView style={{ height: maxHeight, gap: GAP, borderRadius: BORDER_RADIUS, overflow: 'hidden' }}>
      <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
        {renderItem(media[0], 0, { flex: 2 })}
        {renderItem(media[1], 1, { flex: 1 })}
      </View>
      {renderItem(media[2], 2, { height: maxHeight * 0.4 })}
    </SafeView>
  );
}

function QuadMedia({
  media,
  onPress,
  isVisible,
  maxHeight,
}: {
  media: MediaItem[];
  onPress?: (index: number) => void;
  isVisible: boolean;
  maxHeight: number;
}) {
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  const renderItem = (item: MediaItem, idx: number) => {
    if (item.type === 'video') {
      return (
        <VideoPlayer
          key={idx}
          uri={item.uri}
          thumbnailUri={item.thumbnailUri}
          autoPlay={idx === 0}
          muted
          isVisible={isVisible}
          onPress={() => onPress?.(idx)}
          style={{ flex: 1 }}
        />
      );
    }
    return (
      <Pressable key={idx} onPress={() => onPress?.(idx)} style={{ flex: 1 }}>
        {!loaded[idx] && <MediaSkeleton style={{ position: 'absolute', width: '100%', height: '100%' }} />}
        <Image
          source={{ uri: item.uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          onLoad={() => setLoaded((p) => ({ ...p, [idx]: true }))}
        />
      </Pressable>
    );
  };

  return (
    <SafeView style={{ height: maxHeight, gap: GAP, borderRadius: BORDER_RADIUS, overflow: 'hidden' }}>
      <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
        {renderItem(media[0], 0)}
        {renderItem(media[1], 1)}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
        {renderItem(media[2], 2)}
        {renderItem(media[3], 3)}
      </View>
    </SafeView>
  );
}

export const MediaGallery = memo(function MediaGallery({
  media,
  onMediaPress,
  isVisible = true,
  maxHeight = 300,
}: MediaGalleryProps) {
  const handlePress = useCallback(
    (index: number) => {
      onMediaPress?.(index);
    },
    [onMediaPress],
  );

  if (!media || media.length === 0) return null;

  if (media.length === 1) {
    return (
      <SingleMedia
        item={media[0]}
        onPress={() => handlePress(0)}
        isVisible={isVisible}
        maxHeight={maxHeight}
      />
    );
  }

  if (media.length === 2) {
    return (
      <DuoMedia
        media={media}
        onPress={handlePress}
        isVisible={isVisible}
        maxHeight={maxHeight}
      />
    );
  }

  if (media.length === 3) {
    return (
      <TriMedia
        media={media}
        onPress={handlePress}
        isVisible={isVisible}
        maxHeight={maxHeight}
      />
    );
  }

  return (
    <QuadMedia
      media={media.slice(0, 4)}
      onPress={handlePress}
      isVisible={isVisible}
      maxHeight={maxHeight}
    />
  );
});
