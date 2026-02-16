// services/push.service.ts
// Push notification client — token registration, foreground handling,
// deep link navigation, badge management.
// Uses Expo Notifications + Supabase for token storage.

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router } from "expo-router";
import { supabase, getCachedUserId } from "./supabase";

// ─── Configuration ──────────────────────────────────────────────────────────────

// Foreground notification behavior — guard for SSR (static rendering)
if (typeof window !== "undefined") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PushPayload {
  conversationId: string;
  senderId: string;
  senderName: string;
  messagePreview: string;
  type: "message" | "group_message";
}

// ─── Token Registration ─────────────────────────────────────────────────────────

/**
 * Request push notification permissions and register the device token.
 * Idempotent — safe to call on every app boot.
 */
async function registerForPushNotifications(): Promise<string | null> {
  // Physical device check (push doesn't work on simulators)
  if (!Device.isDevice && Platform.OS !== "web") {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0A84FF",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
    });
  }

  // Get Expo push token
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    // Web requires VAPID key
    const vapidPublicKey = (Constants.expoConfig?.notification as any)?.vapidPublicKey;
    if (Platform.OS === "web" && !vapidPublicKey) {
      console.log(
        "Push notifications on web require vapidPublicKey in app.json. Skipping registration.",
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
      ...(vapidPublicKey ? { vapidKey: vapidPublicKey } as any : {}),
    });

    const token = tokenData.data;

    // Upsert to Supabase
    await upsertDeviceToken(token);

    return token;
  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

/**
 * Store/update device token in Supabase via RPC.
 */
async function upsertDeviceToken(token: string): Promise<void> {
  const userId = await getCachedUserId();
  const platform = Platform.OS as "ios" | "android" | "web";

  const { error } = await supabase.rpc("upsert_device_token", {
    p_user_id: userId,
    p_expo_push_token: token,
    p_platform: platform,
  });

  if (error) {
    // Fallback: direct upsert
    await supabase.from("user_devices").upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "user_id,expo_push_token" },
    );
  }
}

/**
 * Deactivate the current device token (called on logout).
 */
async function deactivateDevice(token: string): Promise<void> {
  try {
    const userId = await getCachedUserId();
    await supabase.rpc("deactivate_device", {
      p_user_id: userId,
      p_expo_push_token: token,
    });
  } catch {
    // Best-effort deactivation
  }
}

/**
 * Update last_seen_at for presence tracking.
 */
async function updateLastSeen(): Promise<void> {
  try {
    const userId = await getCachedUserId();
    await supabase
      .from("user_devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_active", true);
  } catch {
    // Non-critical
  }
}

// ─── Notification Handling ──────────────────────────────────────────────────────

/**
 * Set up foreground notification listener.
 * Returns cleanup function.
 */
function setupForegroundListener(
  onNotification?: (payload: PushPayload) => void,
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification: any) => {
      const data = notification.request.content.data as PushPayload | undefined;
      if (data) {
        onNotification?.(data);
      }
    },
  );

  return () => subscription.remove();
}

/**
 * Set up notification tap handler — deep links to correct conversation.
 * Returns cleanup function.
 */
function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response: any) => {
      const data = response.notification.request.content.data as
        | PushPayload
        | undefined;
      if (data?.conversationId) {
        // Deep link to conversation
        router.push(`/conversation/${data.conversationId}` as any);
      }
    },
  );

  return () => subscription.remove();
}

/**
 * Check if the app was opened from a notification (cold start).
 */
async function getInitialNotification(): Promise<PushPayload | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    return (
      (response.notification.request.content.data as unknown as PushPayload) ??
      null
    );
  }
  return null;
}

// ─── Badge Management ───────────────────────────────────────────────────────────

/**
 * Set the app badge count to the number of unread conversations.
 */
async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Badge not supported on all platforms
  }
}

/**
 * Clear the badge.
 */
async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

// ─── Desktop / Web Notifications ────────────────────────────────────────────────

/**
 * Request web notification permission and display notifications via Notification API.
 */
async function requestWebNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "web" || typeof Notification === "undefined")
    return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

function showWebNotification(
  title: string,
  body: string,
  data?: PushPayload,
): void {
  if (Platform.OS !== "web" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: "/favicon.png",
    tag: data?.conversationId ?? "message",
    data,
  });

  notification.onclick = () => {
    window.focus();
    if (data?.conversationId) {
      router.push(`/conversation/${data.conversationId}` as any);
    }
    notification.close();
  };
}

export const PushService = {
  registerForPushNotifications,
  deactivateDevice,
  updateLastSeen,
  upsertDeviceToken,
  setupForegroundListener,
  setupNotificationResponseListener,
  getInitialNotification,
  setBadgeCount,
  clearBadge,
  requestWebNotificationPermission,
  showWebNotification,
};
