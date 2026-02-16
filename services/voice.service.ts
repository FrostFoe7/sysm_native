// services/voice.service.ts
// Voice note recording, upload, and playback service.
// Uses expo-av for recording + playback, Supabase Storage for persistence.
// Singleton playback — only one audio plays at a time.

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { supabase, getCachedUserId } from "./supabase";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface VoiceRecordingResult {
  uri: string;
  durationMs: number;
  fileSize: number;
}

export interface VoiceUploadResult {
  audioUrl: string;
  durationMs: number;
}

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused";

export interface PlaybackState {
  messageId: string | null;
  status: PlaybackStatus;
  positionMs: number;
  durationMs: number;
}

type PlaybackListener = (state: PlaybackState) => void;

// ─── Recording ──────────────────────────────────────────────────────────────────

let _recording: Audio.Recording | null = null;
let _recordingStartTime = 0;

/**
 * Start recording a voice note.
 * - Configures audio session for recording
 * - Haptic feedback on start
 * - Returns false if permission denied
 */
async function startRecording(): Promise<boolean> {
  try {
    // Request permission
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return false;

    // Configure audio session
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Stop any current playback
    await stopPlayback();

    // Start recording
    const { recording } = await Audio.Recording.createAsync({
      isMeteringEnabled: true,
      android: {
        extension: ".m4a",
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: ".m4a",
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      web: {
        mimeType: "audio/webm",
        bitsPerSecond: 128000,
      },
    });

    _recording = recording;
    _recordingStartTime = Date.now();

    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    return true;
  } catch (error) {
    console.error("Failed to start recording:", error);
    return false;
  }
}

/**
 * Stop recording and return the result.
 * - Haptic feedback on stop
 * - Returns null if recording was cancelled/failed
 */
async function stopRecording(): Promise<VoiceRecordingResult | null> {
  if (!_recording) return null;

  try {
    await _recording.stopAndUnloadAsync();

    // Reset audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      playsInSilentModeIOS: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
    });

    const uri = _recording.getURI();
    const status = await _recording.getStatusAsync();
    const durationMs =
      status.durationMillis ?? Date.now() - _recordingStartTime;

    _recording = null;

    if (!uri) return null;

    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    return {
      uri,
      durationMs,
      fileSize: 0, // Will be determined during upload
    };
  } catch (error) {
    console.error("Failed to stop recording:", error);
    _recording = null;
    return null;
  }
}

/**
 * Cancel an in-progress recording without saving.
 */
async function cancelRecording(): Promise<void> {
  if (!_recording) return;

  try {
    await _recording.stopAndUnloadAsync();
  } catch {
    // Ignore errors during cancellation
  }

  _recording = null;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    playsInSilentModeIOS: true,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
  });
}

/**
 * Check if currently recording.
 */
function isRecording(): boolean {
  return _recording !== null;
}

/**
 * Get current recording metering data (for waveform visualization).
 */
async function getRecordingMetering(): Promise<number> {
  if (!_recording) return -160;

  try {
    const status = await _recording.getStatusAsync();
    if (status.isRecording && status.metering !== undefined) {
      return status.metering; // dB value, typically -160 to 0
    }
  } catch {
    // Ignore
  }
  return -160;
}

// ─── Upload ─────────────────────────────────────────────────────────────────────

/**
 * Upload a voice recording to Supabase Storage.
 * Path: chat-audio/{conversationId}/{userId}/{timestamp}.m4a
 */
async function uploadVoiceNote(
  conversationId: string,
  recording: VoiceRecordingResult,
): Promise<VoiceUploadResult> {
  const userId = await getCachedUserId();
  const timestamp = Date.now();
  const extension = Platform.OS === "web" ? "webm" : "m4a";
  const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/mp4";
  const filePath = `${conversationId}/${userId}/${timestamp}.${extension}`;

  // Read file as blob
  const response = await fetch(recording.uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from("chat-audio")
    .upload(filePath, blob, {
      contentType: mimeType,
      cacheControl: "31536000", // 1 year cache
      upsert: false,
    });

  if (error) throw error;

  // Get signed URL (private bucket)
  const { data: urlData } = await supabase.storage
    .from("chat-audio")
    .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year

  if (!urlData?.signedUrl) throw new Error("Failed to get signed URL");

  return {
    audioUrl: urlData.signedUrl,
    durationMs: recording.durationMs,
  };
}

// ─── Playback (singleton) ───────────────────────────────────────────────────────

let _sound: Audio.Sound | null = null;
let _currentPlayingMessageId: string | null = null;
let _playbackListeners: PlaybackListener[] = [];
let _playbackState: PlaybackState = {
  messageId: null,
  status: "idle",
  positionMs: 0,
  durationMs: 0,
};

function emitPlaybackState(partial: Partial<PlaybackState>) {
  _playbackState = { ..._playbackState, ...partial };
  for (const listener of _playbackListeners) {
    listener(_playbackState);
  }
}

/**
 * Subscribe to playback state changes.
 * Returns unsubscribe function.
 */
function addPlaybackListener(listener: PlaybackListener): () => void {
  _playbackListeners.push(listener);
  // Emit current state immediately
  listener(_playbackState);
  return () => {
    _playbackListeners = _playbackListeners.filter((l) => l !== listener);
  };
}

/**
 * Play a voice note by URL.
 * - Stops any currently playing audio first (singleton)
 * - Tracks progress for scrubber UI
 */
async function playAudio(messageId: string, audioUrl: string): Promise<void> {
  // If same message, toggle play/pause
  if (_currentPlayingMessageId === messageId && _sound) {
    const status = await _sound.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await _sound.pauseAsync();
        emitPlaybackState({ status: "paused" });
        return;
      } else {
        await _sound.playAsync();
        emitPlaybackState({ status: "playing" });
        return;
      }
    }
  }

  // Stop current playback
  await stopPlayback();

  emitPlaybackState({
    messageId,
    status: "loading",
    positionMs: 0,
    durationMs: 0,
  });

  try {
    // Configure for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      playsInSilentModeIOS: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true, progressUpdateIntervalMillis: 100 },
      onPlaybackStatusUpdate,
    );

    _sound = sound;
    _currentPlayingMessageId = messageId;

    emitPlaybackState({ status: "playing" });
  } catch (error) {
    console.error("Failed to play audio:", error);
    emitPlaybackState({
      messageId: null,
      status: "idle",
      positionMs: 0,
      durationMs: 0,
    });
  }
}

function onPlaybackStatusUpdate(status: any) {
  if (!status.isLoaded) {
    if (status.error) {
      console.error("Playback error:", status.error);
      emitPlaybackState({
        messageId: null,
        status: "idle",
        positionMs: 0,
        durationMs: 0,
      });
    }
    return;
  }

  emitPlaybackState({
    positionMs: status.positionMillis ?? 0,
    durationMs: status.durationMillis ?? 0,
    status: status.isPlaying
      ? "playing"
      : status.didJustFinish
        ? "idle"
        : "paused",
  });

  // Auto-cleanup when finished
  if (status.didJustFinish) {
    _currentPlayingMessageId = null;
    emitPlaybackState({
      messageId: null,
      status: "idle",
      positionMs: 0,
      durationMs: 0,
    });
    _sound?.unloadAsync().catch(() => {});
    _sound = null;
  }
}

/**
 * Seek to a position in the current audio.
 */
async function seekTo(positionMs: number): Promise<void> {
  if (!_sound) return;
  try {
    await _sound.setPositionAsync(positionMs);
    emitPlaybackState({ positionMs });
  } catch {
    // Ignore
  }
}

/**
 * Stop current playback and clean up.
 */
async function stopPlayback(): Promise<void> {
  if (_sound) {
    try {
      await _sound.stopAsync();
      await _sound.unloadAsync();
    } catch {
      // Ignore cleanup errors
    }
    _sound = null;
  }
  _currentPlayingMessageId = null;
  emitPlaybackState({
    messageId: null,
    status: "idle",
    positionMs: 0,
    durationMs: 0,
  });
}

/**
 * Prefetch an audio URL for smoother playback.
 */
async function prefetchAudio(audioUrl: string): Promise<void> {
  try {
    // Use fetch to warm the cache
    await fetch(audioUrl, { method: "HEAD" });
  } catch {
    // Non-critical
  }
}

/**
 * Format duration in ms to mm:ss string.
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export const VoiceService = {
  // Recording
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  getRecordingMetering,

  // Upload
  uploadVoiceNote,

  // Playback
  playAudio,
  seekTo,
  stopPlayback,
  prefetchAudio,
  addPlaybackListener,

  // Helpers
  formatDuration,
};
