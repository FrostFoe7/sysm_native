// app/(tabs)/reels.tsx
// Instagram Reels: fullscreen vertical paging feed

import React, { useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import {
  View,
  FlatList,
  useWindowDimensions,
  Platform,
  ViewToken,
  StatusBar,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { ReelPlayer } from '@/components/ReelPlayer';
import { DESKTOP_BREAKPOINT } from '@/constants/ui';
import { ArrowLeftIcon } from '@/constants/icons';
import type { ReelWithAuthor } from '@/types/types';
import { useReels } from '@/hooks/use-reels';

export default function ReelsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowW >= DESKTOP_BREAKPOINT;

  const {
    data: reels,
    activeIndex,
    setActiveIndex,
    isMuted,
    toggleMute,
    onReelVisible,
    onReelHidden,
  } = useReels();

  const flatListRef = useRef<FlatList>(null);
  const prevActiveRef = useRef<string | null>(null);

  // Hide bottom tab bar on this screen
  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: 'none' },
    });
    return () => {
      navigation.setOptions({
        tabBarStyle: { 
          backgroundColor: 'brand-dark',
          borderTopColor: 'brand-border',
          borderTopWidth: 0.5,
          height: Platform.OS === 'web' ? 60 : 84,
          paddingTop: 8,
          elevation: 0,
        },
      });
    };
  }, [navigation]);

  // Viewability tracking: only one reel plays at a time + watch-time signals
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
    minimumViewTime: 100,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const newIndex = viewableItems[0].index;
        setActiveIndex(newIndex);
      }
    },
  ).current;

  // Track reel visibility for watch-time reporting
  useEffect(() => {
    if (reels.length === 0) return;
    const currentReel = reels[activeIndex];
    if (!currentReel) return;

    const prevId = prevActiveRef.current;
    if (prevId && prevId !== currentReel.id) {
      onReelHidden(prevId);
    }
    onReelVisible(currentReel.id);
    prevActiveRef.current = currentReel.id;

    return () => {
      // Report watch time when component unmounts or reel changes
    };
  }, [activeIndex, reels, onReelVisible, onReelHidden]);

  const renderItem = useCallback(
    ({ item, index }: { item: ReelWithAuthor; index: number }) => {
      if (isDesktop) {
        // Desktop: render inside phone frame
        return (
          <View
            style={{
              width: PHONE_FRAME_WIDTH,
              height: PHONE_FRAME_HEIGHT,
              overflow: 'hidden',
            }}
          >
            <ReelPlayer
              reel={item}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onMuteToggle={toggleMute}
            />
          </View>
        );
      }
      return (
        <View style={{ width: windowW, height: windowH }}>
          <ReelPlayer
            reel={item}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onMuteToggle={toggleMute}
          />
        </View>
      );
    },
    [activeIndex, isMuted, toggleMute, windowW, windowH, isDesktop],
  );

  const keyExtractor = useCallback((item: ReelWithAuthor) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      const h = isDesktop ? PHONE_FRAME_HEIGHT : windowH;
      return { length: h, offset: h * index, index };
    },
    [isDesktop, windowH],
  );

  if (reels.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a0a0a]">
        <Text className="text-[16px] text-brand-muted">No reels yet</Text>
      </View>
    );
  }

  // Desktop: centered phone-frame layout
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Header */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            paddingHorizontal: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              left: 16,
              padding: 8,
            }}
            hitSlop={8}
          >
            <ArrowLeft size={24} color="brand-light" strokeWidth={2} />
          </Pressable>
          <Text className="text-[20px] font-bold text-brand-light">Reels</Text>
        </View>

        {/* Phone frame */}
        <View
          style={{
            width: PHONE_FRAME_WIDTH,
            height: PHONE_FRAME_HEIGHT,
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: '#000000',
            borderWidth: 2,
            borderColor: 'brand-border',
          }}
        >
          <FlatList
            ref={flatListRef}
            data={reels}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            pagingEnabled
            snapToInterval={PHONE_FRAME_HEIGHT}
            decelerationRate="fast"
            snapToAlignment="start"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={getItemLayout}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
          />
        </View>

        {/* Reel counter */}
        <View
          style={{
            position: 'absolute',
            bottom: 16,
            alignItems: 'center',
          }}
        >
          <Text className="text-[12px] text-brand-muted">
            {activeIndex + 1} / {reels.length}
          </Text>
        </View>
      </View>
    );
  }

  // Mobile: fullscreen paging feed
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Reels header */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 60 : 56,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          paddingTop: Platform.OS === 'ios' ? 12 : 8,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            left: 12,
            padding: 8,
          }}
          hitSlop={8}
        >
          <ArrowLeft size={24} color="brand-light" strokeWidth={2.2} />
        </Pressable>
        <Text className="text-[18px] font-bold tracking-tight text-brand-light">Reels</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToInterval={windowH}
        decelerationRate="fast"
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
      />
    </View>
  );
}

// Phone frame dimensions for desktop
const PHONE_FRAME_WIDTH = 380;
const PHONE_FRAME_HEIGHT = 680;
