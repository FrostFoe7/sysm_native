// app/(tabs)/inbox.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, Pressable, View, TextInput, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ConversationRow } from '@/components/ConversationRow';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { getInbox, searchInbox, getConversation, getMessages, sendMessage, markConversationAsRead, toggleMessageReaction, formatRelativeTime } from '@/db/selectors';
import { SquarePen, Search, ArrowLeft, Phone, Video, Info, BadgeCheck } from 'lucide-react-native';
import { InboxSkeleton, ChatSkeleton } from '@/components/skeletons';
import { DESKTOP_BREAKPOINT } from '@/constants/ui';
import { CURRENT_USER_ID } from '@/constants/app';
import { MessageBubble, DateSeparator } from '@/components/MessageBubble';
import { ChatComposer } from '@/components/ChatComposer';
import type { ConversationWithDetails, MessageWithSender } from '@/types/types';

// ─── Chat list item types (shared with chat screen) ──────────────────────────

type ChatItem =
  | { type: 'date'; date: string; key: string }
  | { type: 'message'; message: MessageWithSender; showAvatar: boolean; showTimestamp: boolean; key: string };

function buildChatItems(messages: MessageWithSender[]): ChatItem[] {
  const items: ChatItem[] = [];
  let lastDate = '';
  let lastSenderId = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.created_at).toDateString();
    const nextMsg = messages[i + 1];

    if (msgDate !== lastDate) {
      items.push({ type: 'date', date: msg.created_at, key: `date-${msgDate}` });
      lastDate = msgDate;
      lastSenderId = '';
    }

    const showAvatar = msg.sender_id !== lastSenderId || msg.type === 'system';
    const isLastFromSender = !nextMsg || nextMsg.sender_id !== msg.sender_id;

    items.push({ type: 'message', message: msg, showAvatar, showTimestamp: isLastFromSender, key: msg.id });
    lastSenderId = msg.sender_id;
  }
  return items;
}

// ─── Inline Chat Panel (desktop only) ────────────────────────────────────────

function InlineChatPanel({
  conversationId,
  refreshKey,
  onRefresh,
}: {
  conversationId: string;
  refreshKey: number;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const flatListRef = React.useRef<FlatList>(null);
  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null);

  const details = useMemo(() => {
    void refreshKey;
    return getConversation(conversationId);
  }, [conversationId, refreshKey]);

  const messages = useMemo(() => {
    void refreshKey;
    return getMessages(conversationId);
  }, [conversationId, refreshKey]);

  const chatItems = useMemo(() => buildChatItems(messages), [messages]);

  React.useEffect(() => {
    markConversationAsRead(conversationId);
  }, [conversationId]);

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
      sendMessage({ conversationId, content: text, replyToId: replyingTo?.id });
      setReplyingTo(null);
      onRefresh();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    [conversationId, replyingTo, onRefresh],
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
      toggleMessageReaction(messageId, emoji);
      onRefresh();
    },
    [onRefresh],
  );

  if (!details) return null;

  return (
    <View className="flex-1 border-l border-[#1e1e1e] bg-[#101010]">
      {/* Header */}
      <HStack className="items-center border-b border-[#1e1e1e] px-4 py-3" space="sm">
        <Avatar size="sm" className="h-[36px] w-[36px]">
          <AvatarImage source={{ uri: displayAvatar }} />
        </Avatar>
        <VStack className="flex-1">
          <HStack className="items-center" space="xs">
            <Text className="text-[15px] font-bold text-[#f3f5f7]">{displayName}</Text>
            {isVerified && <BadgeCheck size={13} color="#0095f6" fill="#0095f6" />}
          </HStack>
          {isGroup ? (
            <Text className="text-[11px] text-[#555555]">{details.participants.length} members</Text>
          ) : (
            <Text className="text-[11px] text-[#00c853]">Active now</Text>
          )}
        </VStack>
        <HStack space="sm">
          <Pressable className="rounded-full p-2 active:bg-white/10">
            <Phone size={18} color="#f3f5f7" />
          </Pressable>
          <Pressable className="rounded-full p-2 active:bg-white/10">
            <Video size={18} color="#f3f5f7" />
          </Pressable>
          {isGroup && (
            <Pressable
              onPress={() => router.push(`/group-info/${conversationId}` as any)}
              className="rounded-full p-2 active:bg-white/10"
            >
              <Info size={18} color="#f3f5f7" />
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
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </View>
  );
}

// ─── Main Inbox Screen ────────────────────────────────────────────────────────

export default function InboxScreen() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
      if (isLoading) {
        const t = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(t);
      }
    }, [isLoading]),
  );

  const inbox = useMemo(() => {
    void refreshKey;
    if (searchQuery.trim()) return searchInbox(searchQuery.trim());
    return getInbox();
  }, [refreshKey, searchQuery]);

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
        markConversationAsRead(conversationId);
        setRefreshKey((k) => k + 1);
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
    setRefreshKey((k) => k + 1);
  }, []);

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
    <View className={isDesktop ? 'w-[360px] border-r border-[#1e1e1e]' : 'flex-1'}>
      {/* Header */}
      <HStack className="items-center justify-between px-4 pb-1 pt-3">
        <Heading size="2xl" className="flex-1 text-[#f3f5f7]">
          Messages
        </Heading>
        <Pressable
          onPress={handleNewChat}
          className="rounded-full p-2 active:bg-white/10"
        >
          <SquarePen size={24} color="#f3f5f7" />
        </Pressable>
      </HStack>

      {/* Search */}
      <View className="px-4 py-2">
        <View className="flex-row items-center rounded-xl bg-[#1e1e1e] px-3 py-2">
          <Search size={18} color="#555555" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search messages"
            placeholderTextColor="#555555"
            className="ml-2 flex-1 text-[14px] text-[#f3f5f7]"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-[13px] text-[#0095f6]">Cancel</Text>
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
        ListEmptyComponent={
          isLoading ? (
            <InboxSkeleton />
          ) : (
            <View className="items-center justify-center py-16">
              <Text className="mb-2 text-[28px]">📬</Text>
              <Text className="text-[16px] font-semibold text-[#f3f5f7]">
                {searchQuery ? 'No results found' : 'No Messages Yet'}
              </Text>
              <Text className="mt-1 text-[14px] text-[#555555]">
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
      <SafeAreaView className="flex-1 bg-[#101010]" edges={['top']}>
        <View className="flex-1 flex-row">
          {inboxList}
          {activeConvId ? (
            <InlineChatPanel
              conversationId={activeConvId}
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
            />
          ) : (
            <View className="flex-1 items-center justify-center border-l border-[#1e1e1e]">
              <Text className="mb-1 text-[28px]">💬</Text>
              <Text className="text-[16px] font-semibold text-[#f3f5f7]">Your Messages</Text>
              <Text className="mt-1 text-[14px] text-[#555555]">Select a conversation to start chatting</Text>
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
