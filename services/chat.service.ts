// services/chat.service.ts
// Messaging data-access layer — upgraded for reliability, race-condition safety,
// realtime correctness, and cursor-based pagination.

import { supabase, getCachedUserId } from "./supabase";
import type {
  User,
  Conversation,
  ConversationWithDetails,
  DirectMessage,
  MessageWithSender,
  MessageType,
} from "@/types/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToUser(row: any): User {
  return {
    id: row.id ?? row.user_id ?? "",
    username: row.username ?? "",
    display_name: row.display_name ?? "",
    avatar_url: row.avatar_url ?? "",
    bio: row.bio ?? "",
    verified: row.verified ?? false,
    is_private: row.is_private ?? false,
    followers_count: row.followers_count ?? 0,
    following_count: row.following_count ?? 0,
    created_at: row.created_at ?? "",
  };
}

/** Map a get_paginated_messages RPC row → MessageWithSender */
function rpcRowToMessage(row: any): MessageWithSender {
  const sender: User = {
    id: row.sender_id,
    username: row.sender_username ?? "",
    display_name: row.sender_display_name ?? "",
    avatar_url: row.sender_avatar_url ?? "",
    bio: "",
    verified: row.sender_verified ?? false,
    is_private: false,
    followers_count: 0,
    following_count: 0,
    created_at: "",
  };

  const replyTo =
    row.reply_to_id && row.reply_content != null
      ? ({
          id: row.reply_to_id,
          conversation_id: row.conversation_id,
          sender_id: "",
          type: "text" as const,
          content: row.reply_content ?? "",
          media_url: null,
          media_thumbnail: null,
          reply_to_id: null,
          shared_thread_id: null,
          shared_reel_id: null,
          reactions: [],
          status: "sent" as const,
          created_at: "",
          is_deleted: false,
          audio_url: null,
          audio_duration_ms: null,
          encrypted_content: null,
          encrypted_key: null,
          key_version: null,
          is_encrypted: false,
          sender: {
            id: "",
            username: "",
            display_name: row.reply_sender_name ?? "",
            avatar_url: "",
            bio: "",
            verified: false,
            is_private: false,
            followers_count: 0,
            following_count: 0,
            created_at: "",
          },
        } as DirectMessage & { sender: User })
      : null;

  const reactions: { user_id: string; emoji: string; created_at: string }[] =
    Array.isArray(row.reactions)
      ? row.reactions
      : JSON.parse(row.reactions ?? "[]");

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    type: row.type as MessageType,
    content: row.content ?? "",
    media_url: row.media_url ?? null,
    media_thumbnail: row.media_thumbnail ?? null,
    reply_to_id: row.reply_to_id ?? null,
    shared_thread_id: row.shared_thread_id ?? null,
    shared_reel_id: row.shared_reel_id ?? null,
    reactions,
    status: row.status as any,
    created_at: row.created_at,
    is_deleted: row.is_deleted ?? false,
    audio_url: row.audio_url ?? null,
    audio_duration_ms: row.audio_duration_ms ?? null,
    encrypted_content: row.encrypted_content ?? null,
    encrypted_key: row.encrypted_key ?? null,
    key_version: row.key_version ?? null,
    is_encrypted: row.is_encrypted ?? false,
    sender,
    replyTo,
    sharedThread: null,
    sharedReel: null,
  };
}

// ─── Conversation queries ────────────────────────────────────────────────────

async function getConversations(): Promise<ConversationWithDetails[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc("get_conversations", {
    p_user_id: userId,
  });
  if (error) throw error;

  const convMap = new Map<string, ConversationWithDetails>();

  for (const row of data ?? []) {
    const conv: Conversation = {
      id: row.id,
      type: row.type as any,
      name: row.name,
      avatar_url: row.avatar_url,
      created_by: "",
      created_at: "",
      updated_at: row.updated_at,
      last_message_id: null,
    };

    const otherUsers: User[] = [];
    if (row.other_user_id) {
      otherUsers.push({
        id: row.other_user_id,
        username: row.other_username ?? "",
        display_name: row.other_display_name ?? "",
        avatar_url: row.other_avatar_url ?? "",
        bio: "",
        verified: row.other_verified ?? false,
        is_private: false,
        followers_count: 0,
        following_count: 0,
        created_at: "",
      });
    }

    const lastMessage = row.last_message_content
      ? {
          id: "",
          conversation_id: row.id,
          sender_id: row.last_message_sender ?? "",
          type: (row.last_message_type ?? "text") as MessageType,
          content: row.last_message_content ?? "",
          media_url: null,
          media_thumbnail: null,
          reply_to_id: null,
          shared_thread_id: null,
          shared_reel_id: null,
          reactions: [],
          status: "sent" as const,
          created_at: row.last_message_at ?? "",
          is_deleted: false,
          audio_url: null,
          audio_duration_ms: null,
          encrypted_content: null,
          encrypted_key: null,
          key_version: null,
          is_encrypted: false,
          sender: otherUsers[0] ?? ({} as User),
        }
      : null;

    convMap.set(row.id, {
      conversation: conv,
      participants: [],
      lastMessage,
      unreadCount: Number(row.unread_count ?? 0),
      otherUsers,
      typingUsers: [],
      is_muted: row.is_muted ?? false,
      is_pinned: row.is_pinned ?? false,
    });
  }

  return Array.from(convMap.values());
}

async function getConversation(
  conversationId: string,
): Promise<ConversationWithDetails | undefined> {
  const userId = await getCachedUserId();

  const { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conv) return undefined;

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("*, users!conversation_participants_user_id_fkey(*)")
    .eq("conversation_id", conversationId);

  const mappedParticipants = (participants ?? []).map((p: any) => ({
    id: p.id,
    conversation_id: p.conversation_id,
    user_id: p.user_id,
    role: p.role as any,
    joined_at: p.joined_at,
    last_read_message_id: p.last_read_message_id,
    last_read_at: p.last_read_at ?? null,
    is_typing: p.is_typing,
    is_muted: p.is_muted ?? false,
    is_pinned: p.is_pinned ?? false,
    user: rowToUser(p.users),
  }));

  const otherUsers = mappedParticipants
    .filter((p: any) => p.user_id !== userId)
    .map((p: any) => p.user);

  const typingUsers = mappedParticipants
    .filter((p: any) => p.user_id !== userId && p.is_typing)
    .map((p: any) => p.user);

  let lastMessage: (DirectMessage & { sender: User }) | null = null;
  if (conv.last_message_id) {
    const { data: msg } = await supabase
      .from("messages")
      .select("*, users!messages_sender_id_fkey(*)")
      .eq("id", conv.last_message_id)
      .single();

    if (msg) {
      lastMessage = {
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        type: msg.type as MessageType,
        content: msg.content,
        media_url: msg.media_url,
        media_thumbnail: msg.media_thumbnail,
        reply_to_id: msg.reply_to_id,
        shared_thread_id: msg.shared_thread_id,
        shared_reel_id: msg.shared_reel_id,
        reactions: [],
        status: msg.status as any,
        created_at: msg.created_at,
        is_deleted: msg.is_deleted,
        audio_url: msg.audio_url ?? null,
        audio_duration_ms: msg.audio_duration_ms ?? null,
        encrypted_content: msg.encrypted_content ?? null,
        encrypted_key: msg.encrypted_key ?? null,
        key_version: msg.key_version ?? null,
        is_encrypted: msg.is_encrypted ?? false,
        sender: rowToUser(msg.users),
      };
    }
  }

  // Unread count via participant data
  const myParticipant = mappedParticipants.find(
    (p: any) => p.user_id === userId,
  );
  let unreadCount = 0;
  if (myParticipant?.last_read_message_id) {
    const { data: lastRead } = await supabase
      .from("messages")
      .select("created_at")
      .eq("id", myParticipant.last_read_message_id)
      .single();

    if (lastRead) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", userId)
        .gt("created_at", lastRead.created_at);
      unreadCount = count ?? 0;
    }
  }

  const isMuted = (myParticipant as any)?.is_muted ?? false;
  const isPinned = (myParticipant as any)?.is_pinned ?? false;

  return {
    conversation: {
      id: conv.id,
      type: conv.type as any,
      name: conv.name,
      avatar_url: conv.avatar_url,
      created_by: conv.created_by,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      last_message_id: conv.last_message_id,
    },
    participants: mappedParticipants,
    lastMessage,
    unreadCount,
    otherUsers,
    typingUsers,
    is_muted: isMuted,
    is_pinned: isPinned,
  };
}

// ─── Messages (paginated via RPC) ──────────────────────────────────────────

async function getMessages(
  conversationId: string,
  limit = 50,
  beforeAt?: string,
  beforeId?: string,
): Promise<MessageWithSender[]> {
  const { data, error } = await supabase.rpc("get_paginated_messages", {
    p_conversation_id: conversationId,
    p_limit: limit,
    ...(beforeAt ? { p_before_at: beforeAt } : {}),
    ...(beforeId ? { p_before_id: beforeId } : {}),
  });

  if (error) {
    console.error("get_paginated_messages error:", error);
    // Fallback to direct query if RPC not available
    return getMessagesFallback(conversationId, limit);
  }

  // RPC returns newest-first; reverse to chronological
  const messages = (data ?? []).map(rpcRowToMessage);
  messages.reverse();
  return messages;
}

/** Fallback if the RPC hasn't been deployed yet */
async function getMessagesFallback(
  conversationId: string,
  limit: number,
): Promise<MessageWithSender[]> {
  const { data } = await supabase
    .from("messages")
    .select("*, users!messages_sender_id_fkey(*)")
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!data) return [];

  const messageIds = data.map((m: any) => m.id);
  const { data: reactions } = await supabase
    .from("message_reactions")
    .select("*")
    .in("message_id", messageIds);

  const reactionsByMessage = new Map<string, any[]>();
  for (const r of reactions ?? []) {
    if (!reactionsByMessage.has(r.message_id))
      reactionsByMessage.set(r.message_id, []);
    reactionsByMessage.get(r.message_id)!.push({
      user_id: r.user_id,
      emoji: r.emoji,
      created_at: r.created_at,
    });
  }

  return data.map((msg: any) => ({
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    type: msg.type as MessageType,
    content: msg.content,
    media_url: msg.media_url,
    media_thumbnail: msg.media_thumbnail,
    reply_to_id: msg.reply_to_id,
    shared_thread_id: msg.shared_thread_id,
    shared_reel_id: msg.shared_reel_id,
    reactions: reactionsByMessage.get(msg.id) ?? [],
    status: msg.status as any,
    created_at: msg.created_at,
    is_deleted: msg.is_deleted,
    audio_url: msg.audio_url ?? null,
    audio_duration_ms: msg.audio_duration_ms ?? null,
    encrypted_content: msg.encrypted_content ?? null,
    encrypted_key: msg.encrypted_key ?? null,
    key_version: msg.key_version ?? null,
    is_encrypted: msg.is_encrypted ?? false,
    sender: rowToUser(msg.users),
    replyTo: null,
    sharedThread: null,
    sharedReel: null,
  }));
}

async function sendMessage(params: {
  conversationId: string;
  content: string;
  type?: MessageType;
  mediaUrl?: string;
  mediaThumbnail?: string;
  replyToId?: string;
  sharedThreadId?: string;
  sharedReelId?: string;
  audioUrl?: string;
  audioDurationMs?: number;
  encryptedContent?: string;
  encryptedKey?: string;
  keyVersion?: number;
  isEncrypted?: boolean;
}): Promise<MessageWithSender> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: userId,
      type: params.type ?? "text",
      content: params.content,
      media_url: params.mediaUrl ?? null,
      media_thumbnail: params.mediaThumbnail ?? null,
      reply_to_id: params.replyToId ?? null,
      shared_thread_id: params.sharedThreadId ?? null,
      shared_reel_id: params.sharedReelId ?? null,
      audio_url: params.audioUrl ?? null,
      audio_duration_ms: params.audioDurationMs ?? null,
      encrypted_content: params.encryptedContent ?? null,
      encrypted_key: params.encryptedKey ?? null,
      key_version: params.keyVersion ?? null,
      is_encrypted: params.isEncrypted ?? false,
      status: "sent",
    })
    .select("*, users!messages_sender_id_fkey(*)")
    .single();

  if (error || !data) throw error ?? new Error("Failed to send message");

  return {
    id: data.id,
    conversation_id: data.conversation_id,
    sender_id: data.sender_id,
    type: data.type as MessageType,
    content: data.content,
    media_url: data.media_url,
    media_thumbnail: data.media_thumbnail,
    reply_to_id: data.reply_to_id,
    shared_thread_id: data.shared_thread_id,
    shared_reel_id: data.shared_reel_id,
    reactions: [],
    status: data.status as any,
    created_at: data.created_at,
    is_deleted: data.is_deleted,
    audio_url: data.audio_url ?? null,
    audio_duration_ms: data.audio_duration_ms ?? null,
    encrypted_content: data.encrypted_content ?? null,
    encrypted_key: data.encrypted_key ?? null,
    key_version: data.key_version ?? null,
    is_encrypted: data.is_encrypted ?? false,
    sender: rowToUser(data.users),
    replyTo: null,
    sharedThread: null,
    sharedReel: null,
  };
}

// ─── Read receipts (atomic) ─────────────────────────────────────────────────

async function markAsRead(conversationId: string): Promise<void> {
  const userId = await getCachedUserId();

  // Try RPC first, fallback to manual
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });

  if (error) {
    // Fallback if RPC not deployed
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastMsg) {
      await supabase
        .from("conversation_participants")
        .update({ last_read_message_id: lastMsg.id })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
    }
  }
}

// ─── Reactions (atomic RPC) ─────────────────────────────────────────────────

async function toggleReaction(
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const userId = await getCachedUserId();

  // Try atomic RPC first
  const { data, error } = await supabase.rpc("toggle_reaction", {
    p_message_id: messageId,
    p_user_id: userId,
    p_emoji: emoji,
  });

  if (!error) return data as boolean;

  // Fallback: check-then-act (original behavior)
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("message_reactions").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    });
    return true;
  }
}

// ─── Conversation management ────────────────────────────────────────────────

async function createDirectConversation(
  otherUserId: string,
): Promise<ConversationWithDetails> {
  if (!otherUserId || otherUserId === "undefined") {
    throw new Error("Invalid user ID");
  }

  const userId = await getCachedUserId();

  // O(1) lookup via RPC instead of N+1 loop
  const { data: existingId, error: rpcError } = await supabase.rpc(
    "find_direct_conversation",
    {
      p_user_id: userId,
      p_other_user_id: otherUserId,
    },
  );

  if (!rpcError && existingId) {
    const existing = await getConversation(existingId);
    if (existing) return existing;
  }

  // Fallback: scan manually if RPC not available
  if (rpcError) {
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    for (const cp of myConvs ?? []) {
      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", cp.conversation_id)
        .eq("user_id", otherUserId)
        .maybeSingle();

      if (otherParticipant) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("type")
          .eq("id", cp.conversation_id)
          .eq("type", "direct")
          .maybeSingle();

        if (conv) {
          const existing = await getConversation(cp.conversation_id);
          if (existing) return existing;
        }
      }
    }
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({ type: "direct", created_by: userId })
    .select()
    .single();

  if (error || !newConv)
    throw error ?? new Error("Failed to create conversation");

  // Dedup participants (handle self-chat)
  const participantRows = [
    { conversation_id: newConv.id, user_id: userId, role: "admin" },
  ];
  if (otherUserId !== userId) {
    participantRows.push({
      conversation_id: newConv.id,
      user_id: otherUserId,
      role: "member",
    });
  }

  await supabase.from("conversation_participants").insert(participantRows);

  const created = await getConversation(newConv.id);
  if (!created) throw new Error("Failed to retrieve created conversation");
  return created;
}

async function createGroupConversation(params: {
  name: string;
  avatarUrl?: string;
  memberIds: string[];
}): Promise<ConversationWithDetails> {
  const userId = await getCachedUserId();

  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({
      type: "group",
      name: params.name,
      avatar_url: params.avatarUrl ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (error || !newConv) throw error ?? new Error("Failed to create group");

  const uniqueMembers = Array.from(new Set([userId, ...params.memberIds]));

  const participantRows = uniqueMembers.map((uid) => ({
    conversation_id: newConv.id,
    user_id: uid,
    role: uid === userId ? "admin" : ("member" as const),
  }));

  await supabase.from("conversation_participants").insert(participantRows);

  const created = await getConversation(newConv.id);
  if (!created) throw new Error("Failed to retrieve created group");
  return created;
}

async function addGroupMember(
  conversationId: string,
  userId: string,
): Promise<void> {
  // Verify caller is admin of this group
  const currentUserId = await getCachedUserId();
  const { data: callerRole } = await supabase
    .from("conversation_participants")
    .select("role")
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (callerRole?.role !== "admin") {
    throw new Error("Only group admins can add members");
  }

  await supabase.from("conversation_participants").insert({
    conversation_id: conversationId,
    user_id: userId,
    role: "member",
  });
}

async function removeGroupMember(
  conversationId: string,
  userId: string,
): Promise<void> {
  // Verify caller is admin of this group
  const currentUserId = await getCachedUserId();
  if (currentUserId !== userId) {
    const { data: callerRole } = await supabase
      .from("conversation_participants")
      .select("role")
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (callerRole?.role !== "admin") {
      throw new Error("Only group admins can remove members");
    }
  }

  await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

async function leaveGroup(conversationId: string): Promise<void> {
  const userId = await getCachedUserId();
  await removeGroupMember(conversationId, userId);
}

async function promoteToAdmin(
  conversationId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from("conversation_participants")
    .update({ role: "admin" })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

async function updateGroupInfo(
  conversationId: string,
  updates: { name?: string; avatarUrl?: string },
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.avatarUrl !== undefined)
    updateData.avatar_url = updates.avatarUrl;

  if (Object.keys(updateData).length > 0) {
    await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId);
  }
}

// Per-user pin/mute (on conversation_participants)
async function toggleConversationPin(conversationId: string): Promise<boolean> {
  const userId = await getCachedUserId();
  const { data: part } = await supabase
    .from("conversation_participants")
    .select("is_pinned")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();

  const newVal = !(part?.is_pinned ?? false);
  await supabase
    .from("conversation_participants")
    .update({ is_pinned: newVal })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  return newVal;
}

async function toggleConversationMute(
  conversationId: string,
): Promise<boolean> {
  const userId = await getCachedUserId();
  const { data: part } = await supabase
    .from("conversation_participants")
    .select("is_muted")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();

  const newVal = !(part?.is_muted ?? false);
  await supabase
    .from("conversation_participants")
    .update({ is_muted: newVal })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  return newVal;
}

async function searchInbox(query: string): Promise<ConversationWithDetails[]> {
  const allConvs = await getConversations();
  const q = query.toLowerCase();
  return allConvs.filter(
    (c) =>
      c.conversation.name?.toLowerCase().includes(q) ||
      c.otherUsers.some(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.display_name.toLowerCase().includes(q),
      ),
  );
}

async function deleteMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from("messages")
    .update({ is_deleted: true })
    .eq("id", messageId);
  return !error;
}

async function editMessage(
  messageId: string,
  content: string,
): Promise<{ id: string; content: string; is_edited: boolean; edited_at: string }> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc("edit_message", {
    p_user_id: userId,
    p_message_id: messageId,
    p_content: content,
  });

  if (error) throw error;
  const row = data?.[0] ?? data;
  return {
    id: row.id,
    content: row.content,
    is_edited: row.is_edited,
    edited_at: row.edited_at,
  };
}

// ─── Realtime subscriptions ─────────────────────────────────────────────────

function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: any) => void,
) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => onMessage(payload.new),
    )
    .subscribe();
}

function subscribeToMessageUpdates(
  conversationId: string,
  onUpdate: (msg: any) => void,
) {
  return supabase
    .channel(`msg-updates:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => onUpdate(payload.new),
    )
    .subscribe();
}

function subscribeToReactions(
  conversationId: string,
  onReaction: (reaction: any, eventType: string) => void,
) {
  return supabase
    .channel(`reactions:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "message_reactions" },
      (payload: any) =>
        onReaction(payload.new ?? payload.old, payload.eventType),
    )
    .subscribe();
}

function subscribeToTyping(
  conversationId: string,
  onTyping: (userId: string, isTyping: boolean) => void,
) {
  return supabase
    .channel(`typing:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversation_participants",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        const p = payload.new;
        onTyping(p.user_id, p.is_typing);
      },
    )
    .subscribe();
}

function subscribeToParticipants(
  conversationId: string,
  onChange: (payload: any) => void,
) {
  return supabase
    .channel(`participants:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversation_participants",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => onChange(payload),
    )
    .subscribe();
}

function subscribeToInbox(userId: string, onUpdate: () => void) {
  return supabase
    .channel(`inbox:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      () => onUpdate(),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations" },
      () => onUpdate(),
    )
    .subscribe();
}

async function setTyping(
  conversationId: string,
  isTyping: boolean,
): Promise<void> {
  const userId = await getCachedUserId();
  await supabase
    .from("conversation_participants")
    .update({
      is_typing: isTyping,
      typing_at: isTyping ? new Date().toISOString() : null,
    })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

// ─── Voice note helper ──────────────────────────────────────────────────────

async function sendVoiceMessage(params: {
  conversationId: string;
  audioUrl: string;
  audioDurationMs: number;
  replyToId?: string;
}): Promise<MessageWithSender> {
  return sendMessage({
    conversationId: params.conversationId,
    content: "",
    type: "voice_note",
    audioUrl: params.audioUrl,
    audioDurationMs: params.audioDurationMs,
    replyToId: params.replyToId,
  });
}

// ─── E2EE encrypted message helper ─────────────────────────────────────────

async function sendEncryptedMessage(params: {
  conversationId: string;
  encryptedContent: string;
  encryptedKey: string;
  keyVersion: number;
  type?: MessageType;
  audioUrl?: string;
  audioDurationMs?: number;
  replyToId?: string;
}): Promise<MessageWithSender> {
  return sendMessage({
    conversationId: params.conversationId,
    content: "[Encrypted message]",
    type: params.type ?? "text",
    encryptedContent: params.encryptedContent,
    encryptedKey: params.encryptedKey,
    keyVersion: params.keyVersion,
    isEncrypted: true,
    audioUrl: params.audioUrl,
    audioDurationMs: params.audioDurationMs,
    replyToId: params.replyToId,
  });
}

export const ChatService = {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  sendVoiceMessage,
  sendEncryptedMessage,
  markAsRead,
  toggleReaction,
  createDirectConversation,
  createGroupConversation,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  promoteToAdmin,
  updateGroupInfo,
  toggleConversationPin,
  toggleConversationMute,
  searchInbox,
  deleteMessage,
  editMessage,
  subscribeToMessages,
  subscribeToMessageUpdates,
  subscribeToReactions,
  subscribeToTyping,
  subscribeToParticipants,
  subscribeToInbox,
  setTyping,
};
