// app/group-info/[id].tsx

import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, Pressable, View, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonText } from '@/components/ui/button';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellOff,
  Pin,
  UserPlus,
  LogOut,
  Shield,
  Trash2,
  Image as ImageIcon,
  Users,
  MoreHorizontal,
} from 'lucide-react-native';
import {
  getConversation,
  toggleConversationMute,
  toggleConversationPin,
  removeGroupMember,
  leaveGroup,
  promoteToAdmin,
  updateGroupInfo,
} from '@/db/selectors';
import { CURRENT_USER_ID } from '@/constants/app';
import type { ConversationWithDetails, User, ConversationParticipant } from '@/types/types';

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const details = useMemo(() => {
    void refreshKey;
    if (!id) return undefined;
    return getConversation(id);
  }, [id, refreshKey]);

  if (!details || details.conversation.type !== 'group') {
    return (
      <SafeAreaView className="flex-1 bg-[#101010]">
        <View className="flex-1 items-center justify-center">
          <Text className="text-[#555]">Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { conversation: conv, participants } = details;
  const currentParticipant = participants.find((p) => p.user_id === CURRENT_USER_ID);
  const isAdmin = currentParticipant?.role === 'admin';

  const handleBack = () => router.back();

  const handleToggleMute = () => {
    if (!id) return;
    toggleConversationMute(id);
    setRefreshKey((k) => k + 1);
  };

  const handleTogglePin = () => {
    if (!id) return;
    toggleConversationPin(id);
    setRefreshKey((k) => k + 1);
  };

  const handleLeave = () => {
    if (!id) return;
    leaveGroup(id);
    router.replace('/(tabs)/inbox' as any);
  };

  const handleRemoveMember = (userId: string) => {
    if (!id) return;
    removeGroupMember(id, userId);
    setRefreshKey((k) => k + 1);
  };

  const handlePromote = (userId: string) => {
    if (!id) return;
    promoteToAdmin(id, userId);
    setRefreshKey((k) => k + 1);
  };

  const handleSaveName = () => {
    if (!id || !newName.trim()) return;
    updateGroupInfo(id, { name: newName.trim() });
    setIsEditingName(false);
    setRefreshKey((k) => k + 1);
  };

  const handleAddMembers = () => {
    // Navigate to add members flow
    router.push('/new-chat' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#101010]" edges={['top']}>
      {/* Header */}
      <HStack className="items-center border-b border-[#1e1e1e] px-3 py-2" space="sm">
        <Pressable onPress={handleBack} className="rounded-full p-1.5 active:bg-white/10">
          <ArrowLeft size={24} color="#f3f5f7" />
        </Pressable>
        <Heading size="lg" className="flex-1 text-[#f3f5f7]">
          Group Info
        </Heading>
      </HStack>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Group avatar + name */}
        <VStack className="items-center px-4 pb-4 pt-6">
          <Avatar size="xl" className="mb-3 h-[80px] w-[80px]">
            <AvatarImage
              source={{ uri: conv.avatar_url ?? 'https://i.pravatar.cc/150?u=group' }}
            />
          </Avatar>
          {isEditingName ? (
            <HStack className="items-center" space="sm">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                className="border-b border-[#0095f6] pb-1 text-center text-[18px] font-bold text-[#f3f5f7]"
                autoFocus
                onSubmitEditing={handleSaveName}
              />
              <Button size="xs" className="rounded-lg bg-[#0095f6]" onPress={handleSaveName}>
                <ButtonText className="text-[12px] text-white">Save</ButtonText>
              </Button>
            </HStack>
          ) : (
            <Pressable
              onPress={() => {
                if (isAdmin) {
                  setNewName(conv.name ?? '');
                  setIsEditingName(true);
                }
              }}
            >
              <Text className="text-[20px] font-bold text-[#f3f5f7]">
                {conv.name}
              </Text>
            </Pressable>
          )}
          <Text className="mt-1 text-[14px] text-[#555555]">
            {participants.length} members
          </Text>
        </VStack>

        <Divider className="bg-[#1e1e1e]" />

        {/* Action buttons */}
        <HStack className="justify-center gap-4 px-4 py-4">
          <Pressable onPress={handleToggleMute} className="items-center" style={{ width: 72 }}>
            <View className="mb-1.5 size-[44px] items-center justify-center rounded-full bg-[#262626]">
              {conv.is_muted ? (
                <BellOff size={20} color="#f3f5f7" />
              ) : (
                <Bell size={20} color="#f3f5f7" />
              )}
            </View>
            <Text className="text-center text-[11px] text-[#999]">
              {conv.is_muted ? 'Unmute' : 'Mute'}
            </Text>
          </Pressable>

          <Pressable onPress={handleTogglePin} className="items-center" style={{ width: 72 }}>
            <View className="mb-1.5 size-[44px] items-center justify-center rounded-full bg-[#262626]">
              <Pin size={20} color="#f3f5f7" fill={conv.is_pinned ? '#f3f5f7' : 'none'} />
            </View>
            <Text className="text-center text-[11px] text-[#999]">
              {conv.is_pinned ? 'Unpin' : 'Pin'}
            </Text>
          </Pressable>

          <Pressable className="items-center" style={{ width: 72 }}>
            <View className="mb-1.5 size-[44px] items-center justify-center rounded-full bg-[#262626]">
              <ImageIcon size={20} color="#f3f5f7" />
            </View>
            <Text className="text-center text-[11px] text-[#999]">Media</Text>
          </Pressable>
        </HStack>

        <Divider className="bg-[#1e1e1e]" />

        {/* Members section */}
        <View className="px-4 py-3">
          <HStack className="mb-2 items-center justify-between">
            <Text className="text-[15px] font-semibold text-[#f3f5f7]">
              Members ({participants.length})
            </Text>
            {isAdmin && (
              <Pressable
                onPress={handleAddMembers}
                className="flex-row items-center rounded-full bg-[#262626] px-3 py-1.5 active:bg-white/10"
              >
                <UserPlus size={14} color="#0095f6" />
                <Text className="ml-1.5 text-[12px] font-medium text-[#0095f6]">Add</Text>
              </Pressable>
            )}
          </HStack>

          {participants.map((p) => (
            <Pressable
              key={p.user_id}
              onPress={() => {
                if (p.user_id !== CURRENT_USER_ID) router.push(`/profile/${p.user_id}` as any);
              }}
              className="active:bg-white/5"
            >
              <HStack className="items-center py-2.5" space="md">
                <Avatar size="sm" className="h-[40px] w-[40px]">
                  <AvatarImage source={{ uri: p.user.avatar_url }} />
                </Avatar>
                <VStack className="flex-1">
                  <HStack className="items-center" space="xs">
                    <Text className="text-[14px] font-semibold text-[#f3f5f7]" numberOfLines={1}>
                      {p.user.display_name}
                      {p.user_id === CURRENT_USER_ID ? ' (You)' : ''}
                    </Text>
                    {p.user.verified && (
                      <BadgeCheck size={13} color="#0095f6" fill="#0095f6" />
                    )}
                  </HStack>
                  <Text className="text-[12px] text-[#555555]">
                    @{p.user.username}
                  </Text>
                </VStack>
                {p.role === 'admin' && (
                  <View className="rounded-full bg-[#0095f6]/15 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-[#0095f6]">Admin</Text>
                  </View>
                )}
                {isAdmin && p.user_id !== CURRENT_USER_ID && (
                  <Pressable
                    onPress={() => {
                      // Show options menu (simplified: toggle admin/remove)
                      if (p.role !== 'admin') {
                        handlePromote(p.user_id);
                      } else {
                        handleRemoveMember(p.user_id);
                      }
                    }}
                    className="rounded-full p-1.5 active:bg-white/10"
                  >
                    <MoreHorizontal size={18} color="#555555" />
                  </Pressable>
                )}
              </HStack>
              <Divider className="ml-[52px] bg-[#1e1e1e]" />
            </Pressable>
          ))}
        </View>

        <Divider className="bg-[#1e1e1e]" />

        {/* Leave group */}
        <Pressable
          onPress={handleLeave}
          className="flex-row items-center px-4 py-4 active:bg-white/5"
        >
          <LogOut size={20} color="#ff3040" />
          <Text className="ml-3 text-[15px] font-medium text-[#ff3040]">
            Leave Group
          </Text>
        </Pressable>

        <Divider className="bg-[#1e1e1e]" />

        {/* Delete group (admin only) */}
        {isAdmin && (
          <Pressable className="flex-row items-center px-4 py-4 active:bg-white/5">
            <Trash2 size={20} color="#ff3040" />
            <Text className="ml-3 text-[15px] font-medium text-[#ff3040]">
              Delete Group
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
