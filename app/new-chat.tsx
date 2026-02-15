// app/new-chat.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { FlatList, Pressable, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonText } from '@/components/ui/button';
import {
  ArrowLeft,
  Search,
  Users,
  Check,
  BadgeCheck,
  X,
} from 'lucide-react-native';
import { UserService } from '@/services/user.service';
import { ChatService } from '@/services/chat.service';
import { useAuthStore } from '@/store/useAuthStore';
import { MAX_GROUP_NAME_LENGTH, MAX_GROUP_MEMBERS } from '@/constants/app';
import type { User } from '@/types/types';

type FlowStep = 'select-user' | 'group-setup';

export default function NewChatScreen() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('select-user');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);

  const currentUserId = useAuthStore((s) => s.userId);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    UserService.getAllUsers().then((users) => {
      setAllUsers(users.filter((u) => u.id !== currentUserId));
    }).catch(console.error);
  }, [currentUserId]);

  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q);
  });

  const handleBack = useCallback(() => {
    if (step === 'group-setup') {
      setStep('select-user');
    } else {
      router.back();
    }
  }, [router, step]);

  const handleUserSelect = useCallback(
    (user: User) => {
      if (isGroupMode) {
        setSelectedUsers((prev) => {
          const exists = prev.find((u) => u.id === user.id);
          if (exists) return prev.filter((u) => u.id !== user.id);
          if (prev.length >= MAX_GROUP_MEMBERS - 1) return prev; // -1 for current user
          return [...prev, user];
        });
      } else {
        // Direct 1:1 — create conversation and navigate
        ChatService.createDirectConversation(user.id).then((conv) => {
          router.replace(`/conversation/${conv.conversation.id}` as any);
        }).catch(console.error);
      }
    },
    [isGroupMode, router],
  );

  const handleRemoveSelected = useCallback((userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleGroupModeToggle = useCallback(() => {
    setIsGroupMode(!isGroupMode);
    if (!isGroupMode) {
      setSelectedUsers([]);
    }
  }, [isGroupMode]);

  const handleNextToGroupSetup = useCallback(() => {
    if (selectedUsers.length < 2) return;
    setStep('group-setup');
  }, [selectedUsers]);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    const conv = await ChatService.createGroupConversation({
      name: groupName.trim(),
      memberIds: selectedUsers.map((u) => u.id),
    });
    router.replace(`/conversation/${conv.conversation.id}` as any);
  }, [groupName, selectedUsers, router]);

  const isUserSelected = useCallback(
    (userId: string) => selectedUsers.some((u) => u.id === userId),
    [selectedUsers],
  );

  // ─── Group Setup Step ─────────────────────────────────────────────────────────

  if (step === 'group-setup') {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
        {/* Header */}
        <HStack className="items-center border-b border-brand-border px-3 py-2" space="sm">
          <Pressable onPress={handleBack} className="rounded-full p-1.5 active:bg-white/10">
            <ArrowLeft size={24} color="brand-light" />
          </Pressable>
          <Heading size="lg" className="flex-1 text-brand-light">
            New Group
          </Heading>
          <Button
            size="sm"
            variant="solid"
            className={`rounded-lg ${groupName.trim() ? 'bg-brand-blue' : 'bg-[#333]'}`}
            onPress={handleCreateGroup}
            isDisabled={!groupName.trim()}
          >
            <ButtonText className="text-[13px] font-semibold text-white">Create</ButtonText>
          </Button>
        </HStack>

        <View className="p-4">
          {/* Group avatar placeholder */}
          <View className="mb-4 items-center">
            <View className="mb-2 size-[80px] items-center justify-center rounded-full bg-[#262626]">
              <Users size={32} color="brand-muted" />
            </View>
            <Text className="text-[12px] text-brand-muted">Tap to add group photo</Text>
          </View>

          {/* Group name input */}
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
            placeholderTextColor="brand-muted"
            maxLength={MAX_GROUP_NAME_LENGTH}
            className="mb-4 border-b border-[#333] pb-3 text-center text-[18px] font-semibold text-brand-light"
          />

          {/* Members preview */}
          <Text className="mb-3 text-[14px] font-semibold text-[#999]">
            Members: {selectedUsers.length + 1}
          </Text>
          <HStack className="flex-wrap" space="sm">
            {selectedUsers.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => handleRemoveSelected(user.id)}
                className="mb-2 items-center"
                style={{ width: 64 }}
              >
                <View className="relative">
                  <Avatar size="sm">
                    <AvatarImage source={{ uri: user.avatar_url }} />
                  </Avatar>
                  <View className="absolute -right-0.5 -top-0.5 size-[16px] items-center justify-center rounded-full bg-[#333]">
                    <X size={10} color="brand-light" />
                  </View>
                </View>
                <Text className="mt-1 text-center text-[11px] text-[#999]" numberOfLines={1}>
                  {user.display_name.split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Select User Step ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      {/* Header */}
      <HStack className="items-center border-b border-brand-border px-3 py-2" space="sm">
        <Pressable onPress={handleBack} className="rounded-full p-1.5 active:bg-white/10">
          <ArrowLeft size={24} color="brand-light" />
        </Pressable>
        <Heading size="lg" className="flex-1 text-brand-light">
          New Message
        </Heading>
        {isGroupMode && selectedUsers.length >= 2 && (
          <Button
            size="sm"
            variant="solid"
            className="rounded-lg bg-brand-blue"
            onPress={handleNextToGroupSetup}
          >
            <ButtonText className="text-[13px] font-semibold text-white">Next</ButtonText>
          </Button>
        )}
      </HStack>

      {/* Search */}
      <View className="px-4 py-2">
        <View className="flex-row items-center rounded-xl bg-brand-border px-3 py-2">
          <Search size={18} color="brand-muted" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search people"
            placeholderTextColor="brand-muted"
            className="ml-2 flex-1 text-[14px] text-brand-light"
            autoFocus
          />
        </View>
      </View>

      {/* Group mode toggle */}
      <Pressable
        onPress={handleGroupModeToggle}
        className="flex-row items-center px-4 py-3 active:bg-white/5"
      >
        <View className={`mr-3 size-[40px] items-center justify-center rounded-full ${isGroupMode ? 'bg-brand-blue' : 'bg-[#262626]'}`}>
          <Users size={20} color={isGroupMode ? 'white' : '#999'} />
        </View>
        <Text className="text-[15px] font-semibold text-brand-light">
          Create a group
        </Text>
      </Pressable>
      <Divider className="bg-brand-border" />

      {/* Selected users chips (group mode) */}
      {isGroupMode && selectedUsers.length > 0 && (
        <View className="px-4 py-2">
          <HStack className="flex-wrap" space="xs">
            {selectedUsers.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => handleRemoveSelected(user.id)}
                className="mb-1 flex-row items-center rounded-full bg-brand-blue/20 py-1 pl-1 pr-2"
              >
                <Avatar size="xs" className="mr-1 size-[20px]">
                  <AvatarImage source={{ uri: user.avatar_url }} />
                </Avatar>
                <Text className="text-[12px] font-medium text-brand-blue">
                  {user.display_name.split(' ')[0]}
                </Text>
                <X size={12} color="brand-blue" className="ml-1" />
              </Pressable>
            ))}
          </HStack>
        </View>
      )}

      {/* Suggested / search results */}
      <Box className="px-4 py-2">
        <Text className="text-[13px] font-semibold text-brand-muted">
          {searchQuery ? 'Results' : 'Suggested'}
        </Text>
      </Box>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const selected = isUserSelected(item.id);
          return (
            <Pressable
              onPress={() => handleUserSelect(item)}
              className="active:bg-white/5"
            >
              <HStack className="items-center px-4 py-2.5" space="md">
                <Avatar size="sm" className="size-[44px]">
                  <AvatarImage source={{ uri: item.avatar_url }} />
                </Avatar>
                <VStack className="flex-1">
                  <HStack className="items-center" space="xs">
                    <Text className="text-[15px] font-semibold text-brand-light" numberOfLines={1}>
                      {item.display_name}
                    </Text>
                    {item.verified && (
                      <BadgeCheck size={14} color="brand-blue" fill="brand-blue" />
                    )}
                  </HStack>
                  <Text className="text-[13px] text-brand-muted">@{item.username}</Text>
                </VStack>
                {isGroupMode && (
                  <View
                    className={`size-[24px] items-center justify-center rounded-full border-2 ${
                      selected
                        ? 'border-brand-blue bg-brand-blue'
                        : 'border-[#333]'
                    }`}
                  >
                    {selected && <Check size={14} color="white" strokeWidth={3} />}
                  </View>
                )}
              </HStack>
              <Divider className="ml-[72px] bg-brand-border" />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text className="text-[14px] text-brand-muted">No users found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
