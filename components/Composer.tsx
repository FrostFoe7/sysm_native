// components/Composer.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TextInput, Pressable, Platform, KeyboardAvoidingView, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonText } from '@/components/ui/button';
import { getCurrentUser } from '@/db/selectors';
import { ImagePlus, BarChart3, Hash, AtSign } from 'lucide-react-native';

interface ComposerProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  replyToUsername?: string;
  autoFocus?: boolean;
}

export function Composer({
  onSubmit,
  placeholder = "What's new?",
  replyToUsername,
  autoFocus = true,
}: ComposerProps) {
  const [content, setContent] = useState('');
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const currentUser = getCurrentUser();
  const maxLength = 500;
  const remaining = maxLength - content.length;

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setContent('');
  }, [content, onSubmit]);

  // Ctrl/Cmd + Enter to submit on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const trimmed = content.trim();
        if (trimmed.length > 0 && maxLength - trimmed.length >= 0) {
          onSubmit(trimmed);
          setContent('');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [content, onSubmit]);

  const handleCancel = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  // Esc to cancel on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (router.canGoBack()) {
          router.back();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  const isValid = content.trim().length > 0 && remaining >= 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <VStack className="flex-1 bg-[#181818]">
        {/* Composer body */}
        <HStack className="px-4 pt-4 flex-1" space="md">
          {/* Avatar column */}
          <VStack className="items-center">
            <Avatar size="sm">
              <AvatarImage source={{ uri: currentUser.avatar_url }} />
              <AvatarFallbackText>{currentUser.display_name}</AvatarFallbackText>
            </Avatar>
            <Box className="flex-1 w-[2px] bg-[#2a2a2a] mt-2 rounded-full min-h-[24px]" />
          </VStack>

          {/* Input column */}
          <VStack className="flex-1 flex-shrink" space="xs">
            <Text className="text-[#f3f5f7] font-semibold text-[15px]">
              {currentUser.username}
            </Text>
            {replyToUsername && (
              <Text className="text-[#555555] text-[13px]">
                Replying to{' '}
                <Text className="text-[#0095f6] text-[13px]">
                  @{replyToUsername}
                </Text>
              </Text>
            )}
            <TextInput
              ref={inputRef}
              value={content}
              onChangeText={setContent}
              placeholder={
                replyToUsername
                  ? `Reply to ${replyToUsername}...`
                  : placeholder
              }
              placeholderTextColor="#555555"
              multiline
              autoFocus={autoFocus}
              maxLength={maxLength}
              className="text-[#f3f5f7] text-[15px] leading-[21px] min-h-[80px] py-1"
              style={{
                textAlignVertical: 'top',
                ...(Platform.OS === 'web'
                  ? { outlineStyle: 'none' as any }
                  : {}),
                overflow: 'hidden',
              }}
            />

            {/* Toolbar */}
            <HStack className="items-center mt-2" space="lg">
              <Pressable hitSlop={8} className="active:opacity-60">
                <ImagePlus size={20} color="#555555" strokeWidth={1.8} />
              </Pressable>
              <Pressable hitSlop={8} className="active:opacity-60">
                <Hash size={20} color="#555555" strokeWidth={1.8} />
              </Pressable>
              <Pressable hitSlop={8} className="active:opacity-60">
                <BarChart3 size={20} color="#555555" strokeWidth={1.8} />
              </Pressable>
              <Pressable hitSlop={8} className="active:opacity-60">
                <AtSign size={20} color="#555555" strokeWidth={1.8} />
              </Pressable>
            </HStack>
          </VStack>
        </HStack>

        <Divider className="bg-[#1e1e1e]" />

        {/* Bottom bar */}
        <HStack className="px-4 py-3 pb-4 items-center justify-between">
          <Text className="text-[#555555] text-[13px]">
            Anyone can reply & quote
          </Text>
          <HStack className="items-center" space="md">
            {content.length > 0 && (
              <Text
                className={`text-[13px] ${
                  remaining < 20 ? 'text-[#ff3040]' : 'text-[#555555]'
                }`}
              >
                {remaining}
              </Text>
            )}
            <Button
              size="sm"
              onPress={handleSubmit}
              disabled={!isValid}
              className={`rounded-full px-5 h-9 ${
                isValid
                  ? 'bg-white'
                  : 'bg-[#333333]'
              }`}
            >
              <ButtonText
                className={`text-[14px] font-semibold ${
                  isValid ? 'text-black' : 'text-[#666666]'
                }`}
              >
                Post
              </ButtonText>
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </KeyboardAvoidingView>
  );
}
