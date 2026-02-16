// components/DesktopSidebar.tsx

import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Divider } from "@/components/ui/divider";
import { UserService } from "@/services/user.service";
import type { User as UserType } from "@/types/types";
import {
  HomeIcon,
  ReelsIcon,
  NotificationsIcon,
  ChatIcon,
  EditIcon,
  SettingsIcon,
} from "@/constants/icons";
import { Search, User } from "lucide-react-native";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: HomeIcon,
    label: "Home",
    path: "/(tabs)",
    matchPaths: ["/", "/(tabs)", "/(tabs)/index"],
  },
  {
    icon: Search,
    label: "Search",
    path: "/(tabs)/explore",
    matchPaths: ["/(tabs)/explore", "/explore"],
  },
  {
    icon: EditIcon,
    label: "New Thread",
    path: "/modal",
    matchPaths: ["/modal", "/(tabs)/new"],
  },
  {
    icon: ReelsIcon,
    label: "Reels",
    path: "/(tabs)/reels",
    matchPaths: ["/(tabs)/reels", "/reels"],
  },
  {
    icon: NotificationsIcon,
    label: "Activity",
    path: "/(tabs)/activity",
    matchPaths: ["/(tabs)/activity", "/activity"],
  },
  {
    icon: ChatIcon,
    label: "Messages",
    path: "/(tabs)/inbox",
    matchPaths: ["/(tabs)/inbox", "/inbox"],
  },
  {
    icon: User,
    label: "Profile",
    path: "/(tabs)/profile",
    matchPaths: ["/(tabs)/profile", "/profile"],
  },
];

function SidebarNavItem({
  item,
  isActive,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;
  const color = isActive ? "#f3f5f7" : "#777777";

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl px-4 py-3 active:bg-white/5"
      style={{ gap: 16 }}
    >
      <View className="w-7 items-center">
        <Icon size={26} color={color} strokeWidth={isActive ? 2.5 : 1.8} />
      </View>
      <Text
        className={`text-[16px] ${
          isActive ? "font-semibold text-brand-light" : "text-brand-muted-alt"
        }`}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  useEffect(() => {
    UserService.getCurrentUser().then(setCurrentUser).catch(console.error);
  }, []);

  const isActive = useCallback(
    (item: NavItem) => {
      return item.matchPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/"),
      );
    },
    [pathname],
  );

  const handleNav = useCallback(
    (item: NavItem) => {
      if (item.path === "/modal") {
        router.push("/modal");
      } else {
        router.replace(item.path as any);
      }
    },
    [router],
  );

  return (
    <View className="h-full w-[240px] flex-col justify-between border-r border-brand-border bg-brand-dark pb-6 pt-4">
      <VStack className="flex-1">
        {/* Logo / Brand */}
        <Pressable
          className="mb-2 px-5 py-4"
          onPress={() => router.replace("/(tabs)" as any)}
        >
          <Text className="text-[22px] font-bold tracking-tight text-brand-light">
            𝕋𝕙𝕣𝕖𝕒𝕕𝕤
          </Text>
        </Pressable>

        {/* Nav items */}
        <VStack className="px-2" space="xs">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.label}
              item={item}
              isActive={isActive(item)}
              onPress={() => handleNav(item)}
            />
          ))}
        </VStack>
      </VStack>

      {/* Bottom: user row + menu */}
      <VStack className="px-2">
        <Divider className="mb-3 bg-brand-border" />
        {currentUser && (
          <Pressable
            className="flex-row items-center rounded-xl px-4 py-3 active:bg-white/5"
            style={{ gap: 12 }}
            onPress={() => router.replace("/(tabs)/profile" as any)}
          >
            <Avatar size="sm">
              <AvatarImage source={{ uri: currentUser.avatar_url }} />
            </Avatar>
            <VStack className="flex-1">
              <Text
                className="text-[14px] font-semibold text-brand-light"
                numberOfLines={1}
              >
                {currentUser.display_name}
              </Text>
              <Text className="text-[12px] text-brand-muted" numberOfLines={1}>
                @{currentUser.username}
              </Text>
            </VStack>
            <SettingsIcon size={18} color="#555555" />
          </Pressable>
        )}
      </VStack>
    </View>
  );
}
