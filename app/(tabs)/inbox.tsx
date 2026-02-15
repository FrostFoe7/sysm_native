// app/(tabs)/inbox.tsx

import React, { useState, useCallback } from 'react';
import { FlatList, Pressable, View, TextInput, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ConversationRow } from '@/components/ConversationRow';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { SquarePen, Search, Phone, Video, Info, BadgeCheck } from 'lucide-react-native';
import { InboxSkeleton } from '@/components/skeletons';
import { DESKTOP_BREAKPOINT } from '@/constants/ui';
import { MessageBubble, DateSeparator } from '@/components/MessageBubble';
import { ChatComposer } from '@/components/ChatComposer';
import { useChat } from '@/hooks/use-chat';
import { useInbox } from '@/hooks/use-inbox';
import type { MessageWithSender, ChatItem, ConversationWithDetails } from '@/types/types';

// ─── Inline Chat Panel (desktop only) ────────────────────────────────────────

function InlineChatPanel({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const flatListRef = React.useRef<FlatList>(null);
  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null);

  const {
    chatItems,
    details,
    messages,
    typingUsers,
    sendMessage: triggerSendMessage,
    sendVoice,
    toggleReaction,
    onTextChange,
  } = useChat(conversationId);

  const isGroup = details?.conversation.type === 'group';
  const displayName = isGroup
    ? details?.conversation.name ?? 'Group'
    : details?.otherUsers[0]?.display_name ?? 'Chat';
  const displayAvatar = isGroup
    ? details?.conversation.avatar_url ?? ''
    : details?.otherUsers[0]?.avatar_url ?? '';
  const isVerified = !isGroup && details?.otherUsers[0]?.verified;

  const handleSend = useCallback(
    (text: string) => {
      triggerSendMessage(text, replyingTo?.id);
      setReplyingTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    [triggerSendMessage, replyingTo],
  );

  const handleSendVoice = useCallback(
    (uri: string, durationMs: number) => {
      sendVoice(uri, durationMs, replyingTo?.id);
      setReplyingTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    [sendVoice, replyingTo],
  );

  const handleReply = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (msg) setReplyingTo(msg);
    },
    [messages],
  );

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      toggleReaction(messageId, emoji);
    },
    [toggleReaction],
  );

  if (!details) return null;

  return (
    <View className="flex-1 border-l border-brand-border bg-brand-dark">
      {/* Header */}
      <HStack className="items-center border-b border-brand-border px-4 py-3" space="sm">
        <Avatar size="sm" className="size-[36px]">
          <AvatarImage source={{ uri: displayAvatar }} />
        </Avatar>
        <VStack className="flex-1">
          <HStack className="items-center" space="xs">
            <Text className="text-[15px] font-bold text-brand-light">{displayName}</Text>
            {isVerified && <BadgeCheck size={13} color="brand-blue" fill="brand-blue" />}
          </HStack>
          {isGroup ? (
            <Text className="text-[11px] text-brand-muted">{details.participants.length} members</Text>
          ) : typingUsers.length > 0 ? (
            <Text className="text-[11px] italic text-brand-blue">typing...</Text>
          ) : (
            <Text className="text-[11px] text-brand-muted">Online</Text>
          )}
        </VStack>
        <HStack space="sm">
          <Pressable className="rounded-full p-2 active:bg-white/10">
            <Phone size={18} color="brand-light" />
          </Pressable>
          <Pressable className="rounded-full p-2 active:bg-white/10">
            <Video size={18} color="brand-light" />
          </Pressable>
          {isGroup && (
            <Pressable
              onPress={() => router.push(`/group-info/${conversationId}` as any)}
              className="rounded-full p-2 active:bg-white/10"
            >
              <Info size={18} color="brand-light" />
            </Pressable>
          )}
        </HStack>
      </HStack>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={chatItems}
        renderItem={({ item }: { item: ChatItem }) => {
          if (item.type === 'date') return <DateSeparator date={item.date} />;
          return (
            <MessageBubble
              message={item.message}
              isGroupChat={isGroup ?? false}
              showAvatar={item.showAvatar}
              showTimestamp={item.showTimestamp}
              onReply={handleReply}
              onReaction={handleReaction}
              onProfilePress={(uid) => router.push(`/profile/${uid}` as any)}
              onThreadPress={(tid) => router.push(`/thread/${tid}` as any)}
            />
          );
        }}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        onSendVoice={handleSendVoice}
        onTyping={onTextChange}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </View>
  );
}

// ─── Main Inbox Screen ────────────────────────────────────────────────────────

export default function InboxScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  const { data: inbox, isLoading, isRefreshing, searchQuery, setSearchQuery, refresh } = useInbox();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Auto-select first conversation on desktop
  React.useEffect(() => {
    if (isDesktop && !activeConvId && inbox.length > 0) {
      setActiveConvId(inbox[0].conversation.id);
    }
  }, [isDesktop, activeConvId, inbox]);

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      if (isDesktop) {
        setActiveConvId(conversationId);
      } else {
        router.push(`/conversation/${conversationId}` as any);
      }
    },
    [isDesktop, router],
  );

  const handleNewChat = useCallback(() => {
    router.push('/new-chat' as any);
  }, [router]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationWithDetails }) => (
      <View className={isDesktop && activeConvId === item.conversation.id ? 'bg-white/5' : ''}>
        <ConversationRow
          conversation={item}
          onPress={handleConversationPress}
        />
      </View>
    ),
    [handleConversationPress, isDesktop, activeConvId],
  );

  const inboxList = (
    <View className={isDesktop ? 'w-[360px] border-r border-brand-border' : 'flex-1'}>
      {/* Header */}
      <HStack className="items-center justify-between px-4 pb-1 pt-3">
        <Heading size="2xl" className="flex-1 text-brand-light">
          Messages
        </Heading>
        <Pressable
          onPress={handleNewChat}
          className="rounded-full p-2 active:bg-white/10"
        >
          <SquarePen size={24} color="brand-light" />
        </Pressable>
      </HStack>

      {/* Search */}
      <View className="px-4 py-2">
        <View className="flex-row items-center rounded-xl bg-brand-border px-3 py-2">
          <Search size={18} color="brand-muted" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search messages"
            placeholderTextColor="brand-muted"
            className="ml-2 flex-1 text-[14px] text-brand-light"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-[13px] text-brand-blue">Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={inbox}
        renderItem={renderItem}
        keyExtractor={(item) => item.conversation.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          isLoading ? (
            <InboxSkeleton />
          ) : (
            <View className="items-center justify-center py-16">
              <Text className="mb-2 text-[28px]">📬</Text>
              <Text className="text-[16px] font-semibold text-brand-light">
                {searchQuery ? 'No results found' : 'No Messages Yet'}
              </Text>
              <Text className="mt-1 text-[14px] text-brand-muted">
                {searchQuery ? 'Try a different search' : 'Start a conversation to see it here'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );

  // Desktop: side-by-side layout
  if (isDesktop) {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
        <View className="flex-1 flex-row">
          {inboxList}
          {activeConvId ? (
            <InlineChatPanel
              conversationId={activeConvId}
            />
          ) : (
            <View className="flex-1 items-center justify-center border-l border-brand-border">
              <Text className="mb-1 text-[28px]">💬</Text>
              <Text className="text-[16px] font-semibold text-brand-light">Your Messages</Text>
              <Text className="mt-1 text-[14px] text-brand-muted">Select a conversation to start chatting</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Mobile: full screen list
  return (
    <ScreenLayout>
      {inboxList}
    </ScreenLayout>
  );
}
