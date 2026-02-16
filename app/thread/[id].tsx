// app/thread/[id].tsx

import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import {
  FlatList,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThreadCard } from '@/components/ThreadCard';
import { ShareSheet } from '@/components/ShareSheet';
import { ThreadOverflowMenu } from '@/components/ThreadOverflowMenu';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Divider } from '@/components/ui/divider';
import { Box } from '@/components/ui/box';
import { ThreadService } from '@/services/thread.service';
import { UserService } from '@/services/user.service';
import { formatFullDate } from '@/services/format';
import { SendIcon, ArrowLeftIcon } from '@/constants/icons';
import { ThreadDetailSkeleton } from '@/components/skeletons';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import type { ThreadWithAuthor, ThreadWithReplies } from '@/types/types';
import { useInteractionStore } from '@/store/useInteractionStore';

type ListItem =
  | { type: 'ancestor'; thread: ThreadWithAuthor }
  | { type: 'main'; thread: ThreadWithReplies }
  | { type: 'reply-header' }
  | { type: 'reply'; thread: ThreadWithAuthor };

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const [replyText, setReplyText] = useState('');
  const [detail, setDetail] = useState<ThreadWithReplies | null>(null);
  const [ancestors, setAncestors] = useState<ThreadWithAuthor[]>([]);
  
  const { 
    likedThreads: likedMap, 
    repostedThreads: repostMap, 
    setLiked, 
    setReposted,
    syncInteractions 
  } = useInteractionStore();

  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  const [overflowThread, setOverflowThread] = useState<ThreadWithAuthor | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    UserService.getCurrentUser().then(setCurrentUser).catch(console.error);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [d, anc] = await Promise.all([
        ThreadService.getThreadDetail(id),
        ThreadService.getThreadAncestors(id),
      ]);
      setDetail(d);
      setAncestors(anc);
      // Pre-populate like states
      if (d) {
        const allThreads = [d, ...d.replies];
        const newLiked: Record<string, boolean> = {};
        const newReposted: Record<string, boolean> = {};
        const checks = allThreads.map(async (t) => {
          const [liked, reposted] = await Promise.all([
            ThreadService.isLikedByCurrentUser(t.id),
            ThreadService.isRepostedByCurrentUser(t.id),
          ]);
          newLiked[t.id] = liked;
          newReposted[t.id] = reposted;
        });
        await Promise.all(checks);
        syncInteractions({ liked: newLiked, reposted: newReposted });
      }
    } catch (error) {
      console.error('Failed to load thread detail:', error);
    }
  }, [id, syncInteractions]);

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
    const wasLiked = !!likedMap[threadId];
    setLiked(threadId, !wasLiked);
    ThreadService.toggleLike(threadId).catch(() => setLiked(threadId, wasLiked));
    
    setDetail((prev) => {
      if (!prev) return prev;
      if (prev.id === threadId) {
        return { ...prev, like_count: wasLiked ? prev.like_count - 1 : prev.like_count + 1 };
      }
      return {
        ...prev,
        replies: prev.replies.map((r) =>
          r.id === threadId ? { ...r, like_count: wasLiked ? r.like_count - 1 : r.like_count + 1 } : r,
        ),
      };
    });
  }, [likedMap, setLiked]);

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
    const wasReposted = !!repostMap[threadId];
    setReposted(threadId, !wasReposted);
    ThreadService.toggleRepost(threadId).catch(() => setReposted(threadId, wasReposted));

    setDetail((prev) => {
      if (!prev) return prev;
      if (prev.id === threadId) {
        return { ...prev, repost_count: wasReposted ? prev.repost_count - 1 : prev.repost_count + 1 };
      }
      return {
        ...prev,
        replies: prev.replies.map((r) =>
          r.id === threadId ? { ...r, repost_count: wasReposted ? r.repost_count - 1 : r.repost_count + 1 } : r,
        ),
      };
    });
  }, [repostMap, setReposted]);

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

  const handleSubmitReply = useCallback(async () => {
    if (!id || !replyText.trim()) return;
    try {
      const newReply = await ThreadService.createReply(id, replyText.trim());
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
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  }, [id, replyText]);

  if (!detail) {
    return (
      <View className="flex-1 bg-brand-dark">
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
          }}
          isLiked={likedMap[item.thread.id] ?? false}
          isReposted={repostMap[item.thread.id] ?? false}
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
            }}
            isLiked={likedMap[item.thread.id] ?? false}
            isReposted={repostMap[item.thread.id] ?? false}
            onLike={handleLike}
            onReply={() => inputRef.current?.focus()}
            onRepost={handleRepost}
            onShare={handleShare}
            onMorePress={handleMore}
            showDivider={false}
            isDetailView
          />
          <View className="px-4 pb-2">
            <Text className="text-[13px] text-brand-muted">
              {formatFullDate(item.thread.created_at)}
            </Text>
          </View>
          <Divider className="bg-brand-border" />
        </View>
      );
    }

    if (item.type === 'reply-header') {
      if (detail.replies.length === 0) {
        return (
          <View className="items-center justify-center py-12">
            <Text className="text-[15px] text-brand-muted">No replies yet</Text>
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
          }}
          isLiked={likedMap[item.thread.id] ?? false}
          isReposted={repostMap[item.thread.id] ?? false}
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
      className="flex-1 bg-brand-dark"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Box className={`flex-1 ${Platform.OS === 'web' ? 'w-full max-w-[680px] self-center' : ''}`}>
        {/* Custom Header with Back Button */}
        <SafeAreaView edges={['top']}>
          <HStack className="items-center px-4 py-2" space="md">
            <Pressable 
              onPress={() => router.back()} 
              hitSlop={12} 
              className="rounded-full p-1 active:bg-white/10"
            >
              <ArrowLeftIcon size={24} color="#f5f5f5" />
            </Pressable>
            <Text className="text-[18px] font-bold text-brand-light">Thread</Text>
          </HStack>
        </SafeAreaView>

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

        <Divider className="bg-brand-border" />
        <HStack className="items-center bg-brand-dark px-4 py-2 pb-3" space="md">
          <Avatar size="xs">
            <AvatarImage source={{ uri: currentUser?.avatar_url ?? '' }} />
          </Avatar>
          <TextInput
            ref={inputRef}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={`Reply to ${detail.author.username}...`}
            placeholderTextColor="brand-muted"
            className="h-[36px] flex-1 text-[15px] text-brand-light"
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
            <SendIcon
              size={20}
              color={replyText.trim() ? '#0095f6' : '#555555'}
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
