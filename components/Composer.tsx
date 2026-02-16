// components/Composer.tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  View,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Button, ButtonText } from "@/components/ui/button";
import { UserService } from "@/services/user.service";
import {
  MediaIcon,
  ReelsIcon,
  ChatIcon,
  CommunityIcon,
  CloseIcon,
  ArrowLeftIcon,
} from "@/constants/icons";
import type { MediaItem, User } from "@/types/types";

interface ComposerMedia {
  uri: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  loading?: boolean;
}

interface ComposerProps {
  onSubmit: (content: string, media?: MediaItem[]) => void;
  placeholder?: string;
  replyToUsername?: string;
  autoFocus?: boolean;
}

export function Composer({
  onSubmit,
  placeholder = "What's new?",
  replyToUsername,
  autoFocus = true,
}: ComposerProps) {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const maxLength = 500;

  useEffect(() => {
    UserService.getCurrentUser().then(setCurrentUser).catch(console.error);
  }, []);

  const remaining = maxLength - content.length;
  const maxMedia = 4;

  const anyLoading = media.some((m) => m.loading);

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (trimmed.length === 0 && media.length === 0) return;
    if (anyLoading) return;
    const mediaItems: MediaItem[] = media.map((m) => ({
      uri: m.uri,
      type: m.type,
      width: m.width,
      height: m.height,
    }));
    onSubmit(trimmed, mediaItems.length > 0 ? mediaItems : undefined);
    setContent("");
    setMedia([]);
  }, [content, media, onSubmit, anyLoading]);

  // Ctrl/Cmd + Enter to submit on web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const trimmed = content.trim();
        const hasContent = trimmed.length > 0 || media.length > 0;
        if (hasContent && !anyLoading && maxLength - trimmed.length >= 0) {
          const mediaItems: MediaItem[] = media.map((m) => ({
            uri: m.uri,
            type: m.type,
            width: m.width,
            height: m.height,
          }));
          onSubmit(trimmed, mediaItems.length > 0 ? mediaItems : undefined);
          setContent("");
          setMedia([]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content, media, onSubmit, anyLoading]);

  // Esc to cancel on web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (router.canGoBack()) {
          router.back();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const pickImages = useCallback(async () => {
    if (media.length >= maxMedia) return;
    const slotsLeft = maxMedia - media.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: slotsLeft,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newMedia: ComposerMedia[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: "image" as const,
        width: asset.width,
        height: asset.height,
        loading: false,
      }));
      setMedia((prev) => [...prev, ...newMedia].slice(0, maxMedia));
    }
  }, [media.length]);

  const pickVideos = useCallback(async () => {
    if (media.length >= maxMedia) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const newItem: ComposerMedia = {
        uri: asset.uri,
        type: "video",
        width: asset.width,
        height: asset.height,
        loading: false,
      };
      setMedia((prev) => [...prev, newItem].slice(0, maxMedia));
    }
  }, [media.length]);

  const removeMedia = useCallback((index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isValid =
    (content.trim().length > 0 || media.length > 0) &&
    remaining >= 0 &&
    !anyLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <VStack className="flex-1 bg-brand-elevated">
        {/* Composer body */}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Back Button */}
          <HStack className="items-center px-4 py-3" space="md">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="rounded-full p-1 active:bg-white/10"
            >
              <ArrowLeftIcon size={24} color="#f5f5f5" />
            </Pressable>
            <Text className="text-[18px] font-bold text-brand-light">
              New thread
            </Text>
          </HStack>

          <HStack className="px-4 pt-4" space="md">
            {/* Avatar column */}
            <VStack className="items-center">
              <Avatar size="sm">
                <AvatarImage source={{ uri: currentUser?.avatar_url ?? "" }} />
              </Avatar>
              <Box className="mt-2 min-h-[24px] w-[2px] flex-1 rounded-full bg-brand-border-secondary" />
            </VStack>

            {/* Input column */}
            <VStack className="flex-1 shrink" space="xs">
              <Text className="text-[15px] font-semibold text-brand-light">
                {currentUser?.username}
              </Text>
              {replyToUsername && (
                <Text className="text-[13px] text-brand-muted">
                  Replying to{" "}
                  <Text className="text-[13px] text-brand-blue">
                    @{replyToUsername}
                  </Text>
                </Text>
              )}
              <TextInput
                ref={inputRef}
                value={content}
                onChangeText={setContent}
                placeholder={
                  replyToUsername
                    ? `Reply to ${replyToUsername}...`
                    : placeholder
                }
                placeholderTextColor="#999999"
                multiline
                autoFocus={autoFocus}
                maxLength={maxLength}
                className="min-h-[80px] py-1 text-[15px] leading-[21px] text-brand-light"
                style={{
                  textAlignVertical: "top",
                  ...(Platform.OS === "web"
                    ? { outlineStyle: "none" as any }
                    : {}),
                  overflow: "hidden",
                }}
              />

              {/* Media preview grid */}
              {media.length > 0 && (
                <View className="mb-1 mt-2">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {media.map((item, index) => (
                      <View
                        key={`${item.uri}-${index}`}
                        style={{
                          width: media.length === 1 ? 200 : 140,
                          height: media.length === 1 ? 200 : 140,
                          borderRadius: 12,
                          overflow: "hidden",
                          backgroundColor: "#1e1e1e",
                        }}
                      >
                        {item.loading ? null : (
                          <Image
                            source={{ uri: item.uri }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={200}
                          />
                        )}
                        {/* Video badge */}
                        {item.type === "video" && !item.loading && (
                          <View
                            style={{
                              position: "absolute",
                              bottom: 6,
                              left: 6,
                              paddingHorizontal: 5,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: "rgba(0,0,0,0.6)",
                            }}
                          >
                            <Text className="text-2xs font-semibold text-white">
                              VIDEO
                            </Text>
                          </View>
                        )}
                        {/* Remove button */}
                        <Pressable
                          onPress={() => removeMedia(index)}
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: "rgba(0,0,0,0.7)",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                          hitSlop={4}
                        >
                          <CloseIcon size={13} color="#ffffff" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Toolbar */}
              <HStack className="mt-2 items-center pb-4" space="lg">
                <Pressable
                  hitSlop={8}
                  className="active:opacity-60"
                  onPress={pickImages}
                  disabled={media.length >= maxMedia}
                  style={{ opacity: media.length >= maxMedia ? 0.3 : 1 }}
                >
                  <MediaIcon size={22} color="#999999" />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  className="active:opacity-60"
                  onPress={pickVideos}
                  disabled={media.length >= maxMedia}
                  style={{ opacity: media.length >= maxMedia ? 0.3 : 1 }}
                >
                  <ReelsIcon size={22} color="#999999" />
                </Pressable>
                <Pressable hitSlop={8} className="active:opacity-60">
                  <CommunityIcon size={22} color="#999999" />
                </Pressable>
                <Pressable hitSlop={8} className="active:opacity-60">
                  <ChatIcon size={22} color="#999999" />
                </Pressable>
              </HStack>
            </VStack>
          </HStack>
        </ScrollView>

        <Divider className="bg-brand-border" />

        {/* Bottom bar */}
        <HStack className="items-center justify-between px-4 py-3 pb-4">
          <VStack>
            <Text className="text-[13px] text-brand-muted">
              Anyone can reply & quote
            </Text>
            {media.length > 0 && (
              <Text className="mt-0.5 text-[11px] text-brand-muted">
                {media.length}/{maxMedia} media
              </Text>
            )}
          </VStack>
          <HStack className="items-center" space="md">
            {content.length > 0 && (
              <Text
                className={`text-[13px] ${
                  remaining < 20 ? "text-brand-red" : "text-brand-muted"
                }`}
              >
                {remaining}
              </Text>
            )}
            <Button
              size="sm"
              onPress={handleSubmit}
              disabled={!isValid}
              className={`h-9 rounded-full px-5 ${
                isValid ? "bg-brand-light" : "bg-brand-border"
              }`}
            >
              <ButtonText
                className={`text-[14px] font-semibold ${
                  isValid ? "text-brand-dark" : "#555555"
                }`}
              >
                Post
              </ButtonText>
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </KeyboardAvoidingView>
  );
}
