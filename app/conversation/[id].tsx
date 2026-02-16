// app/conversation/[id].tsx

import React, { useState, useCallback, useRef } from "react";
import {
  FlatList,
  View,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { MessageBubble, DateSeparator } from "@/components/MessageBubble";
import { ChatComposer } from "@/components/ChatComposer";
import {
  ArrowLeftIcon,
  PhoneIcon,
  VideoIcon,
  InfoIcon,
  VerifiedFillIcon,
} from "@/constants/icons";
import type { MessageWithSender, ChatItem } from "@/types/types";
import { useChat } from "@/hooks/use-chat";

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
    typingUsers,
    sendMessage: triggerSendMessage,
    sendVoice,
    toggleReaction,
    onTextChange,
    loadMore,
    hasMore,
  } = useChat(id ?? "");

  const isGroup = conversationDetails?.conversation.type === "group";

  // Display info
  const displayName = isGroup
    ? (conversationDetails?.conversation.name ?? "Group")
    : (conversationDetails?.otherUsers[0]?.display_name ?? "Chat");
  const displayAvatar = isGroup
    ? (conversationDetails?.conversation.avatar_url ?? "")
    : (conversationDetails?.otherUsers[0]?.avatar_url ?? "");
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

  const handleSendVoice = useCallback(
    (uri: string, durationMs: number) => {
      sendVoice(uri, durationMs, replyingTo?.id);
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
      if (item.type === "date") {
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
    [
      isGroup,
      handleReply,
      handleReaction,
      handleProfilePress,
      handleThreadPress,
    ],
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
        <SafeAreaView edges={["top"]}>
          <HStack className="items-center px-3 py-2" space="sm">
            <Pressable
              onPress={handleBack}
              className="rounded-full p-1.5 active:bg-white/10"
            >
              <ArrowLeftIcon size={24} color="#f3f5f7" />
            </Pressable>

            <Pressable
              onPress={() => {
                if (isGroup) handleInfoPress();
                else if (conversationDetails.otherUsers[0])
                  handleProfilePress(conversationDetails.otherUsers[0].id);
              }}
              className="flex-1 flex-row items-center active:opacity-80"
            >
              <Avatar size="sm" className="size-[36px]">
                <AvatarImage source={{ uri: displayAvatar }} />
              </Avatar>
              <VStack className="ml-2.5 flex-1">
                <HStack className="items-center" space="xs">
                  <Text
                    className="text-[16px] font-bold text-brand-light"
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  {isVerified && <VerifiedFillIcon size={14} color="#0095f6" />}
                </HStack>
                {isGroup ? (
                  <Text className="text-[12px] text-brand-muted">
                    {memberCount} members
                  </Text>
                ) : typingUsers.length > 0 ? (
                  <Text className="text-[12px] italic text-brand-blue">
                    typing...
                  </Text>
                ) : (
                  <Text className="text-[12px] text-brand-muted">Online</Text>
                )}
              </VStack>
            </Pressable>

            <HStack space="sm">
              <Pressable className="rounded-full p-2 active:bg-white/10">
                <PhoneIcon size={20} color="#f3f5f7" />
              </Pressable>
              <Pressable className="rounded-full p-2 active:bg-white/10">
                <VideoIcon size={20} color="#f3f5f7" />
              </Pressable>
              {isGroup && (
                <Pressable
                  onPress={handleInfoPress}
                  className="rounded-full p-2 active:bg-white/10"
                >
                  <InfoIcon size={20} color="#f3f5f7" />
                </Pressable>
              )}
            </HStack>
          </HStack>
        </SafeAreaView>
      </View>

      {/* Messages */}
      {isLoading ? null : (
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
          onScroll={({ nativeEvent }) => {
            // Load older messages when scrolled near the top
            if (
              nativeEvent.contentOffset.y < 200 &&
              hasMore &&
              !isLoading
            ) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
          inverted={false}
        />
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View className="px-4 py-1">
          <Text className="text-[12px] italic text-brand-muted">
            {isGroup
              ? `${typingUsers.map((u) => u.display_name.split(" ")[0]).join(", ")} typing...`
              : "typing..."}
          </Text>
        </View>
      )}

      {/* Composer */}
      <ChatComposer
        onSend={handleSendMessage}
        onSendVoice={handleSendVoice}
        onTyping={onTextChange}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </View>
  );

  if (Platform.OS === "ios" || Platform.OS === "android") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {chatContent}
      </KeyboardAvoidingView>
    );
  }

  return chatContent;
}
