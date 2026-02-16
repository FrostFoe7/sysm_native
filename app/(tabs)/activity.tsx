// app/(tabs)/activity.tsx

import React, { useState, useCallback, useMemo } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenLayout } from "@/components/ScreenLayout";
import { AnimatedListItem } from "@/components/AnimatedListItem";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { DesktopRightColumn } from "@/components/DesktopRightColumn";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Divider } from "@/components/ui/divider";
import { Button, ButtonText } from "@/components/ui/button";
import { UserService } from "@/services/user.service";
import { formatRelativeTime } from "@/services/format";
import { Heart, MessageCircle, UserPlus } from "lucide-react-native";
import { VerifiedIcon } from "@/constants/icons";
import type { ActivityItem } from "@/types/types";
import { useActivity } from "@/hooks/use-user";
import { useInteractionStore } from "@/store/useInteractionStore";

type TabKey = "all" | "replies" | "mentions" | "follows";

export default function ActivityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const { followingUsers: followMap, setFollowing } = useInteractionStore();
  const { data: allActivity, isLoading } = useActivity();

  const filteredActivity = useMemo(() => {
    if (activeTab === "all") return allActivity;
    if (activeTab === "replies")
      return allActivity.filter((a) => a.type === "reply");
    if (activeTab === "follows")
      return allActivity.filter((a) => a.type === "follow");
    if (activeTab === "mentions") return [];
    return allActivity;
  }, [allActivity, activeTab]);

  const handleFollow = useCallback(
    async (userId: string) => {
      const wasFollowing = !!followMap[userId];
      setFollowing(userId, !wasFollowing);
      try {
        const result = await UserService.toggleFollow(userId);
        setFollowing(userId, result.following);
      } catch {
        setFollowing(userId, wasFollowing);
      }
    },
    [followMap, setFollowing],
  );

  const getTypeMeta = (type: ActivityItem["type"]) => {
    switch (type) {
      case "like":
        return {
          icon: Heart,
          color: "#ff3040",
          fill: "#ff3040",
          label: "liked your thread",
        };
      case "reply":
        return {
          icon: MessageCircle,
          color: "#0095f6",
          fill: undefined,
          label: "replied to your thread",
        };
      case "follow":
        return {
          icon: UserPlus,
          color: "#bf5af2",
          fill: undefined,
          label: "started following you",
        };
      default:
        return { icon: Heart, color: "#555555", fill: undefined, label: "" };
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "replies", label: "Replies" },
    { key: "mentions", label: "Mentions" },
    { key: "follows", label: "Follows" },
  ];

  const renderItem = useCallback(
    ({ item, index }: { item: ActivityItem; index: number }) => {
      const meta = getTypeMeta(item.type);
      const IconComponent = meta.icon;
      const isFollowed = followMap[item.actor.id] ?? false;

      return (
        <AnimatedListItem index={index}>
          <AnimatedPressable
            onPress={() => {
              if (item.type === "follow") {
                router.push(`/profile/${item.actor.id}`);
              } else if (item.thread) {
                router.push(`/thread/${item.thread.id}`);
              }
            }}
            scaleValue={0.98}
          >
            <HStack className="px-4 py-3" space="md">
              <View className="relative">
                <Avatar size="sm">
                  <AvatarImage source={{ uri: item.actor.avatar_url }} />
                </Avatar>
                <View
                  className="absolute -bottom-1 -right-1 size-[18px] items-center justify-center rounded-full border-2 border-brand-dark"
                  style={{ backgroundColor: meta.color }}
                >
                  <IconComponent
                    size={10}
                    color="white"
                    fill={meta.fill || "none"}
                    strokeWidth={2.5}
                  />
                </View>
              </View>
              <VStack className="flex-1 overflow-hidden">
                <HStack className="items-center" space="xs">
                  <Text
                    className="text-[14px] font-bold text-brand-light"
                    numberOfLines={1}
                    style={{ flexShrink: 1 }}
                  >
                    {item.actor.username}
                  </Text>
                  {item.actor.verified && (
                    <VerifiedIcon size={14} color="#0095f6" />
                  )}
                  <Text className="shrink-0 text-[13px] text-brand-muted">
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </HStack>
                <Text className="text-[14px] text-[#999]" numberOfLines={1}>
                  {meta.label}
                </Text>
                {item.thread && item.thread.content ? (
                  <Text
                    className="mt-0.5 text-[13px] text-[#777]"
                    numberOfLines={2}
                  >
                    {item.thread.content}
                  </Text>
                ) : null}
              </VStack>
              {item.type === "follow" && (
                <Button
                  size="sm"
                  variant={isFollowed ? "outline" : "solid"}
                  className={
                    isFollowed
                      ? "min-w-[90px] rounded-lg border-[#333] bg-transparent"
                      : "min-w-[90px] rounded-lg bg-brand-light"
                  }
                  onPress={() => handleFollow(item.actor.id)}
                >
                  <ButtonText
                    className={`text-[13px] font-semibold ${
                      isFollowed ? "text-brand-muted" : "text-brand-dark"
                    }`}
                  >
                    {isFollowed ? "Following" : "Follow back"}
                  </ButtonText>
                </Button>
              )}
            </HStack>
            <Divider className="ml-[64px] bg-brand-border" />
          </AnimatedPressable>
        </AnimatedListItem>
      );
    },
    [followMap, handleFollow, router],
  );

  return (
    <ScreenLayout>
      <View className="flex-1 lg:flex-row lg:justify-center">
        <View className="flex-1 lg:max-w-[600px]">
          <Box className="px-4 pb-1 pt-3">
            <Heading size="2xl" className="text-brand-light">
              Activity
            </Heading>
          </Box>

          {/* Animated pill tabs */}
          <HStack className="overflow-hidden px-4 py-2" space="sm">
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-full border px-4 py-[6px] ${
                  activeTab === tab.key
                    ? "border-brand-light bg-brand-light"
                    : "border-[#333] bg-transparent"
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    activeTab === tab.key
                      ? "text-brand-dark"
                      : "text-brand-muted"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </HStack>

          <FlatList
            data={filteredActivity}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              isLoading ? null : (
                <View className="items-center justify-center py-16">
                  <Text className="text-[15px] text-brand-muted">
                    No activity yet
                  </Text>
                </View>
              )
            }
          />
        </View>

        {/* Desktop Sidebar (lg: breakpoint) */}
        <View className="hidden lg:flex">
          <DesktopRightColumn />
        </View>
      </View>
    </ScreenLayout>
  );
}
