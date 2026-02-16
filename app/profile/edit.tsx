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
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { ScreenLayout } from "@/components/ScreenLayout";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Divider } from "@/components/ui/divider";
import { Box } from "@/components/ui/box";
import { UserService } from "@/services/user.service";
import { CameraIcon, CloseIcon, ArrowLeftIcon } from "@/constants/icons";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  MAX_BIO_LENGTH,
  MAX_NAME_LENGTH,
  MAX_USERNAME_LENGTH,
  AVATAR_OPTIONS,
} from "@/constants/app";
import { SafeAreaView } from "@/components/ui/safe-area-view";

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
      <HStack className="mb-1 items-center justify-between">
        <Text className="text-[13px] text-brand-muted-alt">{label}</Text>
        <Text className="text-[12px] text-brand-muted">
          {value.length}/{maxLength}
        </Text>
      </HStack>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.slice(0, maxLength))}
        placeholder={placeholder}
        placeholderTextColor="brand-muted"
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        style={{
          color: "brand-light",
          fontSize: 16,
          paddingVertical: 8,
          paddingHorizontal: 0,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? "top" : "center",
          ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
        }}
      />
      <Divider className="mt-1 bg-brand-border-secondary" />
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
        setBio(user.bio);
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
      bio !== currentUser.bio ||
      avatarUrl !== currentUser.avatar_url);

  const isValid =
    displayName.trim().length > 0 &&
    username.trim().length > 0 &&
    /^[a-zA-Z0-9._]+$/.test(username.trim());

  const handleSave = useCallback(async () => {
    if (!isValid || !hasChanges) return;

    setIsSaving(true);

    await UserService.updateProfile({
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
      setShowDiscardConfirm(true);
    } else {
      router.back();
    }
  }, [hasChanges, router]);

  if (!currentUser) {
    return (
      <ScreenLayout edges={[]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-brand-muted">Loading...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={[]}>
      <SafeAreaView edges={["top"]}>
        <HStack className="items-center justify-between px-4 py-2" space="md">
          <HStack className="items-center" space="md">
            <Pressable
              onPress={handleCancel}
              hitSlop={12}
              className="rounded-full p-1 active:bg-white/10"
            >
              <ArrowLeftIcon size={24} color="#f5f5f5" />
            </Pressable>
            <Text className="text-[18px] font-bold text-brand-light">
              Edit Profile
            </Text>
          </HStack>

          <Pressable
            onPress={handleSave}
            hitSlop={12}
            disabled={!hasChanges || !isValid || isSaving}
            className="p-1"
          >
            <Text
              className={`text-[16px] font-semibold ${
                hasChanges && isValid ? "text-brand-blue" : "text-[#333333]"
              }`}
            >
              Done
            </Text>
          </Pressable>
        </HStack>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              </Avatar>
              <Box className="absolute bottom-0 right-0 rounded-full border-2 border-brand-dark bg-brand-blue p-1.5">
                <CameraIcon size={14} color="#ffffff" />
              </Box>
            </Pressable>
            <Text className="mt-2 text-[14px] font-medium text-brand-blue">
              Change photo
            </Text>
          </VStack>

          {/* Avatar picker grid */}
          {showAvatarPicker && (
            <VStack className="mb-4 px-4">
              <HStack className="mb-3 items-center justify-between">
                <Text className="text-[13px] text-brand-muted-alt">
                  Choose avatar
                </Text>
                <Pressable
                  onPress={() => setShowAvatarPicker(false)}
                  hitSlop={8}
                >
                  <CloseIcon size={16} color="#777777" />
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
                      avatarUrl === url ? "border-2 border-brand-blue" : ""
                    }`}
                  >
                    <Avatar size="md">
                      <AvatarImage source={{ uri: url }} />
                    </Avatar>
                  </Pressable>
                ))}
              </HStack>
              <Divider className="mt-4 bg-brand-border-secondary" />
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

          {/* Username validation */}
          {username.length > 0 && !isValid && (
            <Text className="mt-1 px-4 text-[13px] text-brand-red">
              Username can only contain letters, numbers, periods, and
              underscores.
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
