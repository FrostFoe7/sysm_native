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
import { formatRelativeTime } from '@/services/format';
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  BadgeCheck,
} from 'lucide-react-native';
import type { MessageWithSender, ChatItem } from '@/types/types';
import { useChat } from '@/hooks/use-chat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null);

  const {
    messages,
    chatItems,
    details: conversationDetails,
    isLoading,
    sendMessage: triggerSendMessage,
    toggleReaction,
  } = useChat(id ?? '');

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
      triggerSendMessage(text, replyingTo?.id);
      setReplyingTo(null);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [triggerSendMessage, replyingTo],
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
      <SafeAreaView className="flex-1 bg-brand-dark">
        <View className="flex-1 items-center justify-center">
          <Text className="text-brand-muted">Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chatContent = (
    <View className="flex-1 bg-brand-dark">
      {/* Header */}
      <View className="border-b border-brand-border bg-brand-dark">
        <SafeAreaView edges={['top']}>
          <HStack className="items-center px-3 py-2" space="sm">
            <Pressable
              onPress={handleBack}
              className="rounded-full p-1.5 active:bg-white/10"
            >
              <ArrowLeft size={24} color="brand-light" />
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
                  <Text className="text-[16px] font-bold text-brand-light" numberOfLines={1}>
                    {displayName}
                  </Text>
                  {isVerified && (
                    <BadgeCheck size={14} color="brand-blue" fill="brand-blue" />
                  )}
                </HStack>
                {isGroup ? (
                  <Text className="text-[12px] text-brand-muted">
                    {memberCount} members
                  </Text>
                ) : (
                  <Text className="text-[12px] text-[#00c853]">Active now</Text>
                )}
              </VStack>
            </Pressable>

            <HStack space="sm">
              <Pressable className="rounded-full p-2 active:bg-white/10">
                <Phone size={20} color="brand-light" />
              </Pressable>
              <Pressable className="rounded-full p-2 active:bg-white/10">
                <Video size={20} color="brand-light" />
              </Pressable>
              {isGroup && (
                <Pressable
                  onPress={handleInfoPress}
                  className="rounded-full p-2 active:bg-white/10"
                >
                  <Info size={20} color="brand-light" />
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
