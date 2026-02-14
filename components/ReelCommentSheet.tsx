// components/ReelCommentSheet.tsx
// Fullscreen comment bottom sheet for Reels

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';
import { X, Heart, Send } from 'lucide-react-native';
import { ReelService } from '@/services/reel.service';
import { UserService } from '@/services/user.service';
import { formatRelativeTime, formatCount } from '@/services/format';
import type { ReelCommentWithAuthor } from '@/types/types';

interface ReelCommentSheetProps {
  isOpen: boolean;
  reelId: string;
  commentCount: number;
  onClose: () => void;
  onCommentAdded?: () => void;
}

const EMOJI_ROW = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

function CommentItem({ comment }: { comment: ReelCommentWithAuthor }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <HStack className="px-4 py-3" space="sm" style={{ alignItems: 'flex-start' }}>
      <Avatar size="xs">
        <AvatarImage source={{ uri: comment.author.avatar_url }} />
      </Avatar>
      <VStack className="flex-1" space="xs">
        <HStack space="sm" style={{ alignItems: 'center' }}>
          <Text className="text-[13px] font-semibold text-brand-light">
            {comment.author.username}
          </Text>
          <Text className="text-[11px] text-brand-muted">
            {formatRelativeTime(comment.createdAt)}
          </Text>
        </HStack>
        <Text className="text-[14px] text-[#d0d0d0] leading-[20px]">
          {comment.content}
        </Text>
        <HStack space="md" style={{ alignItems: 'center', marginTop: 2 }}>
          <Pressable onPress={toggleLike} hitSlop={8}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <Heart
                size={14}
                color={liked ? 'brand-red' : 'brand-muted-alt'}
                fill={liked ? 'brand-red' : 'transparent'}
                strokeWidth={liked ? 0 : 1.8}
              />
              {likeCount > 0 && (
                <Text className="text-[12px] text-brand-muted-alt">
                  {formatCount(likeCount)}
                </Text>
              )}
            </HStack>
          </Pressable>
          <Pressable hitSlop={8}>
            <Text className="text-[12px] text-brand-muted-alt font-medium">Reply</Text>
          </Pressable>
        </HStack>
      </VStack>
    </HStack>
  );
}

export function ReelCommentSheet({
  isOpen,
  reelId,
  commentCount: initialCount,
  onClose,
  onCommentAdded,
}: ReelCommentSheetProps) {
  const [comments, setComments] = useState<ReelCommentWithAuthor[]>([]);
  const [text, setText] = useState('');
  const [count, setCount] = useState(initialCount);
  const inputRef = useRef<TextInput>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    UserService.getCurrentUser().then(setCurrentUser).catch(console.error);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newComment = await ReelService.addComment(reelId, trimmed);
    setComments((prev) => [...prev, newComment]);
    setCount((p) => p + 1);
    setText('');
    onCommentAdded?.();
  }, [text, reelId, onCommentAdded]);

  const handleEmojiPress = useCallback(
    (emoji: string) => {
      setText((prev) => prev + emoji);
      inputRef.current?.focus();
    },
    [],
  );

  const refreshComments = useCallback(async () => {
    const c = await ReelService.getComments(reelId);
    setComments(c);
  }, [reelId]);

  // Refresh comments when sheet opens
  React.useEffect(() => {
    if (isOpen) {
      refreshComments();
      setCount(initialCount);
    }
  }, [isOpen, reelId, initialCount, refreshComments]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={isOpen}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1a1a1a',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '70%',
              minHeight: 400,
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#444444',
                }}
              />
            </View>

            {/* Header */}
            <HStack
              className="px-4 py-3"
              style={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text className="text-[16px] font-bold text-brand-light">
                Comments ({formatCount(count)})
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={22} color="brand-muted-alt" strokeWidth={2} />
              </Pressable>
            </HStack>

            <Divider className="bg-brand-border-secondary" />

            {/* Comments list */}
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <CommentItem comment={item} />}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text className="text-[15px] text-brand-muted">No comments yet</Text>
                  <Text className="text-[13px] text-[#444444] mt-1">
                    Start the conversation.
                  </Text>
                </View>
              }
            />

            <Divider className="bg-brand-border-secondary" />

            {/* Emoji row */}
            <HStack className="px-4 py-2" space="sm">
              {EMOJI_ROW.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => handleEmojiPress(emoji)}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </Pressable>
              ))}
            </HStack>

            {/* Input */}
            <HStack
              className="px-4 pb-6 pt-2"
              space="sm"
              style={{ alignItems: 'center' }}
            >
              <Avatar size="xs">
                <AvatarImage source={{ uri: currentUser.avatar_url }} />
              </Avatar>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'brand-border-secondary',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: Platform.OS === 'web' ? 8 : 6,
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder="Add a comment..."
                  placeholderTextColor="brand-muted"
                  style={{
                    flex: 1,
                    color: 'brand-light',
                    fontSize: 14,
                    maxHeight: 80,
                    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
                  }}
                  multiline
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  blurOnSubmit
                />
                {text.trim().length > 0 && (
                  <Pressable onPress={handleSend} hitSlop={8} style={{ marginLeft: 8 }}>
                    <Send size={18} color="brand-blue" strokeWidth={2} />
                  </Pressable>
                )}
              </View>
            </HStack>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
