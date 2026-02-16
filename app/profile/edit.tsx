// app/profile/edit.tsx

import React, {
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
} from "react";
import {
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { ScreenLayout } from "@/components/ScreenLayout";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { UserService } from "@/services/user.service";
import { CloseIcon } from "@/constants/icons";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  MAX_BIO_LENGTH,
  MAX_USERNAME_LENGTH,
  AVATAR_OPTIONS,
} from "@/constants/app";

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
    <VStack className="border-b border-brand-border-secondary px-4 py-4">
      <Text className="text-[14px] font-bold text-brand-light">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.slice(0, maxLength))}
        placeholder={placeholder}
        placeholderTextColor="#777777"
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={{
          color: "#f3f5f7",
          fontSize: 15,
          paddingVertical: 8,
          paddingHorizontal: 0,
          textAlignVertical: multiline ? "top" : "center",
          ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
        }}
      />
      {multiline && (
        <Text className="mt-1 text-right text-[11px] text-brand-muted">
          {value.length}/{maxLength}
        </Text>
      )}
    </VStack>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    UserService.getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        setDisplayName(user.display_name);
        setUsername(user.username);
        setBio(user.bio || "");
        setAvatarUrl(user.avatar_url);
      })
      .catch(console.error);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const hasChanges =
    currentUser &&
    (displayName !== currentUser.display_name ||
      username !== currentUser.username ||
      bio !== (currentUser.bio || "") ||
      avatarUrl !== currentUser.avatar_url);

  const isValid =
    displayName.trim().length > 0 &&
    username.trim().length > 0 &&
    /^[a-zA-Z0-9._]+$/.test(username.trim());

  const handleSave = useCallback(async () => {
    if (!isValid || !hasChanges) return;

    setIsSaving(true);
    try {
      await UserService.updateProfile({
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });
      router.back();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [displayName, username, bio, avatarUrl, isValid, hasChanges, router]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      router.back();
    }
  }, [hasChanges, router]);

  if (!currentUser) {
    return (
      <ScreenLayout edges={[]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0095f6" size="small" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={["top", "bottom"]}>
      <HStack className="h-[56px] items-center justify-between px-4">
        <Pressable onPress={handleCancel} hitSlop={12} className="active:opacity-60">
          <Text className="text-[16px] text-brand-light">Cancel</Text>
        </Pressable>
        <Text className="text-[17px] font-bold text-brand-light">
          Edit profile
        </Text>
        <Pressable
          onPress={handleSave}
          hitSlop={12}
          disabled={!hasChanges || !isValid || isSaving}
          className="active:opacity-60 disabled:opacity-30"
        >
          <Text className="text-[16px] font-bold text-brand-blue">
            Done
          </Text>
        </Pressable>
      </HStack>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <VStack className="mx-4 mt-4 rounded-3xl border border-brand-border-secondary bg-brand-dark overflow-hidden">
            <HStack className="items-center justify-between border-b border-brand-border-secondary px-4 py-4">
              <VStack className="flex-1 gap-1">
                <Text className="text-[14px] font-bold text-brand-light">Name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Name"
                  placeholderTextColor="#777777"
                  className="text-[15px] text-brand-light"
                  style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}}
                />
              </VStack>
              <Pressable onPress={() => setShowAvatarPicker(true)}>
                <Avatar size="lg">
                  <AvatarImage source={{ uri: avatarUrl }} />
                </Avatar>
              </Pressable>
            </HStack>

            <EditField
              label="Username"
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9._]/g, ""))}
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
          </VStack>

          {showAvatarPicker && (
            <VStack className="mt-6 px-4" space="md">
              <HStack className="items-center justify-between">
                <Text className="text-[15px] font-bold text-brand-light">
                  Choose avatar
                </Text>
                <Pressable onPress={() => setShowAvatarPicker(false)}>
                  <CloseIcon size={20} color="#777777" />
                </Pressable>
              </HStack>
              <HStack className="flex-wrap gap-3">
                {AVATAR_OPTIONS.map((url) => (
                  <Pressable
                    key={url}
                    onPress={() => {
                      setAvatarUrl(url);
                      setShowAvatarPicker(false);
                    }}
                    className={`rounded-full border-2 ${
                      avatarUrl === url ? "border-brand-blue" : "border-transparent"
                    }`}
                  >
                    <Avatar size="md">
                      <AvatarImage source={{ uri: url }} />
                    </Avatar>
                  </Pressable>
                ))}
              </HStack>
            </VStack>
          )}

          {username.length > 0 && !isValid && (
            <Text className="mt-4 px-6 text-[13px] text-brand-red">
              Username can only contain letters, numbers, periods, and underscores.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmationDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => router.back()}
        title="Discard changes?"
        description="Your edits will not be saved."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        isDestructive
      />
    </ScreenLayout>
  );
}
