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
import { ShareSheet } from '@/components/ShareSheet';
import { ThreadOverflowMenu } from '@/components/ThreadOverflowMenu';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Divider } from '@/components/ui/divider';
import { Box } from '@/components/ui/box';
import {
  getThreadDetail,
  getThreadAncestors,
  isThreadLikedByCurrentUser,
  isRepostedByCurrentUser,
  toggleThreadLike,
  toggleRepost,
  createReply,
  getCurrentUser,
  formatFullDate,
} from '@/db/selectors';
import { Send } from 'lucide-react-native';
import { ThreadDetailSkeleton } from '@/components/skeletons';
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
  const [repostMap, setRepostMap] = useState<Record<string, boolean>>({});
  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);
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
      const newReposted: Record<string, boolean> = {};
      for (const t of allThreads) {
        if (!(t.id in likedMap)) {
          newLiked[t.id] = isThreadLikedByCurrentUser(t.id);
        }
        if (!(t.id in repostMap)) {
          newReposted[t.id] = isRepostedByCurrentUser(t.id);
        }
      }
      if (Object.keys(newLiked).length > 0) {
        setLikedMap((prev) => ({ ...prev, ...newLiked }));
      }
      if (Object.keys(newReposted).length > 0) {
        setRepostMap((prev) => ({ ...prev, ...newReposted }));
      }
    }
  }, [id, likedMap, repostMap]);

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

  const handleRepost = useCallback((threadId: string) => {
    const result = toggleRepost(threadId);
    setRepostMap((prev) => ({ ...prev, [threadId]: result.reposted }));
    setDetail((prev) => {
      if (!prev) return prev;
      if (prev.id === threadId) {
        return { ...prev, repost_count: result.repostCount };
      }
      return {
        ...prev,
        replies: prev.replies.map((r) =>
          r.id === threadId ? { ...r, repost_count: result.repostCount } : r,
        ),
      };
    });
  }, []);

  const handleShare = useCallback((threadId: string) => {
    setShareThreadId(threadId);
  }, []);

  const handleMore = useCallback(
    (threadId: string) => {
      const allThreads = detail ? [detail, ...ancestors, ...detail.replies] : ancestors;
      const found = allThreads.find((t) => t.id === threadId) ?? null;
      setOverflowThread(found);
    },
    [detail, ancestors],
  );

  const handleThreadDeleted = useCallback(
    (threadId: string) => {
      if (threadId === id) {
        router.back();
      } else {
        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            replies: prev.replies.filter((r) => r.id !== threadId),
            reply_count: Math.max(0, prev.reply_count - 1),
          };
        });
      }
    },
    [id, router],
  );

  const handleThreadHidden = useCallback(
    (threadId: string) => {
      if (threadId === id) {
        router.back();
      } else {
        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            replies: prev.replies.filter((r) => r.id !== threadId),
          };
        });
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
      <View className="flex-1 bg-[#101010]">
        <Box className={`flex-1 ${Platform.OS === 'web' ? 'w-full max-w-[680px] self-center' : ''}`}>
          <ThreadDetailSkeleton />
        </Box>
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
          isReposted={repostMap[item.thread.id] ?? isRepostedByCurrentUser(item.thread.id)}
          onLike={handleLike}
          onReply={handleReply}
          onRepost={handleRepost}
          onShare={handleShare}
          onMorePress={handleMore}
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
            isReposted={repostMap[item.thread.id] ?? isRepostedByCurrentUser(item.thread.id)}
            onLike={handleLike}
            onReply={() => inputRef.current?.focus()}
            onRepost={handleRepost}
            onShare={handleShare}
            onMorePress={handleMore}
            showDivider={false}
            isDetailView
          />
          <View className="px-4 pb-2">
            <Text className="text-[13px] text-[#555555]">
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
            <Text className="text-[15px] text-[#555555]">No replies yet</Text>
            <Text className="mt-1 text-[13px] text-[#444444]">Be the first to reply</Text>
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
          isReposted={repostMap[item.thread.id] ?? isRepostedByCurrentUser(item.thread.id)}
          onLike={handleLike}
          onReply={handleReply}
          onRepost={handleRepost}
          onShare={handleShare}
          onMorePress={handleMore}
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
      <Box className={`flex-1 ${Platform.OS === 'web' ? 'w-full max-w-[680px] self-center' : ''}`}>
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
          contentContainerStyle={{ paddingBottom: 12 }}
        />

        <Divider className="bg-[#1e1e1e]" />
        <HStack className="items-center bg-[#101010] px-4 py-2 pb-3" space="md">
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
            className="h-[36px] flex-1 text-[15px] text-[#f3f5f7]"
            style={{
              ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
              overflow: 'hidden',
            }}
            returnKeyType="send"
            onSubmitEditing={handleSubmitReply}
            numberOfLines={1}
          />
          <Pressable
            onPress={handleSubmitReply}
            disabled={!replyText.trim()}
            className={`rounded-full p-2 ${replyText.trim() ? 'active:bg-white/10' : 'opacity-40'}`}
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
      <ShareSheet
        isOpen={shareThreadId !== null}
        onClose={() => setShareThreadId(null)}
        threadId={shareThreadId ?? ''}
      />
      <ThreadOverflowMenu
        isOpen={overflowThread !== null}
        onClose={() => setOverflowThread(null)}
        thread={overflowThread}
        onThreadDeleted={handleThreadDeleted}
        onThreadHidden={handleThreadHidden}
      />
    </KeyboardAvoidingView>
  );
}
