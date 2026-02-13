// app/thread/[id].tsx

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  FlatList,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThreadCard } from '@/components/ThreadCard';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Divider } from '@/components/ui/divider';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import {
  getThreadDetail,
  getThreadAncestors,
  isThreadLikedByCurrentUser,
  toggleThreadLike,
  createReply,
  getCurrentUser,
  formatFullDate,
} from '@/db/selectors';
import { Send } from 'lucide-react-native';
import type { ThreadWithAuthor, ThreadWithReplies } from '@/db/db';

type ListItem =
  | { type: 'ancestor'; thread: ThreadWithAuthor }
  | { type: 'main'; thread: ThreadWithReplies }
  | { type: 'reply-header' }
  | { type: 'reply'; thread: ThreadWithAuthor };

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const [replyText, setReplyText] = useState('');
  const [detail, setDetail] = useState<ThreadWithReplies | null>(null);
  const [ancestors, setAncestors] = useState<ThreadWithAuthor[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [threadLikeCounts, setThreadLikeCounts] = useState<Record<string, number>>({});

  const currentUser = useMemo(() => getCurrentUser(), []);

  const loadData = useCallback(() => {
    if (!id) return;
    const d = getThreadDetail(id);
    setDetail(d);
    setAncestors(getThreadAncestors(id));
    // Pre-populate like states
    if (d) {
      const allThreads = [d, ...d.replies];
      const newLiked: Record<string, boolean> = {};
      for (const t of allThreads) {
        if (!(t.id in likedMap)) {
          newLiked[t.id] = isThreadLikedByCurrentUser(t.id);
        }
      }
      if (Object.keys(newLiked).length > 0) {
        setLikedMap((prev) => ({ ...prev, ...newLiked }));
      }
    }
  }, [id]);

  // Load on mount and when id changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-sync on focus (returning from nested navigation)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleLike = useCallback((threadId: string) => {
    const result = toggleThreadLike(threadId);
    setLikedMap((prev) => ({ ...prev, [threadId]: result.liked }));
    setThreadLikeCounts((prev) => ({ ...prev, [threadId]: result.likeCount }));
    // Update detail if it's the main thread
    setDetail((prev) => {
      if (!prev) return prev;
      if (prev.id === threadId) {
        return { ...prev, like_count: result.likeCount };
      }
      return {
        ...prev,
        replies: prev.replies.map((r) =>
          r.id === threadId ? { ...r, like_count: result.likeCount } : r,
        ),
      };
    });
  }, []);

  const handleReply = useCallback(
    (threadId: string) => {
      if (threadId === id) {
        inputRef.current?.focus();
      } else {
        router.push(`/thread/${threadId}`);
      }
    },
    [id, router],
  );

  const handleSubmitReply = useCallback(() => {
    if (!id || !replyText.trim()) return;
    const newReply = createReply(id, replyText.trim());
    setReplyText('');
    // Optimistically update the detail
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reply_count: prev.reply_count + 1,
        replies: [...prev.replies, newReply],
      };
    });
    // Scroll to newly added reply
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [id, replyText]);

  if (!detail) {
    return (
      <View className="flex-1 bg-[#101010] items-center justify-center">
        <Spinner size="large" className="text-[#555555]" />
      </View>
    );
  }

  const listData: ListItem[] = [
    ...ancestors.map((t) => ({ type: 'ancestor' as const, thread: t })),
    { type: 'main' as const, thread: detail },
    { type: 'reply-header' as const },
    ...detail.replies.map((t) => ({ type: 'reply' as const, thread: t })),
  ];

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'ancestor') {
      return (
        <ThreadCard
          thread={{
            ...item.thread,
            like_count: threadLikeCounts[item.thread.id] ?? item.thread.like_count,
          }}
          isLiked={likedMap[item.thread.id] ?? isThreadLikedByCurrentUser(item.thread.id)}
          onLike={handleLike}
          onReply={handleReply}
          showDivider={false}
        />
      );
    }

    if (item.type === 'main') {
      return (
        <View>
          <ThreadCard
            thread={{
              ...item.thread,
              like_count: threadLikeCounts[item.thread.id] ?? item.thread.like_count,
            }}
            isLiked={likedMap[item.thread.id] ?? isThreadLikedByCurrentUser(item.thread.id)}
            onLike={handleLike}
            onReply={() => inputRef.current?.focus()}
            showDivider={false}
            isDetailView
          />
          <View className="px-4 pb-2">
            <Text className="text-[#555555] text-[13px]">
              {formatFullDate(item.thread.created_at)}
            </Text>
          </View>
          <Divider className="bg-[#1e1e1e]" />
        </View>
      );
    }

    if (item.type === 'reply-header') {
      if (detail.replies.length === 0) {
        return (
          <View className="items-center justify-center py-12">
            <Text className="text-[#555555] text-[15px]">No replies yet</Text>
            <Text className="text-[#444444] text-[13px] mt-1">Be the first to reply</Text>
          </View>
        );
      }
      return null;
    }

    if (item.type === 'reply') {
      return (
        <ThreadCard
          thread={{
            ...item.thread,
            like_count: threadLikeCounts[item.thread.id] ?? item.thread.like_count,
          }}
          isLiked={likedMap[item.thread.id] ?? isThreadLikedByCurrentUser(item.thread.id)}
          onLike={handleLike}
          onReply={handleReply}
          showDivider={index < listData.length - 1 && listData[index + 1]?.type === 'reply'}
        />
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#101010]"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Box className={`flex-1 ${Platform.OS === 'web' ? 'max-w-[680px] self-center w-full' : ''}`}>
        <FlatList
          ref={flatListRef}
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, index) => {
            if (item.type === 'reply-header') return 'reply-header';
            if ('thread' in item) return `${item.type}-${item.thread.id}`;
            return `item-${index}`;
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
        />

        <Divider className="bg-[#1e1e1e]" />
        <HStack className="px-4 py-2 items-center bg-[#101010]" space="md">
          <Avatar size="xs">
            <AvatarImage source={{ uri: currentUser.avatar_url }} />
            <AvatarFallbackText>{currentUser.display_name}</AvatarFallbackText>
          </Avatar>
          <TextInput
            ref={inputRef}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={`Reply to ${detail.author.username}...`}
            placeholderTextColor="#555555"
            className="flex-1 text-[#f3f5f7] text-[15px] h-[36px]"
            style={Platform.OS === 'web' ? { outlineStyle: 'none' as any } : undefined}
            returnKeyType="send"
            onSubmitEditing={handleSubmitReply}
          />
          <Pressable
            onPress={handleSubmitReply}
            disabled={!replyText.trim()}
            className={`p-2 rounded-full ${replyText.trim() ? 'active:bg-white/10' : 'opacity-40'}`}
            hitSlop={8}
          >
            <Send
              size={20}
              color={replyText.trim() ? '#0095f6' : '#555555'}
              strokeWidth={2}
            />
          </Pressable>
        </HStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
