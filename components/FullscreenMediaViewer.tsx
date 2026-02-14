// components/FullscreenMediaViewer.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, VideoPlayer as VideoPlayerType } from 'expo-video';
import { Text } from '@/components/ui/text';
import { X, ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from 'lucide-react-native';
import { 
  isWeb, 
  SafeAnimatedView,
  FadeIn,
  FadeOut
} from '@/utils/animatedWebSafe';
import type { MediaItem } from '@/db/db';

interface FullscreenMediaViewerProps {
  isOpen: boolean;
  media: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

function FullscreenVideo({ uri, isActive }: { uri: string; isActive: boolean }) {
  const [isMuted, setIsMuted] = useState(true); // Start muted on web
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(uri, (p: VideoPlayerType) => {
    p.loop = true;
    p.muted = isWeb ? true : true;
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playingChange', ({ isPlaying }: { isPlaying: boolean }) => {
      setIsPlaying(isPlaying);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!player || isWeb) return;
    try {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [isActive, player]);

  const togglePlay = useCallback(() => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, isPlaying]);

  const toggleMute = useCallback(() => {
    if (!player) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    player.muted = newMuted;
  }, [player, isMuted]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Pressable onPress={togglePlay} style={{ width: '100%', height: '100%' }}>
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          nativeControls={false}
          contentFit="contain"
        />
      </Pressable>

      {/* Play/Pause center overlay */}
      {!isPlaying && (
        <SafeAnimatedView
          entering={FadeIn?.duration(150)}
          exiting={FadeOut?.duration(150)}
          pointerEvents="none"
          style={{
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Play size={28} color="#ffffff" fill="#ffffff" />
          </View>
        </SafeAnimatedView>
      )}

      {/* Mute button */}
      <Pressable
        onPress={toggleMute}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        hitSlop={8}
      >
        {isMuted ? (
          <VolumeX size={18} color="#ffffff" />
        ) : (
          <Volume2 size={18} color="#ffffff" />
        )}
      </Pressable>
    </View>
  );
}

export function FullscreenMediaViewer({
  isOpen,
  media,
  initialIndex = 0,
  onClose,
}: FullscreenMediaViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const isDesktop = isWeb && width >= 768;

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
      }, 50);
    }
  }, [isOpen, initialIndex, width]);

  useEffect(() => {
    if (!isWeb || !isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => {
          const next = Math.max(0, prev - 1);
          scrollRef.current?.scrollTo({ x: next * width, animated: true });
          return next;
        });
      } else if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => {
          const next = Math.min(media.length - 1, prev + 1);
          scrollRef.current?.scrollTo({ x: next * width, animated: true });
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, media.length, onClose, width]);

  const handleScroll = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / width);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < media.length) {
        setActiveIndex(newIndex);
      }
    },
    [width, activeIndex, media.length],
  );

  const goLeft = useCallback(() => {
    const next = Math.max(0, activeIndex - 1);
    setActiveIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  }, [activeIndex, width]);

  const goRight = useCallback(() => {
    const next = Math.min(media.length - 1, activeIndex + 1);
    setActiveIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  }, [activeIndex, media.length, width]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 56 : 16,
            left: 16,
            zIndex: 100,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.15)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={8}
        >
          <X size={20} color="#ffffff" />
        </Pressable>

        {media.length > 1 && (
          <View
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 62 : 22,
              alignSelf: 'center',
              zIndex: 100,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <Text className="text-[13px] font-semibold text-white">
              {activeIndex + 1} / {media.length}
            </Text>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: width * media.length }}
        >
          {media.map((item, i) => (
            <View key={i} style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
              {item.type === 'video' ? (
                <FullscreenVideo uri={item.uri} isActive={activeIndex === i} />
              ) : (
                <Pressable style={{ width: '100%', height: '100%', justifyContent: 'center' }}>
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: '100%', height: '80%' }}
                    contentFit="contain"
                    transition={200}
                  />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>

        {isDesktop && media.length > 1 && (
          <>
            {activeIndex > 0 && (
              <Pressable
                onPress={goLeft}
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: [{ translateY: -24 }],
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 100,
                }}
              >
                <ChevronLeft size={24} color="#ffffff" />
              </Pressable>
            )}
            {activeIndex < media.length - 1 && (
              <Pressable
                onPress={goRight}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: [{ translateY: -24 }],
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 100,
                }}
              >
                <ChevronRight size={24} color="#ffffff" />
              </Pressable>
            )}
          </>
        )}

        {media.length > 1 && (
          <View
            style={{
              position: 'absolute',
              bottom: Platform.OS === 'ios' ? 40 : 24,
              alignSelf: 'center',
              flexDirection: 'row',
              gap: 6,
              zIndex: 100,
            }}
          >
            {media.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === activeIndex ? '#ffffff' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}
