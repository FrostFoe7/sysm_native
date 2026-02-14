import { supabase, getCachedUserId } from './supabase';
import type {
  User,
  Conversation,
  ConversationWithDetails,
  ConversationParticipant,
  DirectMessage,
  MessageWithSender,
  MessageType,
  Thread,
  Reel,
} from '@/types/types';

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio ?? '',
    verified: row.verified,
    followers_count: row.followers_count,
    following_count: row.following_count,
    created_at: row.created_at,
  };
}

// ─── Conversation queries ────────────────────────────────────────────────────────

async function getConversations(): Promise<ConversationWithDetails[]> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase.rpc('get_conversations', { p_user_id: userId });
  if (error) throw error;

  // Group by conversation id
  const convMap = new Map<string, ConversationWithDetails>();

  for (const row of data ?? []) {
    const conv: Conversation = {
      id: row.id,
      type: row.type as any,
      name: row.name,
      avatar_url: row.avatar_url,
      created_by: '',
      created_at: '',
      updated_at: row.updated_at,
      is_muted: row.is_muted,
      is_pinned: row.is_pinned,
      last_message_id: null,
    };

    const otherUsers: User[] = [];
    if (row.other_user_id) {
      otherUsers.push({
        id: row.other_user_id,
        username: row.other_username ?? '',
        display_name: row.other_display_name ?? '',
        avatar_url: row.other_avatar_url ?? '',
        bio: '',
        verified: row.other_verified ?? false,
        followers_count: 0,
        following_count: 0,
        created_at: '',
      });
    }

    const lastMessage = row.last_message_content
      ? {
          id: '',
          conversation_id: row.id,
          sender_id: row.last_message_sender ?? '',
          type: (row.last_message_type ?? 'text') as MessageType,
          content: row.last_message_content ?? '',
          media_url: null,
          media_thumbnail: null,
          reply_to_id: null,
          shared_thread_id: null,
          shared_reel_id: null,
          reactions: [],
          status: 'sent' as const,
          created_at: row.last_message_at ?? '',
          is_deleted: false,
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
    });
  }

  return Array.from(convMap.values());
}

async function getConversation(conversationId: string): Promise<ConversationWithDetails | undefined> {
  const userId = await getCachedUserId();

  const { data: conv } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conv) return undefined;

  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('*, users!conversation_participants_user_id_fkey(*)')
    .eq('conversation_id', conversationId);

  const mappedParticipants = (participants ?? []).map((p: any) => ({
    id: p.id,
    conversation_id: p.conversation_id,
    user_id: p.user_id,
    role: p.role as any,
    joined_at: p.joined_at,
    last_read_message_id: p.last_read_message_id,
    is_typing: p.is_typing,
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
      .from('messages')
      .select('*, users!messages_sender_id_fkey(*)')
      .eq('id', conv.last_message_id)
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
        sender: rowToUser(msg.users),
      };
    }
  }

  // Get unread count
  const myParticipant = mappedParticipants.find((p: any) => p.user_id === userId);
  let unreadCount = 0;
  if (myParticipant?.last_read_message_id) {
    const { data: lastRead } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', myParticipant.last_read_message_id)
      .single();

    if (lastRead) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .gt('created_at', lastRead.created_at);

      unreadCount = count ?? 0;
    }
  }

  return {
    conversation: {
      id: conv.id,
      type: conv.type as any,
      name: conv.name,
      avatar_url: conv.avatar_url,
      created_by: conv.created_by,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      is_muted: conv.is_muted,
      is_pinned: conv.is_pinned,
      last_message_id: conv.last_message_id,
    },
    participants: mappedParticipants,
    lastMessage,
    unreadCount,
    otherUsers,
    typingUsers,
  };
}

// ─── Messages ─────────────────────────────────────────────────────────────────

async function getMessages(conversationId: string): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, users!messages_sender_id_fkey(*)')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  // Fetch reactions for all messages
  const messageIds = data.map((m: any) => m.id);
  const { data: reactions } = await supabase
    .from('message_reactions')
    .select('*')
    .in('message_id', messageIds);

  const reactionsByMessage = new Map<string, any[]>();
  for (const r of reactions ?? []) {
    if (!reactionsByMessage.has(r.message_id)) {
      reactionsByMessage.set(r.message_id, []);
    }
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
    sender: rowToUser(msg.users),
    replyTo: null, // Loaded separately if needed
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
}): Promise<MessageWithSender> {
  const userId = await getCachedUserId();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: userId,
      type: params.type ?? 'text',
      content: params.content,
      media_url: params.mediaUrl ?? null,
      media_thumbnail: params.mediaThumbnail ?? null,
      reply_to_id: params.replyToId ?? null,
      shared_thread_id: params.sharedThreadId ?? null,
      shared_reel_id: params.sharedReelId ?? null,
      status: 'sent',
    })
    .select('*, users!messages_sender_id_fkey(*)')
    .single();

  if (error || !data) throw error ?? new Error('Failed to send message');

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
    sender: rowToUser(data.users),
    replyTo: null,
    sharedThread: null,
    sharedReel: null,
  };
}

async function markAsRead(conversationId: string): Promise<void> {
  const userId = await getCachedUserId();

  // Get the latest message
  const { data: lastMsg } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastMsg) {
    await supabase
      .from('conversation_participants')
      .update({ last_read_message_id: lastMsg.id })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }
}

async function toggleReaction(messageId: string, emoji: string): Promise<boolean> {
  const userId = await getCachedUserId();

  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    });
    return true;
  }
}

// ─── Conversation management ────────────────────────────────────────────────────

async function createDirectConversation(otherUserId: string): Promise<ConversationWithDetails> {
  const userId = await getCachedUserId();

  // Check if direct conversation already exists
  const { data: myConvs } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  for (const cp of myConvs ?? []) {
    const { data: otherParticipant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', cp.conversation_id)
      .eq('user_id', otherUserId)
      .maybeSingle();

    if (otherParticipant) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('type')
        .eq('id', cp.conversation_id)
        .eq('type', 'direct')
        .maybeSingle();

      if (conv) {
        const existing = await getConversation(cp.conversation_id);
        if (existing) return existing;
      }
    }
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({ type: 'direct', created_by: userId })
    .select()
    .single();

  if (error || !newConv) throw error ?? new Error('Failed to create conversation');

  // Add participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: newConv.id, user_id: userId, role: 'admin' },
    { conversation_id: newConv.id, user_id: otherUserId, role: 'member' },
  ]);

  const created = await getConversation(newConv.id);
  if (!created) throw new Error('Failed to retrieve created conversation');
  return created;
}

async function createGroupConversation(params: {
  name: string;
  avatarUrl?: string;
  memberIds: string[];
}): Promise<ConversationWithDetails> {
  const userId = await getCachedUserId();

  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      type: 'group',
      name: params.name,
      avatar_url: params.avatarUrl ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (error || !newConv) throw error ?? new Error('Failed to create group');

  const participantRows = [userId, ...params.memberIds].map((uid, i) => ({
    conversation_id: newConv.id,
    user_id: uid,
    role: uid === userId ? 'admin' : 'member',
  }));

  await supabase.from('conversation_participants').insert(participantRows);

  const created = await getConversation(newConv.id);
  if (!created) throw new Error('Failed to retrieve created group');
  return created;
}

async function addGroupMember(conversationId: string, userId: string): Promise<void> {
  await supabase.from('conversation_participants').insert({
    conversation_id: conversationId,
    user_id: userId,
    role: 'member',
  });
}

async function removeGroupMember(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

async function leaveGroup(conversationId: string): Promise<void> {
  const userId = await getCachedUserId();
  await removeGroupMember(conversationId, userId);
}

async function promoteToAdmin(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('conversation_participants')
    .update({ role: 'admin' })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

async function updateGroupInfo(conversationId: string, updates: { name?: string; avatarUrl?: string }): Promise<void> {
  const updateData: Record<string, any> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;

  if (Object.keys(updateData).length > 0) {
    await supabase.from('conversations').update(updateData).eq('id', conversationId);
  }
}

async function toggleConversationPin(conversationId: string): Promise<boolean> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('is_pinned')
    .eq('id', conversationId)
    .single();

  const newVal = !conv?.is_pinned;
  await supabase.from('conversations').update({ is_pinned: newVal }).eq('id', conversationId);
  return newVal;
}

async function toggleConversationMute(conversationId: string): Promise<boolean> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('is_muted')
    .eq('id', conversationId)
    .single();

  const newVal = !conv?.is_muted;
  await supabase.from('conversations').update({ is_muted: newVal }).eq('id', conversationId);
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
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId);
  return !error;
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

function subscribeToMessages(conversationId: string, onMessage: (msg: any) => void) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => onMessage(payload.new),
    )
    .subscribe();
}

function subscribeToReactions(conversationId: string, onReaction: (reaction: any) => void) {
  return supabase
    .channel(`reactions:${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload: any) => onReaction(payload.new),
    )
    .subscribe();
}

function subscribeToTyping(conversationId: string, onTyping: (userId: string, isTyping: boolean) => void) {
  return supabase
    .channel(`typing:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        const p = payload.new;
        onTyping(p.user_id, p.is_typing);
      },
    )
    .subscribe();
}

async function setTyping(conversationId: string, isTyping: boolean): Promise<void> {
  const userId = await getCachedUserId();
  await supabase
    .from('conversation_participants')
    .update({ is_typing: isTyping })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

export const ChatService = {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
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
  subscribeToMessages,
  subscribeToReactions,
  subscribeToTyping,
  setTyping,
};
