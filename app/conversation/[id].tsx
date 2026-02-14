// app/conversation/[id].tsx

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FlatList, View, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { MessageBubble, DateSeparator } from '@/components/MessageBubble';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatSkeleton } from '@/components/skeletons';
import {
  getConversation,
  getMessages,
  sendMessage,
  markConversationAsRead,
  toggleMessageReaction,
  formatRelativeTime,
} from '@/db/selectors';
import { CURRENT_USER_ID } from '@/constants/app';
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  BadgeCheck,
} from 'lucide-react-native';
import type { MessageWithSender, ConversationWithDetails } from '@/types/types';

// Group messages by date for separator insertion
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
    const prevMsg = messages[i - 1];

    // Date separator
    if (msgDate !== lastDate) {
      items.push({ type: 'date', date: msg.created_at, key: `date-${msgDate}` });
      lastDate = msgDate;
      lastSenderId = '';
    }

    const showAvatar = msg.sender_id !== lastSenderId || msg.type === 'system';
    const isLastFromSender = !nextMsg || nextMsg.sender_id !== msg.sender_id;

    items.push({
      type: 'message',
      message: msg,
      showAvatar,
      showTimestamp: isLastFromSender,
      key: msg.id,
    });

    lastSenderId = msg.sender_id;
  }

  return items;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
      if (id) markConversationAsRead(id);
      if (isLoading) {
        const t = setTimeout(() => setIsLoading(false), 300);
        return () => clearTimeout(t);
      }
    }, [id, isLoading]),
  );

  const conversationDetails = useMemo(() => {
    void refreshKey;
    if (!id) return undefined;
    return getConversation(id);
  }, [id, refreshKey]);

  const messages = useMemo(() => {
    void refreshKey;
    if (!id) return [];
    return getMessages(id);
  }, [id, refreshKey]);

  const chatItems = useMemo(() => buildChatItems(messages), [messages]);

  const isGroup = conversationDetails?.conversation.type === 'group';

  // Display info
  const displayName = isGroup
    ? conversationDetails?.conversation.name ?? 'Group'
    : conversationDetails?.otherUsers[0]?.display_name ?? 'Chat';
  const displayAvatar = isGroup
    ? conversationDetails?.conversation.avatar_url ?? ''
    : conversationDetails?.otherUsers[0]?.avatar_url ?? '';
  const isVerified = !isGroup && conversationDetails?.otherUsers[0]?.verified;
  const memberCount = conversationDetails?.participants.length ?? 0;

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!id) return;
      sendMessage({
        conversationId: id,
        content: text,
        replyToId: replyingTo?.id,
      });
      setReplyingTo(null);
      setRefreshKey((k) => k + 1);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [id, replyingTo],
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
      setRefreshKey((k) => k + 1);
    },
    [],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleInfoPress = useCallback(() => {
    if (!id) return;
    router.push(`/group-info/${id}` as any);
  }, [id, router]);

  const handleProfilePress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}` as any);
    },
    [router],
  );

  const handleThreadPress = useCallback(
    (threadId: string) => {
      router.push(`/thread/${threadId}` as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatItem }) => {
      if (item.type === 'date') {
        return <DateSeparator date={item.date} />;
      }
      return (
        <MessageBubble
          message={item.message}
          isGroupChat={isGroup ?? false}
          showAvatar={item.showAvatar}
          showTimestamp={item.showTimestamp}
          onReply={handleReply}
          onReaction={handleReaction}
          onProfilePress={handleProfilePress}
          onThreadPress={handleThreadPress}
        />
      );
    },
    [isGroup, handleReply, handleReaction, handleProfilePress, handleThreadPress],
  );

  if (!conversationDetails) {
    return (
      <SafeAreaView className="flex-1 bg-[#101010]">
        <View className="flex-1 items-center justify-center">
          <Text className="text-[#555555]">Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chatContent = (
    <View className="flex-1 bg-[#101010]">
      {/* Header */}
      <View className="border-b border-[#1e1e1e] bg-[#101010]">
        <SafeAreaView edges={['top']}>
          <HStack className="items-center px-3 py-2" space="sm">
            <Pressable
              onPress={handleBack}
              className="rounded-full p-1.5 active:bg-white/10"
            >
              <ArrowLeft size={24} color="#f3f5f7" />
            </Pressable>

            <Pressable
              onPress={() => {
                if (isGroup) handleInfoPress();
                else if (conversationDetails.otherUsers[0])
                  handleProfilePress(conversationDetails.otherUsers[0].id);
              }}
              className="flex-1 flex-row items-center active:opacity-80"
            >
              <Avatar size="sm" className="h-[36px] w-[36px]">
                <AvatarImage source={{ uri: displayAvatar }} />
              </Avatar>
              <VStack className="ml-2.5 flex-1">
                <HStack className="items-center" space="xs">
                  <Text className="text-[16px] font-bold text-[#f3f5f7]" numberOfLines={1}>
                    {displayName}
                  </Text>
                  {isVerified && (
                    <BadgeCheck size={14} color="#0095f6" fill="#0095f6" />
                  )}
                </HStack>
                {isGroup ? (
                  <Text className="text-[12px] text-[#555555]">
                    {memberCount} members
                  </Text>
                ) : (
                  <Text className="text-[12px] text-[#00c853]">Active now</Text>
                )}
              </VStack>
            </Pressable>

            <HStack space="sm">
              <Pressable className="rounded-full p-2 active:bg-white/10">
                <Phone size={20} color="#f3f5f7" />
              </Pressable>
              <Pressable className="rounded-full p-2 active:bg-white/10">
                <Video size={20} color="#f3f5f7" />
              </Pressable>
              {isGroup && (
                <Pressable
                  onPress={handleInfoPress}
                  className="rounded-full p-2 active:bg-white/10"
                >
                  <Info size={20} color="#f3f5f7" />
                </Pressable>
              )}
            </HStack>
          </HStack>
        </SafeAreaView>
      </View>

      {/* Messages */}
      {isLoading ? (
        <ChatSkeleton />
      ) : (
        <FlatList
          ref={flatListRef}
          data={chatItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          inverted={false}
        />
      )}

      {/* Composer */}
      <ChatComposer
        onSend={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {chatContent}
      </KeyboardAvoidingView>
    );
  }

  return chatContent;
}
