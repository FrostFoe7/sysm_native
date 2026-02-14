import { ViewProps, TextProps } from 'react-native';

/**
 * User related types
 */
export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  verified: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
}

/**
 * Media and Thread types
 */
export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  thumbnailUri?: string;
}

export interface Thread {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  media: MediaItem[];
  parent_id: string | null;
  root_id: string | null;
  reply_count: number;
  like_count: number;
  repost_count: number;
  created_at: string;
  updated_at: string;
}

export type ThreadWithAuthor = Thread & { author: User; reposted_by?: User };

export type ThreadWithReplies = ThreadWithAuthor & {
  replies: ThreadWithAuthor[];
};

/**
 * Interaction types
 */
export interface Like {
  id: string;
  user_id: string;
  thread_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Repost {
  id: string;
  user_id: string;
  thread_id: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  thread_id: string;
  created_at: string;
}

/**
 * Activity and UI types
 */
export interface ActivityItem {
  id: string;
  type: 'like' | 'reply' | 'follow';
  actor: User;
  thread?: ThreadWithAuthor;
  created_at: string;
}

export type ModeType = 'light' | 'dark' | 'system';

/**
 * Reel types (Instagram-style short video)
 */
export interface Reel {
  id: string;
  author_id: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  createdAt: string;
  aspectRatio: number; // width / height (e.g. 9/16 = 0.5625)
  duration: number; // seconds
}

export type ReelWithAuthor = Reel & { author: User };

export interface ReelComment {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  likeCount: number;
  createdAt: string;
}

export type ReelCommentWithAuthor = ReelComment & { author: User };

/**
 * Direct Message types
 */
export type ConversationType = 'direct' | 'group';
export type MessageType = 'text' | 'image' | 'video' | 'reel_share' | 'thread_share' | 'voice_note' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';
export type ParticipantRole = 'admin' | 'member';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;           // null for 1:1, group name for groups
  avatar_url: string | null;     // null for 1:1 (use other user's avatar), custom for groups
  created_by: string;
  created_at: string;
  updated_at: string;
  is_muted: boolean;
  is_pinned: boolean;
  last_message_id: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  last_read_message_id: string | null;
  is_typing: boolean;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  content: string;
  media_url: string | null;
  media_thumbnail: string | null;
  reply_to_id: string | null;     // reply to another message
  shared_thread_id: string | null; // for thread_share
  shared_reel_id: string | null;   // for reel_share
  reactions: MessageReaction[];
  status: MessageStatus;
  created_at: string;
  is_deleted: boolean;
}

export interface MessageReaction {
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ConversationWithDetails {
  conversation: Conversation;
  participants: (ConversationParticipant & { user: User })[];
  lastMessage: (DirectMessage & { sender: User }) | null;
  unreadCount: number;
  otherUsers: User[];           // for display convenience
  typingUsers: User[];
}

export interface MessageWithSender extends DirectMessage {
  sender: User;
  replyTo: (DirectMessage & { sender: User }) | null;
  sharedThread: (Thread & { author: User }) | null;
  sharedReel: (Reel & { author: User }) | null;
}

/**
 * Component Props
 */
export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};
