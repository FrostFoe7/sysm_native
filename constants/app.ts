/**
 * App-wide configuration and data constants
 */

export const CURRENT_USER_ID = 'u-000';

export const MAX_BIO_LENGTH = 150;
export const MAX_NAME_LENGTH = 50;
export const MAX_USERNAME_LENGTH = 30;

export const AVATAR_OPTIONS = [
  'https://i.pravatar.cc/300?img=60',
  'https://i.pravatar.cc/300?img=61',
  'https://i.pravatar.cc/300?img=62',
  'https://i.pravatar.cc/300?img=63',
  'https://i.pravatar.cc/300?img=64',
  'https://i.pravatar.cc/300?img=65',
  'https://i.pravatar.cc/300?img=66',
  'https://i.pravatar.cc/300?img=67',
  'https://i.pravatar.cc/300?img=68',
  'https://i.pravatar.cc/300?img=69',
];

export const PROFILE_TABS = [
  { key: 'threads', label: 'Threads' },
  { key: 'replies', label: 'Replies' },
];

export const FEED_TABS = [
  { key: 'foryou', label: 'For you' },
  { key: 'following', label: 'Following' },
];

// ─── DM Constants ─────────────────────────────────────────────────────────────

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_GROUP_NAME_LENGTH = 50;
export const MAX_GROUP_MEMBERS = 32;

export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

export const MESSAGE_ACTIONS = [
  { key: 'reply', label: 'Reply' },
  { key: 'react', label: 'React' },
  { key: 'copy', label: 'Copy' },
  { key: 'delete', label: 'Delete' },
] as const;
