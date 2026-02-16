// components/VideoPlayer.tsx

import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import {
  useVideoPlayer,
  VideoView,
  VideoPlayer as VideoPlayerType,
} from "expo-video";
import { PlayIcon } from "@/constants/icons";
import { Volume2, VolumeX } from "lucide-react-native";

interface VideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  style?: any;
}

export function VideoPlayer({
  uri,
  thumbnailUri,
  autoPlay = false,
  loop = true,
  muted: initialMuted = true,
  style,
}: VideoPlayerProps) {
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isPaused, setIsPaused] = useState(!autoPlay);

  const player = useVideoPlayer(uri, (p: VideoPlayerType) => {
    p.loop = loop;
    p.muted = isMuted;
    if (autoPlay) {
      p.play();
    }
  });

  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;
  }, [isMuted, player]);

  const togglePlay = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
      setIsPaused(true);
    } else {
      player.play();
      setIsPaused(false);
    }
  };

  const toggleMute = (e: any) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <View style={[styles.container, style]}>
      <Pressable onPress={togglePlay} style={styles.pressable}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="cover"
        />

        {/* Play Overlay */}
        {isPaused && (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.playButton}>
              <PlayIcon size={24} color="#ffffff" />
            </View>
          </View>
        )}

        {/* Mute toggle - small icon at bottom right */}
        <Pressable onPress={toggleMute} style={styles.muteButton} hitSlop={10}>
          {isMuted ? (
            <VolumeX size={14} color="#ffffff" />
          ) : (
            <Volume2 size={14} color="#ffffff" />
          )}
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
  },
  pressable: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  muteButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});
