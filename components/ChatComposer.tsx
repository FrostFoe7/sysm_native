// components/ChatComposer.tsx

import React, { useState, useCallback, useRef } from 'react';
import { Pressable, TextInput, View, Platform, KeyboardAvoidingView } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Send, Image as ImageIcon, Mic, Smile, X, Camera } from 'lucide-react-native';
import { MAX_MESSAGE_LENGTH, REACTION_EMOJIS } from '@/constants/app';
import type { MessageWithSender } from '@/types/types';

interface ChatComposerProps {
  onSend: (text: string) => void;
  onSendImage?: () => void;
  replyingTo: MessageWithSender | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

export function ChatComposer({
  onSend,
  onSendImage,
  replyingTo,
  onCancelReply,
  disabled,
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmojiPicker(false);
  }, [text, onSend]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setText((prev) => prev + emoji);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    },
    [],
  );

  const hasText = text.trim().length > 0;

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
            onChangeText={setText}
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
            onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
            blurOnSubmit={Platform.OS === 'web'}
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
          <Pressable className="mb-1 rounded-full p-1.5 active:bg-white/10">
            <Mic size={22} color="brand-light" />
          </Pressable>
        )}
      </HStack>
    </View>
  );
}
