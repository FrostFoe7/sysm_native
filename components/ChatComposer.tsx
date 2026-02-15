// components/ChatComposer.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Pressable, TextInput, View, Platform, Animated } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Send, Image as ImageIcon, Mic, Smile, X, Camera, Square, Trash2 } from 'lucide-react-native';
import { MAX_MESSAGE_LENGTH, REACTION_EMOJIS } from '@/constants/app';
import { VoiceService } from '@/services/voice.service';
import type { MessageWithSender } from '@/types/types';

interface ChatComposerProps {
  onSend: (text: string) => void;
  onSendVoice?: (uri: string, durationMs: number) => void;
  onSendImage?: () => void;
  onTyping?: () => void;
  replyingTo: MessageWithSender | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

export function ChatComposer({
  onSend,
  onSendVoice,
  onSendImage,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled,
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([]);
  const inputRef = useRef<TextInput>(null);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const meteringTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation during recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmojiPicker(false);
  }, [text, onSend]);

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value);
      onTyping?.();
    },
    [onTyping],
  );

  // Desktop: Enter sends, Shift+Enter inserts newline
  const handleKeyPress = useCallback(
    (e: any) => {
      if (Platform.OS !== 'web') return;
      const nativeEvent = e.nativeEvent;
      if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setText((prev) => prev + emoji);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    },
    [],
  );

  // ─── Voice Recording ───────────────────────────────────────────────────────

  const startVoiceRecording = useCallback(async () => {
    const started = await VoiceService.startRecording();
    if (!started) return;

    setIsRecording(true);
    setRecordingDuration(0);
    setWaveformLevels([]);

    // Duration counter
    recordingTimer.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 100);
    }, 100);

    // Metering for waveform
    meteringTimer.current = setInterval(async () => {
      const metering = await VoiceService.getRecordingMetering();
      // Normalize from dB (-160 to 0) to 0-1 range
      const normalized = Math.max(0, Math.min(1, (metering + 60) / 60));
      setWaveformLevels((prev) => [...prev.slice(-30), normalized]);
    }, 100);
  }, []);

  const stopVoiceRecording = useCallback(async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    if (meteringTimer.current) clearInterval(meteringTimer.current);

    const result = await VoiceService.stopRecording();
    setIsRecording(false);

    if (result && result.durationMs > 500 && onSendVoice) {
      onSendVoice(result.uri, result.durationMs);
    }
  }, [onSendVoice]);

  const cancelVoiceRecording = useCallback(async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    if (meteringTimer.current) clearInterval(meteringTimer.current);

    await VoiceService.cancelRecording();
    setIsRecording(false);
    setRecordingDuration(0);
    setWaveformLevels([]);
  }, []);

  const hasText = text.trim().length > 0;

  // Recording UI
  if (isRecording) {
    return (
      <View className="border-t border-brand-border bg-brand-dark">
        <HStack className="items-center px-3 py-3" space="sm">
          {/* Cancel button */}
          <Pressable
            onPress={cancelVoiceRecording}
            className="rounded-full bg-red-500/20 p-2 active:bg-red-500/40"
          >
            <Trash2 size={20} color="#ef4444" />
          </Pressable>

          {/* Waveform + duration */}
          <View className="flex-1 flex-row items-center rounded-full bg-brand-border px-4 py-2.5">
            <Animated.View
              style={{ transform: [{ scale: pulseAnim }] }}
              className="mr-2 size-3 rounded-full bg-red-500"
            />
            <View className="mr-2 flex-1 flex-row items-center" style={{ height: 24 }}>
              {waveformLevels.map((level, i) => (
                <View
                  key={i}
                  className="mx-[1px] rounded-full bg-brand-blue"
                  style={{
                    width: 3,
                    height: Math.max(4, level * 24),
                  }}
                />
              ))}
            </View>
            <Text className="text-[13px] font-medium text-brand-light">
              {VoiceService.formatDuration(recordingDuration)}
            </Text>
          </View>

          {/* Stop & send button */}
          <Pressable
            onPress={stopVoiceRecording}
            className="items-center justify-center rounded-full bg-brand-blue p-2.5 active:opacity-80"
          >
            <Send size={18} color="white" />
          </Pressable>
        </HStack>
      </View>
    );
  }

  return (
    <View className="border-t border-brand-border bg-brand-dark">
      {/* Reply preview bar */}
      {replyingTo && (
        <HStack className="items-center border-b border-brand-border px-4 py-2" space="sm">
          <View className="h-full w-[3px] rounded-full bg-brand-blue" />
          <VStack className="flex-1">
            <Text className="text-[11px] font-semibold text-brand-blue">
              Replying to {replyingTo.sender.display_name}
            </Text>
            <Text className="text-[12px] text-[#777]" numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </VStack>
          <Pressable
            onPress={onCancelReply}
            className="rounded-full p-1 active:bg-white/10"
          >
            <X size={16} color="brand-muted" />
          </Pressable>
        </HStack>
      )}

      {/* Emoji quick picker */}
      {showEmojiPicker && (
        <HStack className="border-b border-brand-border px-4 py-2" space="sm">
          {REACTION_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleEmojiSelect(emoji)}
              className="rounded-full p-1 active:bg-white/10"
            >
              <Text className="text-[22px]">{emoji}</Text>
            </Pressable>
          ))}
          {['😊', '🎉', '💀', '👀', '✨', '💜'].map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleEmojiSelect(emoji)}
              className="rounded-full p-1 active:bg-white/10"
            >
              <Text className="text-[22px]">{emoji}</Text>
            </Pressable>
          ))}
        </HStack>
      )}

      {/* Input row */}
      <HStack className="items-end px-3 py-2" space="sm">
        {/* Camera button */}
        <Pressable
          className="mb-1 rounded-full p-1.5 active:bg-white/10"
          onPress={onSendImage}
        >
          <Camera size={22} color="brand-blue" />
        </Pressable>

        {/* Text input */}
        <View className="min-h-[40px] flex-1 flex-row items-center rounded-full border border-[#333] bg-brand-border px-4 py-1.5">
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleChangeText}
            placeholder="Message..."
            placeholderTextColor="brand-muted"
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            className="max-h-[100px] flex-1 text-[15px] text-brand-light"
            style={{
              paddingTop: Platform.OS === 'ios' ? 8 : 4,
              paddingBottom: Platform.OS === 'ios' ? 8 : 4,
            }}
            editable={!disabled}
            onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
            blurOnSubmit={false}
          />
          <Pressable
            className="ml-2 p-1 active:opacity-60"
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={20} color="brand-muted" />
          </Pressable>
        </View>

        {/* Send or mic button */}
        {hasText ? (
          <Pressable
            className="mb-1 items-center justify-center rounded-full bg-brand-blue p-2 active:opacity-80"
            onPress={handleSend}
          >
            <Send size={18} color="white" />
          </Pressable>
        ) : (
          <Pressable
            className="mb-1 rounded-full p-1.5 active:bg-white/10"
            onLongPress={startVoiceRecording}
            onPress={startVoiceRecording}
            delayLongPress={200}
          >
            <Mic size={22} color="brand-light" />
          </Pressable>
        )}
      </HStack>
    </View>
  );
}
