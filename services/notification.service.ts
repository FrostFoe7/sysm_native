import { supabase, getCachedUserId } from "./supabase";

export interface NotificationItem {
  id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  thread_id: string | null;
  reel_id: string | null;
  actor_id: string;
  actor_username: string;
  actor_display_name: string;
  actor_avatar_url: string;
  actor_verified: boolean;
  thread_content: string | null;
}

async function getNotifications(
  limit = 50,
  offset = 0,
): Promise<NotificationItem[]> {
  const userId = await getCachedUserId();
  if (!userId) return [];

  const { data, error } = await supabase.rpc("get_notifications", {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return (data ?? []) as NotificationItem[];
}

async function getUnreadCount(): Promise<number> {
  const userId = await getCachedUserId();
  if (!userId) return 0;

  const { data, error } = await supabase.rpc("get_unread_notification_count", {
    p_user_id: userId,
  });

  if (error) return 0;
  return data ?? 0;
}

async function markAllRead(): Promise<void> {
  const userId = await getCachedUserId();
  if (!userId) return;

  await supabase.rpc("mark_all_notifications_read", {
    p_user_id: userId,
  });
}

async function markAsRead(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

function subscribeToNotifications(
  userId: string,
  onNotification: (notification: any) => void,
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => onNotification(payload.new),
    )
    .subscribe();
}

export const NotificationService = {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markAsRead,
  subscribeToNotifications,
};
