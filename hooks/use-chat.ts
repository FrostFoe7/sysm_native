// hooks/use-chat.ts
// Full chat hook with realtime subscriptions, de-duping, optimistic send,
// typing indicators (debounced + auto-expire), and message ordering.

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ChatService } from "@/services/chat.service";
import { VoiceService } from "@/services/voice.service";
import { useAuthStore } from "@/store/useAuthStore";
import type {
  MessageWithSender,
  ConversationWithDetails,
  ChatItem,
  User,
} from "@/types/types";

const TYPING_DEBOUNCE_MS = 1500;
const TYPING_EXPIRE_MS = 3000;

/**
 * Hook for managing a single chat conversation.
 * - Realtime message delivery with de-duping by ID
 * - Monotonic ordering via (created_at, id)
 * - Optimistic sends with temp ID → server ID swap
 * - Failed sends show error state
 * - Typing indicators with debounce + expiry
 * - Mark as read only when screen is focused
 * - Proper subscription cleanup on unmount
 */
export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [details, setDetails] = useState<ConversationWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<
    Map<string, { user: User; expiresAt: number }>
  >(new Map());
  const { user, userId: currentUserId } = useAuthStore();

  // Refs for cleanup
  const seenIds = useRef(new Set<string>());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const typingExpiryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(true);
  const subCleanupRef = useRef<(() => void) | null>(null);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!conversationId) return;

    try {
      const [msgData, detailData] = await Promise.all([
        ChatService.getMessages(conversationId),
        ChatService.getConversation(conversationId),
      ]);

      // De-dupe and sort
      seenIds.current = new Set(msgData.map((m) => m.id));
      setMessages(sortMessages(msgData));
      setDetails(detailData ?? null);
      setHasMore(msgData.length >= 50);

      // Mark as read when focused
      if (isFocusedRef.current) {
        ChatService.markAsRead(conversationId).catch(() => {});
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  /** Load older messages (cursor pagination) */
  const loadMore = useCallback(async () => {
    if (!hasMore || messages.length === 0) return;

    const oldest = messages[0];
    try {
      const older = await ChatService.getMessages(
        conversationId,
        50,
        oldest.created_at,
        oldest.id,
      );
      if (older.length === 0) {
        setHasMore(false);
        return;
      }

      setMessages((prev) => {
        const merged = [...older, ...prev];
        // De-dupe by id
        const unique = new Map<string, MessageWithSender>();
        for (const m of merged) unique.set(m.id, m);
        older.forEach((m) => seenIds.current.add(m.id));
        return sortMessages(Array.from(unique.values()));
      });
      setHasMore(older.length >= 50);
    } catch (error) {
      console.error("Failed to load more messages:", error);
    }
  }, [conversationId, hasMore, messages]);

  // ─── Realtime subscriptions ───────────────────────────────────────────────

  useEffect(() => {
    if (!conversationId) return;

    // 1. New messages
    const msgSub = ChatService.subscribeToMessages(
      conversationId,
      (raw: any) => {
        // De-dupe: skip if we already have this message (from optimistic send or dupe event)
        if (seenIds.current.has(raw.id)) {
          // But swap temp message if this is the real version
          setMessages((prev) =>
            prev.map((m) =>
              m.id.startsWith("temp-") &&
              m.content === raw.content &&
              m.sender_id === raw.sender_id
                ? {
                    ...m,
                    id: raw.id,
                    status: raw.status,
                    created_at: raw.created_at,
                  }
                : m,
            ),
          );
          return;
        }

        seenIds.current.add(raw.id);

        // Build a minimal MessageWithSender from the realtime payload
        const incoming: MessageWithSender = {
          id: raw.id,
          conversation_id: raw.conversation_id,
          sender_id: raw.sender_id,
          type: raw.type,
          content: raw.content ?? "",
          media_url: raw.media_url,
          media_thumbnail: raw.media_thumbnail,
          reply_to_id: raw.reply_to_id,
          shared_thread_id: raw.shared_thread_id,
          shared_reel_id: raw.shared_reel_id,
          reactions: [],
          status: raw.status ?? "sent",
          created_at: raw.created_at,
          is_deleted: raw.is_deleted ?? false,
          audio_url: raw.audio_url ?? null,
          audio_duration_ms: raw.audio_duration_ms ?? null,
          encrypted_content: raw.encrypted_content ?? null,
          encrypted_key: raw.encrypted_key ?? null,
          key_version: raw.key_version ?? null,
          is_encrypted: raw.is_encrypted ?? false,
          sender: {
            id: raw.sender_id,
            username: "",
            display_name: "",
            avatar_url: "",
            bio: "",
            verified: false,
            is_private: false,
            followers_count: 0,
            following_count: 0,
            created_at: "",
          },
          replyTo: null,
          sharedThread: null,
          sharedReel: null,
        };

        setMessages((prev) => sortMessages([...prev, incoming]));

        // Mark read if focused
        if (isFocusedRef.current && raw.sender_id !== currentUserId) {
          ChatService.markAsRead(conversationId).catch(() => {});
        }
      },
    );

    // 2. Message updates (edits, deletions)
    const updateSub = ChatService.subscribeToMessageUpdates(
      conversationId,
      (raw: any) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === raw.id
              ? {
                  ...m,
                  content: raw.content,
                  is_deleted: raw.is_deleted,
                  status: raw.status,
                }
              : m,
          ),
        );
      },
    );

    // 3. Typing indicators
    const typingSub = ChatService.subscribeToTyping(
      conversationId,
      (uid: string, isTyping: boolean) => {
        if (uid === currentUserId) return; // ignore self

        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            // Find user from details
            const typingUser = details?.participants.find(
              (p) => p.user_id === uid,
            )?.user;
            if (typingUser) {
              next.set(uid, {
                user: typingUser,
                expiresAt: Date.now() + TYPING_EXPIRE_MS,
              });
            }
          } else {
            next.delete(uid);
          }
          return next;
        });
      },
    );

    // 4. Participant changes (join/leave) — refresh details
    const participantSub = ChatService.subscribeToParticipants(
      conversationId,
      () => {
        ChatService.getConversation(conversationId).then((d) => {
          if (d) setDetails(d);
        });
      },
    );

    // Cleanup
    subCleanupRef.current = () => {
      supabaseUnsubscribe(msgSub);
      supabaseUnsubscribe(updateSub);
      supabaseUnsubscribe(typingSub);
      supabaseUnsubscribe(participantSub);
    };

    return () => {
      subCleanupRef.current?.();
      subCleanupRef.current = null;
    };
  }, [conversationId, currentUserId, details?.participants]);

  // Typing expiry timer — clean up stale typing indicators every second
  useEffect(() => {
    typingExpiryRef.current = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);
        for (const [uid, entry] of next) {
          if (entry.expiresAt <= now) {
            next.delete(uid);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      if (typingExpiryRef.current) clearInterval(typingExpiryRef.current);
    };
  }, []);

  // ─── Focus / AppState tracking ────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      loadData();

      return () => {
        isFocusedRef.current = false;
        // Clear typing when leaving
        if (isTypingRef.current) {
          ChatService.setTyping(conversationId, false).catch(() => {});
          isTypingRef.current = false;
        }
      };
    }, [loadData, conversationId]),
  );

  // Mark as read when app comes to foreground
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active" && isFocusedRef.current) {
        ChatService.markAsRead(conversationId).catch(() => {});
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [conversationId]);

  // ─── Chat items ───────────────────────────────────────────────────────────

  const chatItems = useMemo(() => buildChatItems(messages), [messages]);

  const activeTypingUsers = useMemo(
    () => Array.from(typingUsers.values()).map((e) => e.user),
    [typingUsers],
  );

  // ─── Send message ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!conversationId || !content.trim() || !user) return;

      // Clear typing
      if (isTypingRef.current) {
        ChatService.setTyping(conversationId, false).catch(() => {});
        isTypingRef.current = false;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tempMessage: MessageWithSender = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        sender: user,
        type: "text",
        content: content.trim(),
        media_url: null,
        media_thumbnail: null,
        reply_to_id: replyToId || null,
        shared_thread_id: null,
        shared_reel_id: null,
        reactions: [],
        status: "sending",
        created_at: new Date().toISOString(),
        is_deleted: false,
        audio_url: null,
        audio_duration_ms: null,
        encrypted_content: null,
        encrypted_key: null,
        key_version: null,
        is_encrypted: false,
        replyTo: null,
        sharedThread: null,
        sharedReel: null,
      };

      // Optimistic insert
      seenIds.current.add(tempId);
      setMessages((prev) => [...prev, tempMessage]);

      try {
        const sentMessage = await ChatService.sendMessage({
          conversationId,
          content: content.trim(),
          replyToId,
        });

        // Swap temp → real
        seenIds.current.add(sentMessage.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...sentMessage,
                  sender: user,
                  replyTo: null,
                  sharedThread: null,
                  sharedReel: null,
                }
              : m,
          ),
        );
      } catch (error) {
        console.error("Failed to send message:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "error" as any } : m,
          ),
        );
      }
    },
    [conversationId, user],
  );

  // ─── Retry failed send ───────────────────────────────────────────────────

  const retrySend = useCallback(
    async (tempId: string) => {
      const msg = messages.find((m) => m.id === tempId);
      if (!msg || !user) return;

      // Mark as sending again
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: "sending" as any } : m,
        ),
      );

      try {
        const sentMessage = await ChatService.sendMessage({
          conversationId,
          content: msg.content,
          replyToId: msg.reply_to_id ?? undefined,
        });

        seenIds.current.add(sentMessage.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...sentMessage,
                  sender: user,
                  replyTo: null,
                  sharedThread: null,
                  sharedReel: null,
                }
              : m,
          ),
        );
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "error" as any } : m,
          ),
        );
      }
    },
    [conversationId, messages, user],
  );

  // ─── Reactions (optimistic) ───────────────────────────────────────────────

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUserId) return;

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find(
            (r) => r.user_id === currentUserId && r.emoji === emoji,
          );
          return {
            ...m,
            reactions: existing
              ? m.reactions.filter(
                  (r) => !(r.user_id === currentUserId && r.emoji === emoji),
                )
              : [
                  ...m.reactions,
                  {
                    user_id: currentUserId,
                    emoji,
                    created_at: new Date().toISOString(),
                  },
                ],
          };
        }),
      );

      try {
        await ChatService.toggleReaction(messageId, emoji);
      } catch (error) {
        console.error("Failed to toggle reaction:", error);
        // Reload to get correct state
        loadData();
      }
    },
    [currentUserId, loadData],
  );

  // ─── Typing ──────────────────────────────────────────────────────────────

  const onTextChange = useCallback(() => {
    if (!conversationId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      ChatService.setTyping(conversationId, true).catch(() => {});
    }

    // Reset debounce timer
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        ChatService.setTyping(conversationId, false).catch(() => {});
      }
    }, TYPING_DEBOUNCE_MS);
  }, [conversationId]);

  // ─── Delete message ──────────────────────────────────────────────────────

  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true } : m)),
    );
    const ok = await ChatService.deleteMessage(messageId);
    if (!ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_deleted: false } : m)),
      );
    }
  }, []);

  // ─── Send voice note ─────────────────────────────────────────────────────

  const sendVoice = useCallback(
    async (uri: string, durationMs: number, replyToId?: string) => {
      if (!conversationId || !user) return;

      const tempId = `temp-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tempMessage: MessageWithSender = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        sender: user,
        type: "voice_note",
        content: "",
        media_url: null,
        media_thumbnail: null,
        reply_to_id: replyToId || null,
        shared_thread_id: null,
        shared_reel_id: null,
        reactions: [],
        status: "sending",
        created_at: new Date().toISOString(),
        is_deleted: false,
        audio_url: uri,
        audio_duration_ms: durationMs,
        encrypted_content: null,
        encrypted_key: null,
        key_version: null,
        is_encrypted: false,
        replyTo: null,
        sharedThread: null,
        sharedReel: null,
      };

      seenIds.current.add(tempId);
      setMessages((prev) => [...prev, tempMessage]);

      try {
        // Upload audio to Supabase Storage
        const uploadResult = await VoiceService.uploadVoiceNote(
          conversationId,
          {
            uri,
            durationMs,
            fileSize: 0, // Size not needed for upload, only used for display
          },
        );

        // Send the message with the uploaded URL
        const sentMessage = await ChatService.sendVoiceMessage({
          conversationId,
          audioUrl: uploadResult.audioUrl,
          audioDurationMs: durationMs,
          replyToId,
        });

        seenIds.current.add(sentMessage.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...sentMessage,
                  sender: user,
                  replyTo: null,
                  sharedThread: null,
                  sharedReel: null,
                }
              : m,
          ),
        );
      } catch (error) {
        console.error("Failed to send voice note:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "error" as any } : m,
          ),
        );
      }
    },
    [conversationId, user],
  );

  return {
    messages,
    chatItems,
    details,
    isLoading,
    hasMore,
    typingUsers: activeTypingUsers,
    sendMessage,
    sendVoice,
    retrySend,
    toggleReaction,
    deleteMessage,
    loadMore,
    onTextChange,
    refresh: loadData,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Sort messages by (created_at, id) for monotonic ordering */
function sortMessages(msgs: MessageWithSender[]): MessageWithSender[] {
  return msgs.sort((a, b) => {
    const timeDiff =
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Build chat items with date separators */
function buildChatItems(messages: MessageWithSender[]): ChatItem[] {
  const items: ChatItem[] = [];
  let lastDate = "";
  let lastSenderId = "";

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.created_at).toDateString();
    const nextMsg = messages[i + 1];

    if (msgDate !== lastDate) {
      items.push({
        type: "date",
        date: msg.created_at,
        key: `date-${msgDate}`,
      });
      lastDate = msgDate;
      lastSenderId = "";
    }

    const showAvatar = msg.sender_id !== lastSenderId || msg.type === "system";
    const isLastFromSender = !nextMsg || nextMsg.sender_id !== msg.sender_id;

    items.push({
      type: "message",
      message: msg,
      showAvatar,
      showTimestamp: isLastFromSender,
      key: msg.id,
    });

    lastSenderId = msg.sender_id;
  }

  return items;
}

/** Safely unsubscribe from a Supabase channel */
function supabaseUnsubscribe(channel: any) {
  try {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  } catch {
    // Ignore cleanup errors
  }
}
