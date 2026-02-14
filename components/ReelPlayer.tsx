// components/ReelPlayer.tsx
// Full-screen video player for a single Reel with gestures and overlays

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView, VideoPlayer as VideoPlayerType } from 'expo-video';
import {
  isWeb,
  SafeAnimatedView,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withSequence,
} from '@/utils/animatedWebSafe';
import { Heart, Volume2, VolumeX } from 'lucide-react-native';
import { ReelOverlay } from '@/components/ReelOverlay';
import { ReelCommentSheet } from '@/components/ReelCommentSheet';
import { ReelSkeleton } from '@/components/ReelSkeleton';
import { isReelLiked, toggleReelLike } from '@/db/selectors';
import type { ReelWithAuthor } from '@/types/types';

interface ReelPlayerProps {
  reel: ReelWithAuthor;
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
}

export function ReelPlayer({ reel, isActive, isMuted, onMuteToggle }: ReelPlayerProps) {
  const { width: windowW, height: windowH } = useWindowDimensions();
  const [isLoaded, setIsLoaded] = useState(false);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  // Double-tap detection
  const lastTapRef = useRef<number>(0);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Heart animation value
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const player = useVideoPlayer(reel.videoUrl, (p: VideoPlayerType) => {
    p.loop = true;
    p.muted = isWeb ? true : isMuted;
  });

  // Sync mute state
  useEffect(() => {
    if (!player) return;
    player.muted = isWeb ? true : isMuted;
  }, [isMuted, player]);

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (!player) return;
    try {
      if (isActive && !commentSheetOpen && !isPaused) {
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [isActive, player, commentSheetOpen, isPaused]);

  // Loading listener
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', (event: { status: string }) => {
      if (event.status === 'readyToPlay') {
        setIsLoaded(true);
      }
    });
    return () => sub.remove();
  }, [player]);

  // Double-tap to like
  const handleTap = useCallback(() => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    lastTapRef.current = now;

    if (diff < 300) {
      // Double-tap -> like
      const alreadyLiked = isReelLiked(reel.id);
      if (!alreadyLiked) {
        toggleReelLike(reel.id);
      }
      // Show heart animation
      setShowDoubleTapHeart(true);
      if (isWeb) {
        setTimeout(() => setShowDoubleTapHeart(false), 900);
      } else {
        heartScale.value = withSequence(
          withSpring(1.2, { damping: 4, stiffness: 400 }),
          withSpring(1, { damping: 6, stiffness: 200 }),
        );
        heartOpacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 300 }),
        );
        setTimeout(() => setShowDoubleTapHeart(false), 900);
      }
    } else {
      // Single tap -> toggle pause (with small delay to check for double-tap)
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        const newNow = Date.now();
        if (newNow - lastTapRef.current >= 280) {
          setIsPaused((prev) => !prev);
        }
      }, 300);
    }
  }, [reel.id, heartScale, heartOpacity]);

  // Long press to pause
  const handleLongPress = useCallback(() => {
    if (!player) return;
    player.pause();
    setIsPaused(true);
  }, [player]);

  const handlePressOut = useCallback(() => {
    if (isPaused && player && isActive) {
      // Resume on release if we were long-pressing
    }
  }, [isPaused, player, isActive]);

  const handleCommentOpen = useCallback(() => {
    setCommentSheetOpen(true);
  }, []);

  const handleCommentClose = useCallback(() => {
    setCommentSheetOpen(false);
  }, []);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isWeb ? (showDoubleTapHeart ? 1 : 0) : heartScale.value }],
    opacity: isWeb ? (showDoubleTapHeart ? 1 : 0) : heartOpacity.value,
  }));

  return (
    <View
      style={{
        width: windowW,
        height: windowH,
        backgroundColor: '#000000',
      }}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 }}>
          <ReelSkeleton />
        </View>
      )}

      {/* Video */}
      <Pressable
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={{ flex: 1 }}
      >
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          nativeControls={false}
          contentFit="cover"
        />
      </Pressable>

      {/* Double-tap heart animation */}
      {showDoubleTapHeart && (
        <SafeAnimatedView
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginLeft: -44,
              marginTop: -44,
              zIndex: 100,
            },
            heartAnimatedStyle,
            isWeb && ({ transition: 'transform 200ms ease-out, opacity 300ms ease-in-out' } as any),
          ]}
        >
          <Heart size={88} color="#ff3040" fill="#ff3040" />
        </SafeAnimatedView>
      )}

      {/* Pause indicator */}
      {isPaused && !commentSheetOpen && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: -30,
            marginLeft: -30,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 18,
              borderTopWidth: 11,
              borderBottomWidth: 11,
              borderLeftColor: '#ffffff',
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              marginLeft: 4,
            }}
          />
        </View>
      )}

      {/* Mute button - top right */}
      <Pressable
        onPress={onMuteToggle}
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 60 : 40,
          right: 16,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(38,38,38,0.8)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
        }}
        hitSlop={8}
      >
        {isMuted ? (
          <VolumeX size={16} color="#ffffff" />
        ) : (
          <Volume2 size={16} color="#ffffff" />
        )}
      </Pressable>

      {/* Reel overlay (action buttons + caption) */}
      <ReelOverlay
        reel={reel}
        onCommentPress={handleCommentOpen}
      />

      {/* Comment sheet */}
      <ReelCommentSheet
        isOpen={commentSheetOpen}
        reelId={reel.id}
        commentCount={reel.commentCount}
        onClose={handleCommentClose}
      />
    </View>
  );
}
