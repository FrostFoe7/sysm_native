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
