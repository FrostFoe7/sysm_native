// app/group-info/[id].tsx

import React, { useState, useCallback, useEffect } from "react";
import { Pressable, View, TextInput, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Divider } from "@/components/ui/divider";
import { Button, ButtonText } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  VerifiedFillIcon,
  BellIcon,
  BellOffIcon,
  PinIcon,
  UserPlusIcon,
  LogOutIcon,
  TrashIcon,
  MediaIcon,
  MoreHorizontalIcon,
} from "@/constants/icons";
import { ChatService } from "@/services/chat.service";
import { useAuthStore } from "@/store/useAuthStore";
import type { ConversationWithDetails } from "@/types/types";

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [details, setDetails] = useState<ConversationWithDetails | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const { userId: currentUserId } = useAuthStore();

  const loadDetails = useCallback(async () => {
    if (!id) return;
    try {
      const data = await ChatService.getConversation(id);
      setDetails(data);
    } catch (error) {
      console.error("Failed to load group info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (!details || details.conversation.type !== "group") {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark">
        <View className="flex-1 items-center justify-center">
          <Text className="text-[#555]">
            {isLoading ? "Loading..." : "Group not found"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { conversation: conv, participants } = details;
  const currentParticipant = participants.find(
    (p) => p.user_id === currentUserId,
  );
  const isAdmin = currentParticipant?.role === "admin";

  const handleBack = () => router.back();

  const handleToggleMute = async () => {
    if (!id) return;
    await ChatService.toggleConversationMute(id);
    loadDetails();
  };

  const handleTogglePin = async () => {
    if (!id) return;
    await ChatService.toggleConversationPin(id);
    loadDetails();
  };

  const handleLeave = async () => {
    if (!id) return;
    await ChatService.leaveGroup(id);
    router.replace("/(tabs)/inbox" as any);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    await ChatService.removeGroupMember(id, userId);
    loadDetails();
  };

  const handlePromote = async (userId: string) => {
    if (!id) return;
    await ChatService.promoteToAdmin(id, userId);
    loadDetails();
  };

  const handleSaveName = async () => {
    if (!id || !newName.trim()) return;
    await ChatService.updateGroupInfo(id, { name: newName.trim() });
    setIsEditingName(false);
    loadDetails();
  };

  const handleAddMembers = () => {
    // Navigate to add members flow
    router.push("/new-chat" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      {/* Header */}
      <HStack
        className="items-center border-b border-brand-border px-3 py-2"
        space="sm"
      >
        <Pressable
          onPress={handleBack}
          className="rounded-full p-1.5 active:bg-white/10"
        >
          <ArrowLeftIcon size={24} color="#f3f5f7" />
        </Pressable>
        <Heading size="lg" className="flex-1 text-brand-light">
          Group Info
        </Heading>
      </HStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Group avatar + name */}
        <VStack className="items-center px-4 pb-4 pt-6">
          <Avatar size="xl" className="mb-3 size-[80px]">
            <AvatarImage
              source={{
                uri: conv.avatar_url ?? "https://i.pravatar.cc/150?u=group",
              }}
            />
          </Avatar>
          {isEditingName ? (
            <HStack className="items-center" space="sm">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                className="border-b border-brand-blue pb-1 text-center text-[18px] font-bold text-brand-light"
                autoFocus
                onSubmitEditing={handleSaveName}
              />
              <Button
                size="xs"
                className="rounded-lg bg-brand-blue"
                onPress={handleSaveName}
              >
                <ButtonText className="text-[12px] text-white">Save</ButtonText>
              </Button>
            </HStack>
          ) : (
            <Pressable
              onPress={() => {
                if (isAdmin) {
                  setNewName(conv.name ?? "");
                  setIsEditingName(true);
                }
              }}
            >
              <Text className="text-[20px] font-bold text-brand-light">
                {conv.name}
              </Text>
            </Pressable>
          )}
          <Text className="mt-1 text-[14px] text-brand-muted">
            {participants.length} members
          </Text>
        </VStack>

        <Divider className="bg-brand-border" />

        {/* Action buttons */}
        <HStack className="justify-center gap-4 p-4">
          <Pressable
            onPress={handleToggleMute}
            className="items-center"
            style={{ width: 72 }}
          >
            <View className="mb-1.5 size-[44px] items-center justify-center rounded-full bg-[#262626]">
              {details.is_muted ? (
                <BellOffIcon size={20} color="#f3f5f7" />
              ) : (
                <BellIcon size={20} color="#f3f5f7" />
              )}
            </View>
            <Text className="text-center text-[11px] text-[#999]">
              {details.is_muted ? "Unmute" : "Mute"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleTogglePin}
            className="items-center"
            style={{ width: 72 }}
          >
            <View className="mb-1.5 size-[44px] items-center justify-center rounded-full bg-[#262626]">
              <PinIcon size={20} color="#f3f5f7" />
            </View>
            <Text className="text-center text-[11px] text-[#999]">
              {details.is_pinned ? "Unpin" : "Pin"}
            </Text>
          </Pressable>

          <Pressable className="items-center" style={{ width: 72 }}>
            <View className="mb-1.5 size-[44px] items-center justify-center rounded-full bg-[#262626]">
              <MediaIcon size={20} color="#f3f5f7" />
            </View>
            <Text className="text-center text-[11px] text-[#999]">Media</Text>
          </Pressable>
        </HStack>

        <Divider className="bg-brand-border" />

        {/* Members section */}
        <View className="px-4 py-3">
          <HStack className="mb-2 items-center justify-between">
            <Text className="text-[15px] font-semibold text-brand-light">
              Members ({participants.length})
            </Text>
            {isAdmin && (
              <Pressable
                onPress={handleAddMembers}
                className="flex-row items-center rounded-full bg-[#262626] px-3 py-1.5 active:bg-white/10"
              >
                <UserPlusIcon size={14} color="#0095f6" />
                <Text className="ml-1.5 text-[12px] font-medium text-brand-blue">
                  Add
                </Text>
              </Pressable>
            )}
          </HStack>

          {participants.map((p) => (
            <Pressable
              key={p.user_id}
              onPress={() => {
                if (p.user_id !== currentUserId)
                  router.push(`/profile/${p.user_id}` as any);
              }}
              className="active:bg-white/5"
            >
              <HStack className="items-center py-2.5" space="md">
                <Avatar size="sm" className="size-[40px]">
                  <AvatarImage source={{ uri: p.user.avatar_url }} />
                </Avatar>
                <VStack className="flex-1">
                  <HStack className="items-center" space="xs">
                    <Text
                      className="text-[14px] font-semibold text-brand-light"
                      numberOfLines={1}
                    >
                      {p.user.display_name}
                      {p.user_id === currentUserId ? " (You)" : ""}
                    </Text>
                    {p.user.verified && (
                      <VerifiedFillIcon size={13} color="#0095f6" />
                    )}
                  </HStack>
                  <Text className="text-[12px] text-brand-muted">
                    @{p.user.username}
                  </Text>
                </VStack>
                {p.role === "admin" && (
                  <View className="rounded-full bg-brand-blue/15 px-2 py-0.5">
                    <Text className="text-2xs font-semibold text-brand-blue">
                      Admin
                    </Text>
                  </View>
                )}
                {isAdmin && p.user_id !== currentUserId && (
                  <Pressable
                    onPress={() => {
                      // Show options menu (simplified: toggle admin/remove)
                      if (p.role !== "admin") {
                        handlePromote(p.user_id);
                      } else {
                        handleRemoveMember(p.user_id);
                      }
                    }}
                    className="rounded-full p-1.5 active:bg-white/10"
                  >
                    <MoreHorizontalIcon size={18} color="#777777" />
                  </Pressable>
                )}
              </HStack>
              <Divider className="ml-[52px] bg-brand-border" />
            </Pressable>
          ))}
        </View>

        <Divider className="bg-brand-border" />

        {/* Leave group */}
        <Pressable
          onPress={handleLeave}
          className="flex-row items-center p-4 active:bg-white/5"
        >
          <LogOutIcon size={20} color="#ff3040" />
          <Text className="ml-3 text-[15px] font-medium text-brand-red">
            Leave Group
          </Text>
        </Pressable>

        <Divider className="bg-brand-border" />

        {/* Delete group (admin only) */}
        {isAdmin && (
          <Pressable className="flex-row items-center p-4 active:bg-white/5">
            <TrashIcon size={20} color="#ff3040" />
            <Text className="ml-3 text-[15px] font-medium text-brand-red">
              Delete Group
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
