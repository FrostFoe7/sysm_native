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
  // Voice note fields
  audio_url: string | null;
  audio_duration_ms: number | null;
  // E2EE fields
  encrypted_content: string | null;
  encrypted_key: string | null;
  key_version: number | null;
  is_encrypted: boolean;
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
 * Chat UI types
 */
export type ChatItem =
  | { type: 'date'; date: string; key: string }
  | { type: 'message'; message: MessageWithSender; showAvatar: boolean; showTimestamp: boolean; key: string };

/**
 * Ranking & Personalization types
 */

/** Engagement signals recorded per user-content interaction */
export interface EngagementSignal {
  id: string;
  user_id: string;
  content_type: 'thread' | 'reel';
  content_id: string;
  signal_type: SignalType;
  value: number; // e.g. dwell time in ms, completion %, 1 for binary signals
  created_at: string;
}

export type SignalType =
  | 'like'
  | 'comment'
  | 'repost'
  | 'save'
  | 'share'
  | 'dwell'           // time spent viewing thread (ms)
  | 'profile_visit'   // visited author's profile after seeing content
  | 'follow_after'    // followed author after seeing content
  | 'click_expand'    // expanded "see more" on content
  | 'reel_watch'      // watch time in ms
  | 'reel_complete'   // 1 if watched >90%
  | 'reel_replay'     // number of replays
  | 'reel_skip'       // 1 if skipped within 2s
  | 'report'
  | 'hide'
  | 'mute';

/** Per-user interest vector: topic → affinity score (0–1) */
export interface InterestVector {
  user_id: string;
  topics: Record<string, number>; // e.g. { "tech": 0.9, "design": 0.7 }
  updated_at: string;
}

/** Per-user creator affinity: how much a user engages with a specific creator */
export interface CreatorAffinity {
  user_id: string;
  creator_id: string;
  score: number;        // 0–1 normalized
  interactions: number;  // total interaction count
  last_interaction: string;
}

/** Topic embedding for content items */
export interface TopicEmbedding {
  content_type: 'thread' | 'reel';
  content_id: string;
  topics: Record<string, number>; // e.g. { "react": 0.95, "mobile": 0.6 }
}

/** Ranking weights configuration */
export interface RankingWeights {
  likeWeight: number;
  commentWeight: number;
  repostWeight: number;
  saveWeight: number;
  dwellWeight: number;
  shareWeight: number;
  relationshipBoost: number;   // multiplier for followed users
  freshnessDecay: number;      // hours until score halves
  verifiedBoost: number;       // multiplier for verified creators
  diversityPenalty: number;    // penalty for same-author consecutive items
}

/** Reel-specific ranking weights */
export interface ReelRankingWeights {
  watchTimeWeight: number;
  completionWeight: number;
  replayWeight: number;
  shareWeight: number;
  followAfterWeight: number;
  skipPenalty: number;
  freshnessDecay: number;
  discoveryBoost: number;      // boost for new creators user hasn't seen
  coldStartBoost: number;      // boost for new content with few signals
}

/** Scored item ready for feed ordering */
export interface ScoredThread {
  thread: ThreadWithAuthor;
  score: number;
  signals: {
    engagement: number;
    relationship: number;
    freshness: number;
    personalization: number;
    quality: number;
  };
}

export interface ScoredReel {
  reel: ReelWithAuthor;
  score: number;
  signals: {
    engagement: number;
    completion: number;
    discovery: number;
    freshness: number;
    personalization: number;
  };
}

/** Trending item with velocity tracking */
export interface TrendingItem {
  content_type: 'thread' | 'reel';
  content_id: string;
  velocity: number;       // engagement growth rate
  total_engagement: number;
  time_window: 'hourly' | 'daily' | 'weekly';
  category: string;
  rank: number;
}

/** Analytics event for tracking */
export interface AnalyticsEvent {
  id: string;
  event_type: AnalyticsEventType;
  user_id: string;
  properties: Record<string, string | number | boolean>;
  timestamp: string;
  session_id: string;
}

export type AnalyticsEventType =
  | 'thread_view'
  | 'thread_dwell'
  | 'thread_like'
  | 'thread_comment'
  | 'thread_repost'
  | 'thread_share'
  | 'thread_save'
  | 'reel_view'
  | 'reel_watch'
  | 'reel_complete'
  | 'reel_skip'
  | 'reel_like'
  | 'reel_comment'
  | 'reel_share'
  | 'message_open'
  | 'message_send'
  | 'profile_visit'
  | 'follow'
  | 'unfollow'
  | 'search'
  | 'app_open'
  | 'app_background'
  | 'feed_refresh'
  | 'tab_switch';

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
