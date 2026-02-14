// components/VideoPlayer.tsx

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useVideoPlayer, VideoView, VideoPlayer as VideoPlayerType } from 'expo-video';
import { Text } from '@/components/ui/text';
import { Play, Volume2, VolumeX } from 'lucide-react-native';
import { 
  isWeb, 
  SafeAnimatedView, 
  useSharedValue, 
  withTiming, 
  FadeIn, 
  FadeOut,
  useAnimatedStyle,
  SafeAnimatedPressable
} from '@/utils/animatedWebSafe';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [controlsOpacityWeb, setControlsOpacityWeb] = useState(1);
  
  const controlsOpacity = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktop = isWeb;

  const player = useVideoPlayer(uri, (p: VideoPlayerType) => {
    p.loop = true;
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
    } catch (e) {}
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
  }, [controlsOpacity]);

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
  }, [showControls, isPlaying, player, onPress, controlsOpacity, scheduleHideControls]);

  const handleMuteToggle = useCallback(() => {
    if (!player) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    player.muted = newMuted;
  }, [isMuted, player]);

  const animatedControlsStyle = useAnimatedStyle(() => ({
    opacity: isWeb ? controlsOpacityWeb : controlsOpacity.value,
  }));

  const handleHover = useCallback(() => {
    if (!isDesktop || !player) return;
    player.play();
    setControlsOpacityWeb(1);
    setShowControls(true);
  }, [isDesktop, player]);

  const handleHoverOut = useCallback(() => {
    if (!isDesktop || !player) return;
    if (!autoPlay) {
      player.pause();
    }
    setControlsOpacityWeb(0);
    setShowControls(false);
  }, [isDesktop, player, autoPlay]);

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

      {/* Controls overlay */}
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
          isWeb && ({ transition: 'opacity 200ms ease-in-out' } as any)
        ]}
      >
        {!isPlaying && (
          <SafeAnimatedPressable
            onPress={handlePress}
            entering={FadeIn?.duration(150)}
            exiting={FadeOut?.duration(150)}
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
          </SafeAnimatedPressable>
        )}
      </SafeAnimatedView>

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
