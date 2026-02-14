// components/VideoPlayer.tsx

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Pressable, Platform, Animated as RNAnimated } from 'react-native';
import { useVideoPlayer, VideoView, VideoPlayer as VideoPlayerType } from 'expo-video';
import { Text } from '@/components/ui/text';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react-native';
import { isWeb, SafeAnimatedView } from '@/utils/animatedWebSafe';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui/skeleton';

// Only import Reanimated on native platforms
let Animated: any = null;
let useSharedValue: any = null;
let withTiming: any = null;
let FadeIn: any = null;
let FadeOut: any = null;

if (!isWeb) {
  Animated = require('react-native-reanimated').default;
  useSharedValue = require('react-native-reanimated').useSharedValue;
  withTiming = require('react-native-reanimated').withTiming;
  FadeIn = require('react-native-reanimated').FadeIn;
  FadeOut = require('react-native-reanimated').FadeOut;
}

interface VideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  muted?: boolean;
  isVisible?: boolean;
  onPress?: () => void;
  style?: any;
}

const AnimatedPressable = !isWeb ? Animated.createAnimatedComponent(Pressable) : Pressable;

export function VideoPlayer({
  uri,
  thumbnailUri,
  autoPlay = true,
  muted = true,
  isVisible = true,
  onPress,
  style,
}: VideoPlayerProps) {
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(muted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [controlsOpacityWeb, setControlsOpacityWeb] = useState(1);
  
  // Only use Reanimated on native
  const controlsOpacity = !isWeb ? useSharedValue(1) : { value: 1 };
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktop = isWeb;

  const player = useVideoPlayer(uri, (p: VideoPlayerType) => {
    p.loop = true;
    // On web, always mute and don't autoplay due to browser policies
    p.muted = isWeb ? true : muted;
  });

  useEffect(() => {
    if (!player) return;
    const statusSub = player.addListener('statusChange', (event: { status: string }) => {
      if (event.status === 'readyToPlay') {
        setIsLoaded(true);
      }
    });
    const playingSub = player.addListener('playingChange', (event: { isPlaying: boolean }) => {
      setIsPlaying(event.isPlaying);
    });
    return () => {
      statusSub.remove();
      playingSub.remove();
    };
  }, [player]);

  useEffect(() => {
    if (!player || isWeb) return;
    try {
      if (isVisible && autoPlay) {
        player.play();
      } else {
        player.pause();
      }
    } catch (e) {
      // Silently catch any playback errors
    }
  }, [isVisible, player, autoPlay]);

  const scheduleHideControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isWeb) {
        setControlsOpacityWeb(0);
      } else {
        controlsOpacity.value = withTiming(0, { duration: 300 });
      }
      setShowControls(false);
    }, 2500);
  }, [controlsOpacity, isWeb]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    if (!showControls) {
      if (isWeb) {
        setControlsOpacityWeb(1);
      } else {
        controlsOpacity.value = withTiming(1, { duration: 200 });
      }
      setShowControls(true);
      scheduleHideControls();
    } else {
      if (player) {
        if (isPlaying) {
          player.pause();
        } else {
          player.play();
        }
      }
      scheduleHideControls();
    }
  }, [showControls, isPlaying, player, onPress, controlsOpacity, scheduleHideControls, isWeb]);

  const handleMuteToggle = useCallback(() => {
    if (!player) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    player.muted = newMuted;
  }, [isMuted, player]);

  // Conditional animation style - only for native
  const animatedControlsStyle = !isWeb ? {
    opacity: controlsOpacity.value,
  } : {
    opacity: controlsOpacityWeb,
  };

  const handleHover = useCallback(() => {
    if (!isDesktop || !player) return;
    player.play();
    if (isDesktop) {
      if (isWeb) {
        setControlsOpacityWeb(1);
      } else {
        controlsOpacity.value = withTiming(1, { duration: 200 });
      }
    }
    setShowControls(true);
  }, [isDesktop, player, controlsOpacity, isWeb]);

  const handleHoverOut = useCallback(() => {
    if (!isDesktop || !player) return;
    if (!autoPlay) {
      player.pause();
    }
    if (isDesktop) {
      if (isWeb) {
        setControlsOpacityWeb(0);
      } else {
        controlsOpacity.value = withTiming(0, { duration: 300 });
      }
    }
    setShowControls(false);
  }, [isDesktop, player, autoPlay, controlsOpacity, isWeb]);

  return (
    <View
      style={[{ overflow: 'hidden', borderRadius: 12, backgroundColor: '#1a1a1a' }, style]}
      {...(isDesktop
        ? {
            onPointerEnter: handleHover,
            onPointerLeave: handleHoverOut,
          }
        : {})}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Skeleton variant="rounded" className="w-full h-full bg-[#1e1e1e]" />
          )}
          {/* Play icon overlay on thumbnail */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Play size={22} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
        </View>
      )}

      {/* Video */}
      <Pressable onPress={handlePress} style={{ width: '100%', height: '100%' }}>
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          nativeControls={false}
          contentFit="cover"
        />
      </Pressable>

      {/* Controls overlay - Web version */}
      {isDesktop && (
        <View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: showControls ? 'auto' : 'none',
              opacity: showControls ? 1 : 0,
              transition: 'opacity 200ms ease-in-out',
            } as any,
          ]}
        >
          {/* Center play/pause */}
          {!isPlaying && (
            <Pressable
              onPress={handlePress}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Play size={22} color="#ffffff" fill="#ffffff" />
            </Pressable>
          )}
        </View>
      )}

      {/* Controls overlay - Native version */}
      {!isDesktop && (
        <SafeAnimatedView
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: showControls ? 'auto' : 'none',
            },
            animatedControlsStyle,
          ]}
        >
          {/* Center play/pause */}
          {!isPlaying && (
            !isWeb ? (
              <SafeAnimatedView entering={FadeIn?.duration(150)} exiting={FadeOut?.duration(150)}>
                <Pressable
                  onPress={handlePress}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Play size={22} color="#ffffff" fill="#ffffff" />
                </Pressable>
              </SafeAnimatedView>
            ) : (
              <Pressable
                onPress={handlePress}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Play size={22} color="#ffffff" fill="#ffffff" />
              </Pressable>
            )
          )}
        </SafeAnimatedView>
      )}

      {/* Mute button - bottom right */}
      <Pressable
        onPress={handleMuteToggle}
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        }}
        hitSlop={6}
      >
        {isMuted ? (
          <VolumeX size={15} color="#ffffff" />
        ) : (
          <Volume2 size={15} color="#ffffff" />
        )}
      </Pressable>

      {/* Video badge - top left */}
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: 'rgba(0,0,0,0.6)',
        }}
      >
        <Text className="text-white text-[11px] font-semibold">VIDEO</Text>
      </View>
    </View>
  );
}
