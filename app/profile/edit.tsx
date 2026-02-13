// app/profile/edit.tsx

import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Divider } from '@/components/ui/divider';
import { Box } from '@/components/ui/box';
import { getCurrentUser, updateCurrentUser } from '@/db/selectors';
import { Camera, X } from 'lucide-react-native';
import type { User } from '@/db/db';

const MAX_BIO_LENGTH = 150;
const MAX_NAME_LENGTH = 50;
const MAX_USERNAME_LENGTH = 30;

const AVATAR_OPTIONS = [
  'https://i.pravatar.cc/300?img=60',
  'https://i.pravatar.cc/300?img=61',
  'https://i.pravatar.cc/300?img=62',
  'https://i.pravatar.cc/300?img=63',
  'https://i.pravatar.cc/300?img=64',
  'https://i.pravatar.cc/300?img=65',
  'https://i.pravatar.cc/300?img=66',
  'https://i.pravatar.cc/300?img=67',
  'https://i.pravatar.cc/300?img=68',
  'https://i.pravatar.cc/300?img=69',
];

function EditField({
  label,
  value,
  onChangeText,
  maxLength,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <VStack className="px-4 py-3">
      <HStack className="items-center justify-between mb-1">
        <Text className="text-[#777777] text-[13px]">{label}</Text>
        <Text className="text-[#555555] text-[12px]">
          {value.length}/{maxLength}
        </Text>
      </HStack>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.slice(0, maxLength))}
        placeholder={placeholder}
        placeholderTextColor="#555555"
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        style={{
          color: '#f3f5f7',
          fontSize: 16,
          paddingVertical: 8,
          paddingHorizontal: 0,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      <Divider className="bg-[#2a2a2a] mt-1" />
    </VStack>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const currentUser = getCurrentUser();

  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    displayName !== currentUser.display_name ||
    username !== currentUser.username ||
    bio !== currentUser.bio ||
    avatarUrl !== currentUser.avatar_url;

  const isValid =
    displayName.trim().length > 0 &&
    username.trim().length > 0 &&
    /^[a-zA-Z0-9._]+$/.test(username.trim());

  const handleSave = useCallback(() => {
    if (!isValid || !hasChanges) return;

    setIsSaving(true);

    updateCurrentUser({
      display_name: displayName.trim(),
      username: username.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl,
    });

    setIsSaving(false);
    router.back();
  }, [displayName, username, bio, avatarUrl, isValid, hasChanges, router]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('Discard changes?');
        if (confirmed) router.back();
      } else {
        Alert.alert('Discard changes?', 'Your edits will not be saved.', [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]);
      }
    } else {
      router.back();
    }
  }, [hasChanges, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={handleCancel} hitSlop={12} className="p-1">
          <Text className="text-[#f3f5f7] text-[16px]">Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          hitSlop={12}
          disabled={!hasChanges || !isValid || isSaving}
          className="p-1"
        >
          <Text
            className={`text-[16px] font-semibold ${
              hasChanges && isValid ? 'text-[#0095f6]' : 'text-[#333333]'
            }`}
          >
            Done
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, handleCancel, handleSave, hasChanges, isValid, isSaving]);

  return (
    <ScreenLayout edges={[]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Avatar section */}
          <VStack className="items-center py-6">
            <Pressable
              onPress={() => setShowAvatarPicker((v) => !v)}
              className="relative"
            >
              <Avatar size="xl">
                <AvatarImage source={{ uri: avatarUrl }} />
                <AvatarFallbackText>{displayName}</AvatarFallbackText>
              </Avatar>
              <Box className="absolute bottom-0 right-0 bg-[#0095f6] rounded-full p-1.5 border-2 border-[#101010]">
                <Camera size={14} color="#ffffff" strokeWidth={2.5} />
              </Box>
            </Pressable>
            <Text className="text-[#0095f6] text-[14px] font-medium mt-2">
              Change photo
            </Text>
          </VStack>

          {/* Avatar picker grid */}
          {showAvatarPicker && (
            <VStack className="px-4 mb-4">
              <HStack className="items-center justify-between mb-3">
                <Text className="text-[#777777] text-[13px]">Choose avatar</Text>
                <Pressable
                  onPress={() => setShowAvatarPicker(false)}
                  hitSlop={8}
                >
                  <X size={16} color="#555555" />
                </Pressable>
              </HStack>
              <HStack className="flex-wrap" style={{ gap: 10 }}>
                {AVATAR_OPTIONS.map((url) => (
                  <Pressable
                    key={url}
                    onPress={() => {
                      setAvatarUrl(url);
                      setShowAvatarPicker(false);
                    }}
                    className={`rounded-full ${
                      avatarUrl === url ? 'border-2 border-[#0095f6]' : ''
                    }`}
                  >
                    <Avatar size="md">
                      <AvatarImage source={{ uri: url }} />
                      <AvatarFallbackText>A</AvatarFallbackText>
                    </Avatar>
                  </Pressable>
                ))}
              </HStack>
              <Divider className="bg-[#2a2a2a] mt-4" />
            </VStack>
          )}

          {/* Edit fields */}
          <EditField
            label="Name"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Display name"
          />

          <EditField
            label="Username"
            value={username}
            onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9._]/g, ''))}
            maxLength={MAX_USERNAME_LENGTH}
            placeholder="username"
          />

          <EditField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            maxLength={MAX_BIO_LENGTH}
            placeholder="Write a bio..."
            multiline
          />

          {/* Username validation */}
          {username.length > 0 && !isValid && (
            <Text className="text-[#ff3040] text-[13px] px-4 mt-1">
              Username can only contain letters, numbers, periods, and underscores.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}
