// db/db.ts

// ─── UUID helper ────────────────────────────────────────────────────────────────

let _counter = 0;
const _hex = '0123456789abcdef';

function uuid(): string {
  _counter += 1;
  const seed = Date.now() + _counter;
  let id = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) id += '-';
    id += _hex[(seed * (i + 1) * 7 + i * 13) % 16];
  }
  return id;
}

import type { 
  User, 
  MediaItem, 
  Thread, 
  Like, 
  Follow, 
  Repost, 
  Bookmark, 
  ThreadWithAuthor, 
  ThreadWithReplies,
  Reel,
  ReelComment,
  ReelWithAuthor,
  ReelCommentWithAuthor,
  Conversation,
  ConversationParticipant,
  DirectMessage,
  MessageReaction,
  ConversationType,
  MessageType,
  MessageStatus,
  ParticipantRole,
} from '@/types/types';

export { User, MediaItem, Thread, Like, Follow, Repost, Bookmark, ThreadWithAuthor, ThreadWithReplies, Reel, ReelComment, ReelWithAuthor, ReelCommentWithAuthor };
export type { Conversation, ConversationParticipant, DirectMessage, MessageReaction };

// ─── Seeded Users ───────────────────────────────────────────────────────────────

const USER_ALICE: User = {
  id: 'u-001',
  username: 'alice.dev',
  display_name: 'Alice Chen',
  avatar_url: 'https://i.pravatar.cc/150?u=alice',
  bio: 'Staff engineer @ Meta. Building the future of social. React Native enthusiast.',
  verified: true,
  followers_count: 48200,
  following_count: 312,
  created_at: '2023-07-05T08:00:00Z',
};

const USER_MARCUS: User = {
  id: 'u-002',
  username: 'marcus.ui',
  display_name: 'Marcus Rivera',
  avatar_url: 'https://i.pravatar.cc/150?u=marcus',
  bio: 'Design systems lead. Figma → Code. Opinions are my own.',
  verified: true,
  followers_count: 31400,
  following_count: 587,
  created_at: '2023-07-12T10:30:00Z',
};

const USER_PRIYA: User = {
  id: 'u-003',
  username: 'priya.codes',
  display_name: 'Priya Sharma',
  avatar_url: 'https://i.pravatar.cc/150?u=priya',
  bio: 'Full-stack dev. TypeScript maximalist. Coffee addict ☕',
  verified: false,
  followers_count: 12800,
  following_count: 945,
  created_at: '2023-08-01T14:00:00Z',
};

const USER_JORDAN: User = {
  id: 'u-004',
  username: 'jordan.writes',
  display_name: 'Jordan Park',
  avatar_url: 'https://i.pravatar.cc/150?u=jordan',
  bio: 'Tech journalist. Formerly at The Verge. Newsletter: jordan.substack.com',
  verified: true,
  followers_count: 89500,
  following_count: 1203,
  created_at: '2023-07-06T09:15:00Z',
};

const USER_ELENA: User = {
  id: 'u-005',
  username: 'elena.creates',
  display_name: 'Elena Vasquez',
  avatar_url: 'https://i.pravatar.cc/150?u=elena',
  bio: 'Product designer. Advocate for accessible interfaces. Mom of two. 🎨',
  verified: false,
  followers_count: 7540,
  following_count: 422,
  created_at: '2023-09-14T11:45:00Z',
};

const USER_DAVID: User = {
  id: 'u-006',
  username: 'david.oss',
  display_name: 'David Kim',
  avatar_url: 'https://i.pravatar.cc/150?u=david',
  bio: 'Open source maintainer. Rust + TypeScript. Building tools for developers.',
  verified: true,
  followers_count: 56100,
  following_count: 198,
  created_at: '2023-07-20T16:00:00Z',
};

const USER_SARAH: User = {
  id: 'u-007',
  username: 'sarah.ml',
  display_name: 'Sarah Thompson',
  avatar_url: 'https://i.pravatar.cc/150?u=sarah',
  bio: 'ML engineer @ DeepMind. Exploring the intersection of AI and creativity.',
  verified: true,
  followers_count: 42300,
  following_count: 376,
  created_at: '2023-08-10T07:30:00Z',
};

const USER_CURRENT: User = {
  id: 'u-000',
  username: 'you',
  display_name: 'You',
  avatar_url: 'https://i.pravatar.cc/150?u=currentuser',
  bio: 'Building cool things. Shipping fast.',
  verified: false,
  followers_count: 234,
  following_count: 189,
  created_at: '2024-01-01T00:00:00Z',
};

// ─── Seeded Threads ─────────────────────────────────────────────────────────────

const THREADS: Thread[] = [
  {
    id: 't-001',
    user_id: 'u-001',
    content:
      'Just shipped a massive refactor of our design system. Moved from styled-components to NativeWind + Tailwind variants. The DX improvement is unreal — build times dropped 40% and our component API is way cleaner now.',
    images: [],
    media: [
      { uri: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
      { uri: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 14,
    like_count: 482,
    repost_count: 87,
    created_at: '2026-02-13T08:12:00Z',
    updated_at: '2026-02-13T08:12:00Z',
  },
  {
    id: 't-002',
    user_id: 'u-002',
    content:
      'Hot take: Most "design systems" are just component libraries with a Notion page. A real design system includes tokens, semantic naming, accessibility patterns, and usage guidelines. The components are maybe 30% of the work.',
    images: [],
    media: [],
    parent_id: null,
    root_id: null,
    reply_count: 32,
    like_count: 1247,
    repost_count: 203,
    created_at: '2026-02-13T07:45:00Z',
    updated_at: '2026-02-13T07:45:00Z',
  },
  {
    id: 't-003',
    user_id: 'u-004',
    content:
      'BREAKING: Apple is reportedly working on a new framework that will let developers build native apps using a declarative syntax that compiles to both iOS and macOS. Sources say it\'s being tested internally and could ship with iOS 20.',
    images: [],
    media: [
      { uri: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=500&fit=crop', type: 'image', width: 800, height: 500 },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 89,
    like_count: 3420,
    repost_count: 1105,
    created_at: '2026-02-13T06:30:00Z',
    updated_at: '2026-02-13T06:30:00Z',
  },
  {
    id: 't-004',
    user_id: 'u-003',
    content:
      'TypeScript tip that saved me hours today:\n\nInstead of writing separate types for create/update/response, use a single base type with mapped utilities:\n\ntype CreateUser = Omit<User, "id" | "created_at">\ntype UpdateUser = Partial<CreateUser>\ntype UserResponse = User & { posts_count: number }\n\nKeep your types DRY.',
    images: [],
    media: [],
    parent_id: null,
    root_id: null,
    reply_count: 7,
    like_count: 891,
    repost_count: 156,
    created_at: '2026-02-13T05:20:00Z',
    updated_at: '2026-02-13T05:20:00Z',
  },
  {
    id: 't-005',
    user_id: 'u-005',
    content:
      'Accessibility isn\'t a feature — it\'s a requirement. Just audited an app with 2M+ users and found 47 critical a11y violations. No alt text, no focus management, color contrast failures everywhere. We can do better.',
    images: [],
    media: [
      { uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
      { uri: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
      { uri: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 23,
    like_count: 2156,
    repost_count: 445,
    created_at: '2026-02-12T22:10:00Z',
    updated_at: '2026-02-12T22:10:00Z',
  },
  {
    id: 't-006',
    user_id: 'u-006',
    content:
      'Released v3.0 of our CLI tool today. Complete rewrite in Rust. What used to take 12 seconds now completes in 180ms. Sometimes the right optimization is choosing the right language for the job.',
    images: [],
    media: [
      { uri: 'https://avtshare01.rz.tu-ilmenau.de/avt-vqdb-uhd-1/test_1/segments/bigbuck_bunny_8bit_2000kbps_1080p_60.0fps_h264.mp4', type: 'video', width: 1280, height: 720, thumbnailUri: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&h=450&fit=crop' },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 41,
    like_count: 3890,
    repost_count: 672,
    created_at: '2026-02-12T20:00:00Z',
    updated_at: '2026-02-12T20:00:00Z',
  },
  {
    id: 't-007',
    user_id: 'u-007',
    content:
      'Our latest paper just dropped: we trained a 7B parameter model that outperforms GPT-4 on code generation benchmarks using 1/10th the compute. The trick? Better data curation beats bigger models every time. Link in bio.',
    images: [],
    media: [
      { uri: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop', type: 'image', width: 800, height: 500 },
      { uri: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=500&fit=crop', type: 'image', width: 800, height: 500 },
      { uri: 'https://images.unsplash.com/photo-1655720828018-edd71de28476?w=800&h=500&fit=crop', type: 'image', width: 800, height: 500 },
      { uri: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=500&fit=crop', type: 'image', width: 800, height: 500 },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 67,
    like_count: 5612,
    repost_count: 1834,
    created_at: '2026-02-12T18:30:00Z',
    updated_at: '2026-02-12T18:30:00Z',
  },
  {
    id: 't-008',
    user_id: 'u-001',
    content:
      'The secret to 60fps animations in React Native:\n\n1. Use Reanimated worklets\n2. Avoid JS thread for gesture handling\n3. Batch state updates\n4. Use useAnimatedStyle, never inline\n5. Profile with Flipper\n\nStopped dropping frames the day I followed all five.',
    images: [],
    media: [
      { uri: 'https://avtshare01.rz.tu-ilmenau.de/avt-vqdb-uhd-1/test_1/segments/bigbuck_bunny_8bit_2000kbps_1080p_60.0fps_vp9.mkv', type: 'video', width: 1280, height: 720, thumbnailUri: 'https://images.unsplash.com/photo-1550439062-609e1531270e?w=800&h=450&fit=crop' },
      { uri: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 19,
    like_count: 1567,
    repost_count: 298,
    created_at: '2026-02-12T15:45:00Z',
    updated_at: '2026-02-12T15:45:00Z',
  },
  {
    id: 't-009',
    user_id: 'u-002',
    content:
      'I spent 6 months building a component library that nobody uses because I never talked to the developers who would consume it. Lesson learned: build WITH your users, not FOR them.',
    images: [],
    media: [],
    parent_id: null,
    root_id: null,
    reply_count: 11,
    like_count: 934,
    repost_count: 112,
    created_at: '2026-02-12T12:20:00Z',
    updated_at: '2026-02-12T12:20:00Z',
  },
  {
    id: 't-010',
    user_id: 'u-004',
    content:
      'Interviewed 15 CTOs this week about their 2026 tech stack decisions. The consensus:\n\n• TypeScript is non-negotiable\n• React Native for mobile\n• Postgres + Supabase rising fast\n• AI-assisted coding is table stakes\n• Monorepos winning over polyrepos\n\nFull article dropping Monday.',
    images: [],
    media: [
      { uri: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 53,
    like_count: 4210,
    repost_count: 890,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
  },
  {
    id: 't-011',
    user_id: 'u-003',
    content:
      'Unpopular opinion: You don\'t need a state management library for most apps. React context + useReducer handles 90% of cases. The other 10% is where Zustand or Jotai shine. Stop reaching for Redux on day one.',
    images: [],
    media: [],
    parent_id: null,
    root_id: null,
    reply_count: 45,
    like_count: 2340,
    repost_count: 389,
    created_at: '2026-02-11T23:15:00Z',
    updated_at: '2026-02-11T23:15:00Z',
  },
  {
    id: 't-012',
    user_id: 'u-006',
    content:
      'Open source maintainer burnout is real. I\'ve been maintaining a 40k star project for 3 years. Here\'s what helped me:\n\n• Set boundaries\n• Use "good first issue" labels aggressively\n• Automate everything you can\n• It\'s OK to say no\n• Take breaks without guilt\n\nYour health > your GitHub streak.',
    images: [],
    media: [
      { uri: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
      { uri: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&h=600&fit=crop', type: 'image', width: 800, height: 600 },
    ],
    parent_id: null,
    root_id: null,
    reply_count: 28,
    like_count: 6780,
    repost_count: 1204,
    created_at: '2026-02-11T19:30:00Z',
    updated_at: '2026-02-11T19:30:00Z',
  },
];

// ─── Seeded Replies ─────────────────────────────────────────────────────────────

const REPLIES: Thread[] = [
  {
    id: 'r-001',
    user_id: 'u-003',
    content:
      'This is huge. We\'re evaluating the same migration. Any gotchas with NativeWind on Android? We\'ve had some inconsistencies with shadow utilities.',
    images: [],
    media: [],
    parent_id: 't-001',
    root_id: 't-001',
    reply_count: 2,
    like_count: 34,
    repost_count: 1,
    created_at: '2026-02-13T08:25:00Z',
    updated_at: '2026-02-13T08:25:00Z',
  },
  {
    id: 'r-002',
    user_id: 'u-001',
    content:
      'Good callout — shadows are tricky on Android. We ended up using elevation utilities for Android and shadow for iOS. NativeWind\'s platform prefixes help: `ios:shadow-md android:elevation-4`.',
    images: [],
    media: [],
    parent_id: 'r-001',
    root_id: 't-001',
    reply_count: 0,
    like_count: 67,
    repost_count: 5,
    created_at: '2026-02-13T08:32:00Z',
    updated_at: '2026-02-13T08:32:00Z',
  },
  {
    id: 'r-003',
    user_id: 'u-005',
    content:
      'Absolutely agree. And I\'d add: documentation is the other 70%. A component without usage docs is a component nobody will use correctly.',
    images: [],
    media: [],
    parent_id: 't-002',
    root_id: 't-002',
    reply_count: 1,
    like_count: 189,
    repost_count: 22,
    created_at: '2026-02-13T07:58:00Z',
    updated_at: '2026-02-13T07:58:00Z',
  },
  {
    id: 'r-004',
    user_id: 'u-006',
    content:
      'Isn\'t this just SwiftUI with extra steps? I feel like Apple has been iterating on declarative UI since 2019. Curious what the differentiator is.',
    images: [],
    media: [],
    parent_id: 't-003',
    root_id: 't-003',
    reply_count: 3,
    like_count: 245,
    repost_count: 12,
    created_at: '2026-02-13T06:45:00Z',
    updated_at: '2026-02-13T06:45:00Z',
  },
  {
    id: 'r-005',
    user_id: 'u-004',
    content:
      'From what I\'m hearing, the key difference is compile-to-native performance. SwiftUI interprets at runtime. This new framework allegedly AOT compiles the declarative syntax to optimized machine code.',
    images: [],
    media: [],
    parent_id: 'r-004',
    root_id: 't-003',
    reply_count: 0,
    like_count: 412,
    repost_count: 45,
    created_at: '2026-02-13T06:52:00Z',
    updated_at: '2026-02-13T06:52:00Z',
  },
  {
    id: 'r-006',
    user_id: 'u-007',
    content:
      'Love this pattern. I\'d also recommend Zod for runtime validation of these types. Combine mapped types with Zod schemas and you get compile-time + runtime safety.',
    images: [],
    media: [],
    parent_id: 't-004',
    root_id: 't-004',
    reply_count: 0,
    like_count: 123,
    repost_count: 18,
    created_at: '2026-02-13T05:35:00Z',
    updated_at: '2026-02-13T05:35:00Z',
  },
  {
    id: 'r-007',
    user_id: 'u-002',
    content:
      'This needs to be shouted from the rooftops. I\'ve seen entire redesigns fail because color contrast wasn\'t considered until the final review. Accessibility should be in your Figma tokens from day one.',
    images: [],
    media: [],
    parent_id: 't-005',
    root_id: 't-005',
    reply_count: 0,
    like_count: 376,
    repost_count: 67,
    created_at: '2026-02-12T22:30:00Z',
    updated_at: '2026-02-12T22:30:00Z',
  },
  {
    id: 'r-008',
    user_id: 'u-003',
    content:
      'What were the biggest Rust learning curve moments for the team? We\'re considering moving some of our Node tooling to Rust but worried about the ramp-up time.',
    images: [],
    media: [],
    parent_id: 't-006',
    root_id: 't-006',
    reply_count: 1,
    like_count: 89,
    repost_count: 3,
    created_at: '2026-02-12T20:15:00Z',
    updated_at: '2026-02-12T20:15:00Z',
  },
  {
    id: 'r-009',
    user_id: 'u-006',
    content:
      'Honestly? The borrow checker was the main hurdle. Took about 3 weeks for the team to get comfortable. After that, it was smooth sailing. The compiler errors are actually incredibly helpful once you learn to read them.',
    images: [],
    media: [],
    parent_id: 'r-008',
    root_id: 't-006',
    reply_count: 0,
    like_count: 156,
    repost_count: 14,
    created_at: '2026-02-12T20:28:00Z',
    updated_at: '2026-02-12T20:28:00Z',
  },
  {
    id: 'r-010',
    user_id: 'u-001',
    content:
      'Can you share more about the data curation process? Was it manual labeling, synthetic data generation, or a combination? This could be a game changer for smaller teams.',
    images: [],
    media: [],
    parent_id: 't-007',
    root_id: 't-007',
    reply_count: 1,
    like_count: 234,
    repost_count: 8,
    created_at: '2026-02-12T18:45:00Z',
    updated_at: '2026-02-12T18:45:00Z',
  },
  {
    id: 'r-011',
    user_id: 'u-007',
    content:
      'It\'s a hybrid approach! We used LLM-generated synthetic data with human validation. Key insight: filtering low-quality examples matters more than generating more data. Quality over quantity.',
    images: [],
    media: [],
    parent_id: 'r-010',
    root_id: 't-007',
    reply_count: 0,
    like_count: 345,
    repost_count: 56,
    created_at: '2026-02-12T18:58:00Z',
    updated_at: '2026-02-12T18:58:00Z',
  },
  {
    id: 'r-012',
    user_id: 'u-005',
    content:
      'Point 4 is underrated. I see so many Reanimated examples with inline style objects that recreate on every render. useAnimatedStyle + useDerivedValue is the winning combo.',
    images: [],
    media: [],
    parent_id: 't-008',
    root_id: 't-008',
    reply_count: 0,
    like_count: 78,
    repost_count: 9,
    created_at: '2026-02-12T16:00:00Z',
    updated_at: '2026-02-12T16:00:00Z',
  },
  {
    id: 'r-013',
    user_id: 'u-004',
    content:
      'This resonates so much. I see the same pattern with content — writing for an audience you\'ve never spoken to. User research isn\'t optional, it\'s foundational.',
    images: [],
    media: [],
    parent_id: 't-009',
    root_id: 't-009',
    reply_count: 0,
    like_count: 112,
    repost_count: 15,
    created_at: '2026-02-12T12:35:00Z',
    updated_at: '2026-02-12T12:35:00Z',
  },
  {
    id: 'r-014',
    user_id: 'u-002',
    content:
      'Zustand is genuinely excellent for complex state. But for most apps? useState + context is all you need. The React team built these hooks for exactly this reason.',
    images: [],
    media: [],
    parent_id: 't-011',
    root_id: 't-011',
    reply_count: 0,
    like_count: 267,
    repost_count: 34,
    created_at: '2026-02-11T23:30:00Z',
    updated_at: '2026-02-11T23:30:00Z',
  },
  {
    id: 'r-015',
    user_id: 'u-007',
    content:
      'Thank you for talking about this openly. The expectation of 24/7 availability for OSS maintainers is toxic. We need to normalize sustainable contribution models.',
    images: [],
    media: [],
    parent_id: 't-012',
    root_id: 't-012',
    reply_count: 0,
    like_count: 890,
    repost_count: 145,
    created_at: '2026-02-11T19:45:00Z',
    updated_at: '2026-02-11T19:45:00Z',
  },
];

// ─── Seeded Likes ───────────────────────────────────────────────────────────────

const LIKES: Like[] = [
  { id: 'l-001', user_id: 'u-000', thread_id: 't-001', created_at: '2026-02-13T08:15:00Z' },
  { id: 'l-002', user_id: 'u-000', thread_id: 't-004', created_at: '2026-02-13T05:25:00Z' },
  { id: 'l-003', user_id: 'u-000', thread_id: 't-007', created_at: '2026-02-12T18:35:00Z' },
  { id: 'l-004', user_id: 'u-000', thread_id: 't-012', created_at: '2026-02-11T19:40:00Z' },
  { id: 'l-005', user_id: 'u-002', thread_id: 't-001', created_at: '2026-02-13T08:14:00Z' },
  { id: 'l-006', user_id: 'u-003', thread_id: 't-002', created_at: '2026-02-13T07:50:00Z' },
  { id: 'l-007', user_id: 'u-005', thread_id: 't-003', created_at: '2026-02-13T06:35:00Z' },
  { id: 'l-008', user_id: 'u-006', thread_id: 't-004', created_at: '2026-02-13T05:30:00Z' },
  { id: 'l-009', user_id: 'u-001', thread_id: 't-005', created_at: '2026-02-12T22:20:00Z' },
  { id: 'l-010', user_id: 'u-007', thread_id: 't-006', created_at: '2026-02-12T20:10:00Z' },
];

// ─── Seeded Follows ─────────────────────────────────────────────────────────────

const FOLLOWS: Follow[] = [
  { id: 'f-001', follower_id: 'u-000', following_id: 'u-001', created_at: '2024-01-02T00:00:00Z' },
  { id: 'f-002', follower_id: 'u-000', following_id: 'u-002', created_at: '2024-01-02T00:00:00Z' },
  { id: 'f-003', follower_id: 'u-000', following_id: 'u-004', created_at: '2024-01-03T00:00:00Z' },
  { id: 'f-004', follower_id: 'u-000', following_id: 'u-006', created_at: '2024-01-04T00:00:00Z' },
  { id: 'f-005', follower_id: 'u-000', following_id: 'u-007', created_at: '2024-01-05T00:00:00Z' },
  { id: 'f-006', follower_id: 'u-001', following_id: 'u-002', created_at: '2023-07-15T00:00:00Z' },
  { id: 'f-007', follower_id: 'u-001', following_id: 'u-003', created_at: '2023-08-02T00:00:00Z' },
  { id: 'f-008', follower_id: 'u-001', following_id: 'u-006', created_at: '2023-07-22T00:00:00Z' },
  { id: 'f-009', follower_id: 'u-002', following_id: 'u-001', created_at: '2023-07-16T00:00:00Z' },
  { id: 'f-010', follower_id: 'u-002', following_id: 'u-005', created_at: '2023-09-15T00:00:00Z' },
  { id: 'f-011', follower_id: 'u-003', following_id: 'u-001', created_at: '2023-08-05T00:00:00Z' },
  { id: 'f-012', follower_id: 'u-003', following_id: 'u-007', created_at: '2023-08-12T00:00:00Z' },
  { id: 'f-013', follower_id: 'u-004', following_id: 'u-001', created_at: '2023-07-10T00:00:00Z' },
  { id: 'f-014', follower_id: 'u-004', following_id: 'u-006', created_at: '2023-07-25T00:00:00Z' },
  { id: 'f-015', follower_id: 'u-005', following_id: 'u-002', created_at: '2023-09-20T00:00:00Z' },
  { id: 'f-016', follower_id: 'u-006', following_id: 'u-007', created_at: '2023-08-15T00:00:00Z' },
  { id: 'f-017', follower_id: 'u-007', following_id: 'u-001', created_at: '2023-08-11T00:00:00Z' },
  { id: 'f-018', follower_id: 'u-007', following_id: 'u-006', created_at: '2023-08-16T00:00:00Z' },
];

// ─── Seeded Reposts ─────────────────────────────────────────────────────────────

const BASE_VIDEO_URL = 'https://avtshare01.rz.tu-ilmenau.de/avt-vqdb-uhd-1/test_2/segments';

// ─── Seeded Reels (separate from Threads) ───────────────────────────────────────

const REELS: Reel[] = [
  {
    id: 'reel-001',
    author_id: 'u-001',
    videoUrl: `${BASE_VIDEO_URL}/cutting_orange_tuil_8s_2470kbps_720p_59.94fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?w=400&h=700&fit=crop',
    caption: 'Satisfying orange cutting tutorial 🍊 Perfect slices every time! #cooking #satisfying #foodtok',
    likeCount: 24500,
    commentCount: 1832,
    shareCount: 4210,
    isLiked: false,
    createdAt: '2026-02-14T08:00:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-002',
    author_id: 'u-002',
    videoUrl: `${BASE_VIDEO_URL}/Dancers_8s_4553kbps_720p_60.0fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&h=700&fit=crop',
    caption: 'When the whole crew hits the beat perfectly 🔥💃 #dance #choreography #vibes',
    likeCount: 89200,
    commentCount: 5621,
    shareCount: 12400,
    isLiked: true,
    createdAt: '2026-02-14T06:30:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-003',
    author_id: 'u-003',
    videoUrl: `${BASE_VIDEO_URL}/cutting_orange_tuil_8s_4553kbps_720p_59.94fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=700&fit=crop',
    caption: 'Orange prep for the week! Meal prep vibes 🧡 #mealprep #healthy #oranges',
    likeCount: 15300,
    commentCount: 892,
    shareCount: 2100,
    isLiked: false,
    createdAt: '2026-02-13T22:15:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-004',
    author_id: 'u-004',
    videoUrl: `${BASE_VIDEO_URL}/Dancers_8s_2470kbps_720p_60.0fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400&h=700&fit=crop',
    caption: 'Street performers absolutely killing it downtown 🎶 This needs to go viral! #streetdance #talent',
    likeCount: 142000,
    commentCount: 8930,
    shareCount: 31200,
    isLiked: false,
    createdAt: '2026-02-13T18:00:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-005',
    author_id: 'u-005',
    videoUrl: `${BASE_VIDEO_URL}/cutting_orange_tuil_8s_6635kbps_720p_59.94fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&h=700&fit=crop',
    caption: 'The perfect citrus segment technique 🔪✨ Watch till the end for the reveal! #asmr #cooking',
    likeCount: 67400,
    commentCount: 3200,
    shareCount: 8900,
    isLiked: true,
    createdAt: '2026-02-13T14:00:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-006',
    author_id: 'u-006',
    videoUrl: `${BASE_VIDEO_URL}/Dancers_8s_6635kbps_720p_60.0fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=700&fit=crop',
    caption: 'New choreo dropped 🚀 This one took us 3 weeks to perfect. Worth it? #dance #newmoves',
    likeCount: 203000,
    commentCount: 14200,
    shareCount: 45100,
    isLiked: false,
    createdAt: '2026-02-13T10:30:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-007',
    author_id: 'u-007',
    videoUrl: `${BASE_VIDEO_URL}/cutting_orange_tuil_8s_1659kbps_360p_59.94fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1587735243615-c067550da4b2?w=400&h=700&fit=crop',
    caption: 'Quick kitchen tip: How to peel an orange in 5 seconds flat 🍊⚡ #lifehack #kitchen',
    likeCount: 31200,
    commentCount: 1540,
    shareCount: 5300,
    isLiked: false,
    createdAt: '2026-02-12T20:00:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-008',
    author_id: 'u-001',
    videoUrl: `${BASE_VIDEO_URL}/Dancers_8s_1659kbps_360p_60.0fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1535525153412-30a0e7e365fa?w=400&h=700&fit=crop',
    caption: 'Friday night vibes only 🌙✨ Turn your sound UP for this one #fridaynight #dance #mood',
    likeCount: 56800,
    commentCount: 2890,
    shareCount: 7600,
    isLiked: true,
    createdAt: '2026-02-12T16:00:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-009',
    author_id: 'u-003',
    videoUrl: `${BASE_VIDEO_URL}/cutting_orange_tuil_8s_1138kbps_360p_59.94fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=400&h=700&fit=crop',
    caption: 'Satisfying fruit art compilation 🎨🍊 Which style is your favorite? Comment below! #fruitart',
    likeCount: 43100,
    commentCount: 2100,
    shareCount: 6400,
    isLiked: false,
    createdAt: '2026-02-12T12:00:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
  {
    id: 'reel-010',
    author_id: 'u-006',
    videoUrl: `${BASE_VIDEO_URL}/Dancers_8s_1138kbps_360p_60.0fps_h264.mp4`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=400&h=700&fit=crop',
    caption: 'Tutorial: How to do the viral wave move 🌊 Save this for later! #tutorial #dancetutorial',
    likeCount: 178000,
    commentCount: 9800,
    shareCount: 52000,
    isLiked: false,
    createdAt: '2026-02-12T08:00:00Z',
    aspectRatio: 9 / 16,
    duration: 8,
  },
];

// ─── Seeded Reel Comments ───────────────────────────────────────────────────────

const REEL_COMMENTS: ReelComment[] = [
  { id: 'rc-001', reel_id: 'reel-001', user_id: 'u-002', content: 'So satisfying to watch! 🍊', likeCount: 42, createdAt: '2026-02-14T08:05:00Z' },
  { id: 'rc-002', reel_id: 'reel-001', user_id: 'u-003', content: 'I need that knife! What brand is it?', likeCount: 18, createdAt: '2026-02-14T08:12:00Z' },
  { id: 'rc-003', reel_id: 'reel-001', user_id: 'u-004', content: 'My oranges never look this good 😭', likeCount: 89, createdAt: '2026-02-14T08:20:00Z' },
  { id: 'rc-004', reel_id: 'reel-002', user_id: 'u-001', content: 'The sync is insane! How long did you practice? 🔥', likeCount: 234, createdAt: '2026-02-14T06:35:00Z' },
  { id: 'rc-005', reel_id: 'reel-002', user_id: 'u-005', content: 'This is the best dance reel I\'ve seen this month!', likeCount: 156, createdAt: '2026-02-14T06:42:00Z' },
  { id: 'rc-006', reel_id: 'reel-002', user_id: 'u-006', content: 'Tutorial please!! 🙏🙏', likeCount: 312, createdAt: '2026-02-14T06:50:00Z' },
  { id: 'rc-007', reel_id: 'reel-002', user_id: 'u-007', content: 'Y\'all make it look so easy', likeCount: 67, createdAt: '2026-02-14T07:00:00Z' },
  { id: 'rc-008', reel_id: 'reel-003', user_id: 'u-001', content: 'Adding this to my meal prep routine!', likeCount: 23, createdAt: '2026-02-13T22:30:00Z' },
  { id: 'rc-009', reel_id: 'reel-004', user_id: 'u-002', content: 'Street performers are the most underrated artists', likeCount: 445, createdAt: '2026-02-13T18:10:00Z' },
  { id: 'rc-010', reel_id: 'reel-004', user_id: 'u-003', content: 'Where is this? I need to go watch them live!', likeCount: 128, createdAt: '2026-02-13T18:15:00Z' },
  { id: 'rc-011', reel_id: 'reel-005', user_id: 'u-004', content: 'The reveal at the end 😍😍', likeCount: 78, createdAt: '2026-02-13T14:10:00Z' },
  { id: 'rc-012', reel_id: 'reel-006', user_id: 'u-001', content: '3 weeks well spent! This is art 🎨', likeCount: 523, createdAt: '2026-02-13T10:40:00Z' },
  { id: 'rc-013', reel_id: 'reel-006', user_id: 'u-003', content: 'I\'ve been trying to learn this for days 😅', likeCount: 89, createdAt: '2026-02-13T10:50:00Z' },
  { id: 'rc-014', reel_id: 'reel-007', user_id: 'u-005', content: 'Just tried this and it actually works!', likeCount: 34, createdAt: '2026-02-12T20:15:00Z' },
  { id: 'rc-015', reel_id: 'reel-008', user_id: 'u-002', content: 'Friday vibes ACTIVATED 🎉', likeCount: 67, createdAt: '2026-02-12T16:10:00Z' },
  { id: 'rc-016', reel_id: 'reel-010', user_id: 'u-001', content: 'Saved! Going to practice this all weekend', likeCount: 234, createdAt: '2026-02-12T08:15:00Z' },
  { id: 'rc-017', reel_id: 'reel-010', user_id: 'u-004', content: 'Step 3 is the hardest part ngl 😤', likeCount: 178, createdAt: '2026-02-12T08:30:00Z' },
  { id: 'rc-018', reel_id: 'reel-010', user_id: 'u-005', content: 'You make everything look effortless!', likeCount: 92, createdAt: '2026-02-12T08:45:00Z' },
];

const REPOSTS: Repost[] = [
  { id: 'rp-001', user_id: 'u-000', thread_id: 't-003', created_at: '2026-02-13T07:10:00Z' },
  { id: 'rp-002', user_id: 'u-001', thread_id: 't-001', created_at: '2026-02-13T08:20:00Z' },
  { id: 'rp-003', user_id: 'u-002', thread_id: 't-007', created_at: '2026-02-12T19:00:00Z' },
  { id: 'rp-004', user_id: 'u-003', thread_id: 't-005', created_at: '2026-02-12T22:45:00Z' },
  { id: 'rp-005', user_id: 'u-005', thread_id: 't-012', created_at: '2026-02-11T20:00:00Z' },
  { id: 'rp-006', user_id: 'u-006', thread_id: 't-004', created_at: '2026-02-13T05:45:00Z' },
  { id: 'rp-007', user_id: 'u-007', thread_id: 't-001', created_at: '2026-02-13T08:30:00Z' },
  { id: 'rp-008', user_id: 'u-004', thread_id: 't-008', created_at: '2026-02-12T16:30:00Z' },
];

// ─── Seeded Conversations ───────────────────────────────────────────────────────

const CONVERSATIONS: Conversation[] = [
  // 1:1 with Alice
  {
    id: 'conv-001',
    type: 'direct',
    name: null,
    avatar_url: null,
    created_by: 'u-000',
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-02-14T09:15:00Z',
    is_muted: false,
    is_pinned: true,
    last_message_id: 'dm-006',
  },
  // 1:1 with Marcus
  {
    id: 'conv-002',
    type: 'direct',
    name: null,
    avatar_url: null,
    created_by: 'u-002',
    created_at: '2026-02-11T14:00:00Z',
    updated_at: '2026-02-14T08:30:00Z',
    is_muted: false,
    is_pinned: false,
    last_message_id: 'dm-010',
  },
  // Group: Design Team
  {
    id: 'conv-003',
    type: 'group',
    name: 'Design Team 🎨',
    avatar_url: 'https://i.pravatar.cc/150?u=designteam',
    created_by: 'u-000',
    created_at: '2026-02-08T10:00:00Z',
    updated_at: '2026-02-14T07:45:00Z',
    is_muted: false,
    is_pinned: true,
    last_message_id: 'dm-018',
  },
  // 1:1 with Priya
  {
    id: 'conv-004',
    type: 'direct',
    name: null,
    avatar_url: null,
    created_by: 'u-003',
    created_at: '2026-02-12T09:00:00Z',
    updated_at: '2026-02-13T22:10:00Z',
    is_muted: false,
    is_pinned: false,
    last_message_id: 'dm-023',
  },
  // Group: Dev Chat
  {
    id: 'conv-005',
    type: 'group',
    name: 'Dev Chat 💻',
    avatar_url: 'https://i.pravatar.cc/150?u=devchat',
    created_by: 'u-006',
    created_at: '2026-02-05T12:00:00Z',
    updated_at: '2026-02-14T06:20:00Z',
    is_muted: true,
    is_pinned: false,
    last_message_id: 'dm-030',
  },
  // 1:1 with Jordan
  {
    id: 'conv-006',
    type: 'direct',
    name: null,
    avatar_url: null,
    created_by: 'u-004',
    created_at: '2026-02-13T11:00:00Z',
    updated_at: '2026-02-13T18:30:00Z',
    is_muted: false,
    is_pinned: false,
    last_message_id: 'dm-034',
  },
  // 1:1 with Sarah
  {
    id: 'conv-007',
    type: 'direct',
    name: null,
    avatar_url: null,
    created_by: 'u-000',
    created_at: '2026-02-09T15:00:00Z',
    updated_at: '2026-02-12T20:45:00Z',
    is_muted: false,
    is_pinned: false,
    last_message_id: 'dm-038',
  },
];

// ─── Seeded Conversation Participants ───────────────────────────────────────────

const CONVERSATION_PARTICIPANTS: ConversationParticipant[] = [
  // conv-001: You + Alice
  { id: 'cp-001', conversation_id: 'conv-001', user_id: 'u-000', role: 'admin', joined_at: '2026-02-10T08:00:00Z', last_read_message_id: 'dm-006', is_typing: false },
  { id: 'cp-002', conversation_id: 'conv-001', user_id: 'u-001', role: 'admin', joined_at: '2026-02-10T08:00:00Z', last_read_message_id: 'dm-005', is_typing: false },
  // conv-002: You + Marcus
  { id: 'cp-003', conversation_id: 'conv-002', user_id: 'u-000', role: 'admin', joined_at: '2026-02-11T14:00:00Z', last_read_message_id: 'dm-009', is_typing: false },
  { id: 'cp-004', conversation_id: 'conv-002', user_id: 'u-002', role: 'admin', joined_at: '2026-02-11T14:00:00Z', last_read_message_id: 'dm-010', is_typing: false },
  // conv-003: Group (You, Alice, Marcus, Elena)
  { id: 'cp-005', conversation_id: 'conv-003', user_id: 'u-000', role: 'admin', joined_at: '2026-02-08T10:00:00Z', last_read_message_id: 'dm-016', is_typing: false },
  { id: 'cp-006', conversation_id: 'conv-003', user_id: 'u-001', role: 'member', joined_at: '2026-02-08T10:00:00Z', last_read_message_id: 'dm-018', is_typing: false },
  { id: 'cp-007', conversation_id: 'conv-003', user_id: 'u-002', role: 'member', joined_at: '2026-02-08T10:00:00Z', last_read_message_id: 'dm-018', is_typing: false },
  { id: 'cp-008', conversation_id: 'conv-003', user_id: 'u-005', role: 'member', joined_at: '2026-02-08T10:00:00Z', last_read_message_id: 'dm-017', is_typing: false },
  // conv-004: You + Priya
  { id: 'cp-009', conversation_id: 'conv-004', user_id: 'u-000', role: 'admin', joined_at: '2026-02-12T09:00:00Z', last_read_message_id: 'dm-023', is_typing: false },
  { id: 'cp-010', conversation_id: 'conv-004', user_id: 'u-003', role: 'admin', joined_at: '2026-02-12T09:00:00Z', last_read_message_id: 'dm-022', is_typing: false },
  // conv-005: Group (You, Alice, David, Priya, Sarah)
  { id: 'cp-011', conversation_id: 'conv-005', user_id: 'u-000', role: 'member', joined_at: '2026-02-05T12:00:00Z', last_read_message_id: 'dm-028', is_typing: false },
  { id: 'cp-012', conversation_id: 'conv-005', user_id: 'u-001', role: 'member', joined_at: '2026-02-05T12:00:00Z', last_read_message_id: 'dm-030', is_typing: false },
  { id: 'cp-013', conversation_id: 'conv-005', user_id: 'u-006', role: 'admin', joined_at: '2026-02-05T12:00:00Z', last_read_message_id: 'dm-030', is_typing: false },
  { id: 'cp-014', conversation_id: 'conv-005', user_id: 'u-003', role: 'member', joined_at: '2026-02-05T12:00:00Z', last_read_message_id: 'dm-029', is_typing: false },
  { id: 'cp-015', conversation_id: 'conv-005', user_id: 'u-007', role: 'member', joined_at: '2026-02-05T12:00:00Z', last_read_message_id: 'dm-030', is_typing: false },
  // conv-006: You + Jordan
  { id: 'cp-016', conversation_id: 'conv-006', user_id: 'u-000', role: 'admin', joined_at: '2026-02-13T11:00:00Z', last_read_message_id: 'dm-034', is_typing: false },
  { id: 'cp-017', conversation_id: 'conv-006', user_id: 'u-004', role: 'admin', joined_at: '2026-02-13T11:00:00Z', last_read_message_id: 'dm-033', is_typing: false },
  // conv-007: You + Sarah
  { id: 'cp-018', conversation_id: 'conv-007', user_id: 'u-000', role: 'admin', joined_at: '2026-02-09T15:00:00Z', last_read_message_id: 'dm-038', is_typing: false },
  { id: 'cp-019', conversation_id: 'conv-007', user_id: 'u-007', role: 'admin', joined_at: '2026-02-09T15:00:00Z', last_read_message_id: 'dm-037', is_typing: false },
];

// ─── Seeded Direct Messages ────────────────────────────────────────────────────

const DIRECT_MESSAGES: DirectMessage[] = [
  // Conv-001: You + Alice (design system discussion)
  { id: 'dm-001', conversation_id: 'conv-001', sender_id: 'u-001', type: 'text', content: 'Hey! Have you seen the new NativeWind v4 release? 🚀', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-13T08:00:00Z', is_deleted: false },
  { id: 'dm-002', conversation_id: 'conv-001', sender_id: 'u-000', type: 'text', content: 'Yes!! The CSS variable support is amazing. We should migrate ASAP', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-001', emoji: '🔥', created_at: '2026-02-13T08:02:00Z' }], status: 'seen', created_at: '2026-02-13T08:01:00Z', is_deleted: false },
  { id: 'dm-003', conversation_id: 'conv-001', sender_id: 'u-001', type: 'text', content: 'Right? I already started a branch. The perf gains are insane — bundle size dropped 15%', media_url: null, media_thumbnail: null, reply_to_id: 'dm-002', shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-13T08:05:00Z', is_deleted: false },
  { id: 'dm-004', conversation_id: 'conv-001', sender_id: 'u-001', type: 'image', content: 'Check out the benchmark results', media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop', media_thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=150&fit=crop', reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '😍', created_at: '2026-02-13T08:12:00Z' }], status: 'seen', created_at: '2026-02-13T08:10:00Z', is_deleted: false },
  { id: 'dm-005', conversation_id: 'conv-001', sender_id: 'u-000', type: 'thread_share', content: 'This thread explains the migration path really well', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: 't-001', shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T09:10:00Z', is_deleted: false },
  { id: 'dm-006', conversation_id: 'conv-001', sender_id: 'u-000', type: 'text', content: "Let's pair on it tomorrow? I'm free after 2pm", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'sent', created_at: '2026-02-14T09:15:00Z', is_deleted: false },

  // Conv-002: You + Marcus (design review)
  { id: 'dm-007', conversation_id: 'conv-002', sender_id: 'u-002', type: 'text', content: 'Yo can you review the new component API I proposed?', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T07:00:00Z', is_deleted: false },
  { id: 'dm-008', conversation_id: 'conv-002', sender_id: 'u-000', type: 'text', content: 'Sure, send it over', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T07:02:00Z', is_deleted: false },
  { id: 'dm-009', conversation_id: 'conv-002', sender_id: 'u-002', type: 'image', content: 'Here are the Figma specs', media_url: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&h=600&fit=crop', media_thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=200&h=150&fit=crop', reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T07:05:00Z', is_deleted: false },
  { id: 'dm-010', conversation_id: 'conv-002', sender_id: 'u-002', type: 'text', content: 'Let me know what you think. I want to finalize before the sprint review 🙏', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '👍', created_at: '2026-02-14T08:32:00Z' }], status: 'delivered', created_at: '2026-02-14T08:30:00Z', is_deleted: false },

  // Conv-003: Design Team Group (You, Alice, Marcus, Elena)
  { id: 'dm-011', conversation_id: 'conv-003', sender_id: 'u-000', type: 'text', content: 'Team standup — what is everyone working on today?', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T06:00:00Z', is_deleted: false },
  { id: 'dm-012', conversation_id: 'conv-003', sender_id: 'u-001', type: 'text', content: 'Finishing the button component variants. Should have PR up by noon', media_url: null, media_thumbnail: null, reply_to_id: 'dm-011', shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '💪', created_at: '2026-02-14T06:05:00Z' }], status: 'seen', created_at: '2026-02-14T06:03:00Z', is_deleted: false },
  { id: 'dm-013', conversation_id: 'conv-003', sender_id: 'u-002', type: 'text', content: 'Working on the token system. Need feedback on the naming convention', media_url: null, media_thumbnail: null, reply_to_id: 'dm-011', shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T06:05:00Z', is_deleted: false },
  { id: 'dm-014', conversation_id: 'conv-003', sender_id: 'u-005', type: 'text', content: "I'll be doing accessibility audit for the modal component today 🎯", media_url: null, media_thumbnail: null, reply_to_id: 'dm-011', shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '❤️', created_at: '2026-02-14T06:10:00Z' }, { user_id: 'u-001', emoji: '🙌', created_at: '2026-02-14T06:11:00Z' }], status: 'seen', created_at: '2026-02-14T06:08:00Z', is_deleted: false },
  { id: 'dm-015', conversation_id: 'conv-003', sender_id: 'u-000', type: 'text', content: 'Awesome, all sounds great! Elena, can you share the a11y checklist?', media_url: null, media_thumbnail: null, reply_to_id: 'dm-014', shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T06:12:00Z', is_deleted: false },
  { id: 'dm-016', conversation_id: 'conv-003', sender_id: 'u-005', type: 'image', content: 'Here you go! Updated checklist with WCAG 2.2 additions', media_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop', media_thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=150&fit=crop', reply_to_id: 'dm-015', shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '🔥', created_at: '2026-02-14T06:32:00Z' }], status: 'seen', created_at: '2026-02-14T06:30:00Z', is_deleted: false },
  { id: 'dm-017', conversation_id: 'conv-003', sender_id: 'u-001', type: 'text', content: 'This is super helpful, thanks Elena! 🙌', media_url: null, media_thumbnail: null, reply_to_id: 'dm-016', shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T07:00:00Z', is_deleted: false },
  { id: 'dm-018', conversation_id: 'conv-003', sender_id: 'u-002', type: 'text', content: 'Quick sync at 3pm everyone? Want to align on the token naming before I push', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-001', emoji: '👍', created_at: '2026-02-14T07:50:00Z' }], status: 'delivered', created_at: '2026-02-14T07:45:00Z', is_deleted: false },

  // Conv-004: You + Priya (code help)
  { id: 'dm-019', conversation_id: 'conv-004', sender_id: 'u-003', type: 'text', content: "Hey! Quick question about that TypeScript pattern you shared", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-13T20:00:00Z', is_deleted: false },
  { id: 'dm-020', conversation_id: 'conv-004', sender_id: 'u-000', type: 'text', content: 'Yeah of course, what do you need?', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-13T20:05:00Z', is_deleted: false },
  { id: 'dm-021', conversation_id: 'conv-004', sender_id: 'u-003', type: 'thread_share', content: "Can you explain this part more? The mapped types section", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: 't-004', shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-13T20:10:00Z', is_deleted: false },
  { id: 'dm-022', conversation_id: 'conv-004', sender_id: 'u-000', type: 'text', content: "Sure! So the idea is you define a single source of truth type and derive everything from it. Makes refactoring way easier because changes cascade automatically.", media_url: null, media_thumbnail: null, reply_to_id: 'dm-021', shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-003', emoji: '💡', created_at: '2026-02-13T22:00:00Z' }], status: 'seen', created_at: '2026-02-13T21:00:00Z', is_deleted: false },
  { id: 'dm-023', conversation_id: 'conv-004', sender_id: 'u-003', type: 'text', content: "That makes so much sense! Thank you 🙏 I'll try refactoring my project with this approach", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '❤️', created_at: '2026-02-13T22:12:00Z' }], status: 'seen', created_at: '2026-02-13T22:10:00Z', is_deleted: false },

  // Conv-005: Dev Chat Group (You, Alice, David, Priya, Sarah)
  { id: 'dm-024', conversation_id: 'conv-005', sender_id: 'u-006', type: 'text', content: 'Just pushed v3.1 hotfix for the CLI. Critical bug with Windows paths resolved', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-001', emoji: '🎉', created_at: '2026-02-14T05:02:00Z' }], status: 'seen', created_at: '2026-02-14T05:00:00Z', is_deleted: false },
  { id: 'dm-025', conversation_id: 'conv-005', sender_id: 'u-007', type: 'text', content: "Nice! We'd been hitting that in our CI/CD pipeline", media_url: null, media_thumbnail: null, reply_to_id: 'dm-024', shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T05:05:00Z', is_deleted: false },
  { id: 'dm-026', conversation_id: 'conv-005', sender_id: 'u-003', type: 'text', content: 'Same here. Thanks David!', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-14T05:10:00Z', is_deleted: false },
  { id: 'dm-027', conversation_id: 'conv-005', sender_id: 'u-001', type: 'reel_share', content: 'lol this is so relatable 😂', media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: 'reel-001', reactions: [{ user_id: 'u-006', emoji: '😂', created_at: '2026-02-14T05:25:00Z' }], status: 'seen', created_at: '2026-02-14T05:20:00Z', is_deleted: false },
  { id: 'dm-028', conversation_id: 'conv-005', sender_id: 'u-000', type: 'text', content: "Anyone tried Bun 2.0 yet? The startup time is wild", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-007', emoji: '👀', created_at: '2026-02-14T05:35:00Z' }], status: 'seen', created_at: '2026-02-14T05:30:00Z', is_deleted: false },
  { id: 'dm-029', conversation_id: 'conv-005', sender_id: 'u-006', type: 'text', content: 'Yeah, we benchmarked it. 2x faster than Node for our use case', media_url: null, media_thumbnail: null, reply_to_id: 'dm-028', shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '🔥', created_at: '2026-02-14T06:01:00Z' }], status: 'seen', created_at: '2026-02-14T06:00:00Z', is_deleted: false },
  { id: 'dm-030', conversation_id: 'conv-005', sender_id: 'u-007', type: 'text', content: "We should do a comparison blog post. I'll set up the test suite this weekend", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-001', emoji: '💯', created_at: '2026-02-14T06:22:00Z' }, { user_id: 'u-006', emoji: '👍', created_at: '2026-02-14T06:23:00Z' }], status: 'delivered', created_at: '2026-02-14T06:20:00Z', is_deleted: false },

  // Conv-006: You + Jordan (journalism)
  { id: 'dm-031', conversation_id: 'conv-006', sender_id: 'u-004', type: 'text', content: "Hey, I'm writing a piece on new developer tools. Can I quote you on the CLI rewrite?", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-13T15:00:00Z', is_deleted: false },
  { id: 'dm-032', conversation_id: 'conv-006', sender_id: 'u-000', type: 'text', content: "Of course! Happy to help. What angle are you taking?", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-13T15:30:00Z', is_deleted: false },
  { id: 'dm-033', conversation_id: 'conv-006', sender_id: 'u-004', type: 'text', content: "Focusing on the Rust migration trend in developer tooling. Seems like everyone is rewriting their CLIs in Rust", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '👍', created_at: '2026-02-13T16:02:00Z' }], status: 'seen', created_at: '2026-02-13T16:00:00Z', is_deleted: false },
  { id: 'dm-034', conversation_id: 'conv-006', sender_id: 'u-000', type: 'text', content: "That's a great angle! I can share some benchmark data too if you want. DM me your email and I'll send it over", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'sent', created_at: '2026-02-13T18:30:00Z', is_deleted: false },

  // Conv-007: You + Sarah (AI discussion)
  { id: 'dm-035', conversation_id: 'conv-007', sender_id: 'u-007', type: 'text', content: "Your thread about fine-tuning was interesting. Have you tried LoRA on smaller models?", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'seen', created_at: '2026-02-12T18:00:00Z', is_deleted: false },
  { id: 'dm-036', conversation_id: 'conv-007', sender_id: 'u-000', type: 'text', content: "Yeah! LoRA is incredible for the compute savings. We got 90% of full fine-tune quality at 1/10th the cost", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-007', emoji: '🤯', created_at: '2026-02-12T19:02:00Z' }], status: 'seen', created_at: '2026-02-12T19:00:00Z', is_deleted: false },
  { id: 'dm-037', conversation_id: 'conv-007', sender_id: 'u-007', type: 'text', content: "That's exactly what our paper found too. We should collaborate on something!", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [{ user_id: 'u-000', emoji: '❤️', created_at: '2026-02-12T20:35:00Z' }], status: 'seen', created_at: '2026-02-12T20:30:00Z', is_deleted: false },
  { id: 'dm-038', conversation_id: 'conv-007', sender_id: 'u-000', type: 'text', content: "I'd love that! Let's set up a call next week to brainstorm 🧠", media_url: null, media_thumbnail: null, reply_to_id: null, shared_thread_id: null, shared_reel_id: null, reactions: [], status: 'sent', created_at: '2026-02-12T20:45:00Z', is_deleted: false },
];

// ─── In-Memory Database ─────────────────────────────────────────────────────────

class Database {
  users: User[];
  threads: Thread[];
  likes: Like[];
  follows: Follow[];
  reposts: Repost[];
  bookmarks: Bookmark[];
  reels: Reel[];
  reelComments: ReelComment[];
  reelLikes: { reel_id: string; user_id: string }[];
  muted_users: string[];
  hidden_threads: string[];
  conversations: Conversation[];
  conversationParticipants: ConversationParticipant[];
  directMessages: DirectMessage[];

  constructor() {
    this.users = [
      USER_CURRENT,
      USER_ALICE,
      USER_MARCUS,
      USER_PRIYA,
      USER_JORDAN,
      USER_ELENA,
      USER_DAVID,
      USER_SARAH,
    ];
    this.threads = [...THREADS, ...REPLIES];
    this.likes = [...LIKES];
    this.follows = [...FOLLOWS];
    this.reposts = [...REPOSTS];
    this.bookmarks = [];
    this.reels = [...REELS];
    this.reelComments = [...REEL_COMMENTS];
    this.reelLikes = REELS.filter((r) => r.isLiked).map((r) => ({ reel_id: r.id, user_id: 'u-000' }));
    this.muted_users = [];
    this.hidden_threads = [];
    this.conversations = [...CONVERSATIONS];
    this.conversationParticipants = [...CONVERSATION_PARTICIPANTS];
    this.directMessages = [...DIRECT_MESSAGES];
  }

  // ── User CRUD ───────────────────────────────────────────────────────────────

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.users.find((u) => u.username === username);
  }

  getAllUsers(): User[] {
    return this.users;
  }

  // ── Thread CRUD ─────────────────────────────────────────────────────────────

  getThreadById(id: string): Thread | undefined {
    return this.threads.find((t) => t.id === id);
  }

  getRootThreads(): Thread[] {
    return this.threads
      .filter((t) => t.parent_id === null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getRepliesForThread(threadId: string): Thread[] {
    return this.threads
      .filter((t) => t.parent_id === threadId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getThreadsByUserId(userId: string): Thread[] {
    return this.threads
      .filter((t) => t.user_id === userId && t.parent_id === null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getRepliesByUserId(userId: string): Thread[] {
    return this.threads
      .filter((t) => t.user_id === userId && t.parent_id !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createThread(params: {
    user_id: string;
    content: string;
    images?: string[];
    media?: MediaItem[];
    parent_id?: string | null;
    root_id?: string | null;
  }): Thread {
    const now = new Date().toISOString();
    const thread: Thread = {
      id: uuid(),
      user_id: params.user_id,
      content: params.content,
      images: params.images ?? [],
      media: params.media ?? [],
      parent_id: params.parent_id ?? null,
      root_id: params.root_id ?? null,
      reply_count: 0,
      like_count: 0,
      repost_count: 0,
      created_at: now,
      updated_at: now,
    };
    this.threads.unshift(thread);

    if (params.parent_id) {
      const parent = this.getThreadById(params.parent_id);
      if (parent) {
        parent.reply_count += 1;
        parent.updated_at = now;
      }
    }

    return thread;
  }

  // ── Like CRUD ───────────────────────────────────────────────────────────────

  isLikedByUser(userId: string, threadId: string): boolean {
    return this.likes.some((l) => l.user_id === userId && l.thread_id === threadId);
  }

  toggleLike(userId: string, threadId: string): boolean {
    const existing = this.likes.find((l) => l.user_id === userId && l.thread_id === threadId);
    const thread = this.getThreadById(threadId);

    if (existing) {
      this.likes = this.likes.filter((l) => l.id !== existing.id);
      if (thread) thread.like_count = Math.max(0, thread.like_count - 1);
      return false;
    }

    this.likes.push({
      id: uuid(),
      user_id: userId,
      thread_id: threadId,
      created_at: new Date().toISOString(),
    });
    if (thread) thread.like_count += 1;
    return true;
  }

  getLikesByUserId(userId: string): Like[] {
    return this.likes.filter((l) => l.user_id === userId);
  }

  // ── Follow CRUD ─────────────────────────────────────────────────────────────

  isFollowing(followerId: string, followingId: string): boolean {
    return this.follows.some((f) => f.follower_id === followerId && f.following_id === followingId);
  }

  toggleFollow(followerId: string, followingId: string): boolean {
    const existing = this.follows.find(
      (f) => f.follower_id === followerId && f.following_id === followingId,
    );
    const user = this.getUserById(followingId);
    const follower = this.getUserById(followerId);

    if (existing) {
      this.follows = this.follows.filter((f) => f.id !== existing.id);
      if (user) user.followers_count = Math.max(0, user.followers_count - 1);
      if (follower) follower.following_count = Math.max(0, follower.following_count - 1);
      return false;
    }

    this.follows.push({
      id: uuid(),
      follower_id: followerId,
      following_id: followingId,
      created_at: new Date().toISOString(),
    });
    if (user) user.followers_count += 1;
    if (follower) follower.following_count += 1;
    return true;
  }

  getFollowers(userId: string): User[] {
    const followerIds = this.follows
      .filter((f) => f.following_id === userId)
      .map((f) => f.follower_id);
    return this.users.filter((u) => followerIds.includes(u.id));
  }

  getFollowing(userId: string): User[] {
    const followingIds = this.follows
      .filter((f) => f.follower_id === userId)
      .map((f) => f.following_id);
    return this.users.filter((u) => followingIds.includes(u.id));
  }

  // ── Repost CRUD ─────────────────────────────────────────────────────────────

  isRepostedByUser(userId: string, threadId: string): boolean {
    return this.reposts.some((r) => r.user_id === userId && r.thread_id === threadId);
  }

  toggleRepost(userId: string, threadId: string): boolean {
    const existing = this.reposts.find((r) => r.user_id === userId && r.thread_id === threadId);
    const thread = this.getThreadById(threadId);

    if (existing) {
      this.reposts = this.reposts.filter((r) => r.id !== existing.id);
      if (thread) thread.repost_count = Math.max(0, thread.repost_count - 1);
      return false;
    }

    this.reposts.push({
      id: uuid(),
      user_id: userId,
      thread_id: threadId,
      created_at: new Date().toISOString(),
    });
    if (thread) thread.repost_count += 1;
    return true;
  }

  getRepostsByUserId(userId: string): Repost[] {
    return this.reposts.filter((r) => r.user_id === userId);
  }

  // ── Bookmark CRUD ───────────────────────────────────────────────────────────

  isBookmarkedByUser(userId: string, threadId: string): boolean {
    return this.bookmarks.some((b) => b.user_id === userId && b.thread_id === threadId);
  }

  toggleBookmark(userId: string, threadId: string): boolean {
    const existing = this.bookmarks.find(
      (b) => b.user_id === userId && b.thread_id === threadId,
    );
    if (existing) {
      this.bookmarks = this.bookmarks.filter((b) => b.id !== existing.id);
      return false;
    }
    this.bookmarks.push({
      id: uuid(),
      user_id: userId,
      thread_id: threadId,
      created_at: new Date().toISOString(),
    });
    return true;
  }

  getBookmarksByUserId(userId: string): Bookmark[] {
    return this.bookmarks
      .filter((b) => b.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ── User Update ─────────────────────────────────────────────────────────────

  updateUser(
    userId: string,
    updates: Partial<Pick<User, 'display_name' | 'username' | 'bio' | 'avatar_url'>>,
  ): User | undefined {
    const user = this.getUserById(userId);
    if (!user) return undefined;

    if (updates.display_name !== undefined) user.display_name = updates.display_name;
    if (updates.username !== undefined) user.username = updates.username;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.avatar_url !== undefined) user.avatar_url = updates.avatar_url;

    return user;
  }

  // ── Mute / Hide / Delete ────────────────────────────────────────────────────

  muteUser(userId: string): void {
    if (!this.muted_users.includes(userId)) {
      this.muted_users.push(userId);
    }
  }

  unmuteUser(userId: string): void {
    this.muted_users = this.muted_users.filter((id) => id !== userId);
  }

  isUserMuted(userId: string): boolean {
    return this.muted_users.includes(userId);
  }

  hideThread(threadId: string): void {
    if (!this.hidden_threads.includes(threadId)) {
      this.hidden_threads.push(threadId);
    }
  }

  unhideThread(threadId: string): void {
    this.hidden_threads = this.hidden_threads.filter((id) => id !== threadId);
  }

  isThreadHidden(threadId: string): boolean {
    return this.hidden_threads.includes(threadId);
  }

  deleteThread(threadId: string): boolean {
    const thread = this.getThreadById(threadId);
    if (!thread) return false;

    if (thread.parent_id) {
      const parent = this.getThreadById(thread.parent_id);
      if (parent) {
        parent.reply_count = Math.max(0, parent.reply_count - 1);
      }
    }

    const childReplies = this.threads.filter((t) => t.parent_id === threadId);
    for (const child of childReplies) {
      this.deleteThread(child.id);
    }

    this.threads = this.threads.filter((t) => t.id !== threadId);
    this.likes = this.likes.filter((l) => l.thread_id !== threadId);
    this.reposts = this.reposts.filter((r) => r.thread_id !== threadId);

    return true;
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  searchThreads(query: string): Thread[] {
    const lower = query.toLowerCase();
    return this.threads.filter(
      (t) => t.content.toLowerCase().includes(lower) && t.parent_id === null,
    );
  }

  searchUsers(query: string): User[] {
    const lower = query.toLowerCase();
    return this.users.filter(
      (u) =>
        u.username.toLowerCase().includes(lower) ||
        u.display_name.toLowerCase().includes(lower),
    );
  }

  // ── Reel CRUD ───────────────────────────────────────────────────────────────

  getAllReels(): Reel[] {
    return this.reels.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getReelById(id: string): Reel | undefined {
    return this.reels.find((r) => r.id === id);
  }

  getReelsByAuthor(authorId: string): Reel[] {
    return this.reels
      .filter((r) => r.author_id === authorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  isReelLikedByUser(userId: string, reelId: string): boolean {
    return this.reelLikes.some((rl) => rl.user_id === userId && rl.reel_id === reelId);
  }

  toggleReelLike(userId: string, reelId: string): boolean {
    const existing = this.reelLikes.find(
      (rl) => rl.user_id === userId && rl.reel_id === reelId,
    );
    const reel = this.getReelById(reelId);

    if (existing) {
      this.reelLikes = this.reelLikes.filter(
        (rl) => !(rl.user_id === userId && rl.reel_id === reelId),
      );
      if (reel) reel.likeCount = Math.max(0, reel.likeCount - 1);
      return false;
    }

    this.reelLikes.push({ reel_id: reelId, user_id: userId });
    if (reel) reel.likeCount += 1;
    return true;
  }

  getCommentsForReel(reelId: string): ReelComment[] {
    return this.reelComments
      .filter((rc) => rc.reel_id === reelId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  addReelComment(reelId: string, userId: string, content: string): ReelComment {
    const comment: ReelComment = {
      id: uuid(),
      reel_id: reelId,
      user_id: userId,
      content,
      likeCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.reelComments.push(comment);
    const reel = this.getReelById(reelId);
    if (reel) reel.commentCount += 1;
    return comment;
  }

  createReel(params: {
    author_id: string;
    videoUrl: string;
    thumbnailUrl: string;
    caption: string;
    aspectRatio?: number;
    duration?: number;
  }): Reel {
    const reel: Reel = {
      id: uuid(),
      author_id: params.author_id,
      videoUrl: params.videoUrl,
      thumbnailUrl: params.thumbnailUrl,
      caption: params.caption,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      aspectRatio: params.aspectRatio ?? 9 / 16,
      duration: params.duration ?? 15,
    };
    this.reels.unshift(reel);
    return reel;
  }

  // ── Conversation CRUD ───────────────────────────────────────────────────────

  getConversationById(id: string): Conversation | undefined {
    return this.conversations.find((c) => c.id === id);
  }

  getConversationsForUser(userId: string): Conversation[] {
    const participantConvIds = this.conversationParticipants
      .filter((cp) => cp.user_id === userId)
      .map((cp) => cp.conversation_id);
    return this.conversations
      .filter((c) => participantConvIds.includes(c.id))
      .sort((a, b) => {
        // Pinned first, then by updated_at
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }

  getParticipantsForConversation(conversationId: string): ConversationParticipant[] {
    return this.conversationParticipants.filter(
      (cp) => cp.conversation_id === conversationId,
    );
  }

  getMessagesForConversation(conversationId: string): DirectMessage[] {
    return this.directMessages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getMessageById(id: string): DirectMessage | undefined {
    return this.directMessages.find((m) => m.id === id);
  }

  getUnreadCount(conversationId: string, userId: string): number {
    const participant = this.conversationParticipants.find(
      (cp) => cp.conversation_id === conversationId && cp.user_id === userId,
    );
    if (!participant || !participant.last_read_message_id) {
      return this.directMessages.filter((m) => m.conversation_id === conversationId && m.sender_id !== userId).length;
    }
    const lastReadMessage = this.directMessages.find((m) => m.id === participant.last_read_message_id);
    if (!lastReadMessage) return 0;
    return this.directMessages.filter(
      (m) =>
        m.conversation_id === conversationId &&
        m.sender_id !== userId &&
        new Date(m.created_at).getTime() > new Date(lastReadMessage.created_at).getTime(),
    ).length;
  }

  createConversation(params: {
    type: ConversationType;
    name?: string;
    avatar_url?: string;
    created_by: string;
    participant_ids: string[];
  }): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: uuid(),
      type: params.type,
      name: params.name ?? null,
      avatar_url: params.avatar_url ?? null,
      created_by: params.created_by,
      created_at: now,
      updated_at: now,
      is_muted: false,
      is_pinned: false,
      last_message_id: null,
    };
    this.conversations.push(conversation);

    // Add participants
    for (const userId of params.participant_ids) {
      const cp: ConversationParticipant = {
        id: uuid(),
        conversation_id: conversation.id,
        user_id: userId,
        role: userId === params.created_by ? 'admin' : 'member',
        joined_at: now,
        last_read_message_id: null,
        is_typing: false,
      };
      this.conversationParticipants.push(cp);
    }

    // Add system message for group creation
    if (params.type === 'group') {
      const creator = this.getUserById(params.created_by);
      const systemMsg: DirectMessage = {
        id: uuid(),
        conversation_id: conversation.id,
        sender_id: params.created_by,
        type: 'system',
        content: `${creator?.display_name ?? 'Someone'} created the group "${params.name}"`,
        media_url: null,
        media_thumbnail: null,
        reply_to_id: null,
        shared_thread_id: null,
        shared_reel_id: null,
        reactions: [],
        status: 'seen',
        created_at: now,
        is_deleted: false,
      };
      this.directMessages.push(systemMsg);
      conversation.last_message_id = systemMsg.id;
    }

    return conversation;
  }

  sendMessage(params: {
    conversation_id: string;
    sender_id: string;
    type: MessageType;
    content: string;
    media_url?: string;
    media_thumbnail?: string;
    reply_to_id?: string;
    shared_thread_id?: string;
    shared_reel_id?: string;
  }): DirectMessage {
    const now = new Date().toISOString();
    const message: DirectMessage = {
      id: uuid(),
      conversation_id: params.conversation_id,
      sender_id: params.sender_id,
      type: params.type,
      content: params.content,
      media_url: params.media_url ?? null,
      media_thumbnail: params.media_thumbnail ?? null,
      reply_to_id: params.reply_to_id ?? null,
      shared_thread_id: params.shared_thread_id ?? null,
      shared_reel_id: params.shared_reel_id ?? null,
      reactions: [],
      status: 'sent',
      created_at: now,
      is_deleted: false,
    };
    this.directMessages.push(message);

    // Update conversation
    const conv = this.getConversationById(params.conversation_id);
    if (conv) {
      conv.last_message_id = message.id;
      conv.updated_at = now;
    }

    // Mark sender as read
    const senderParticipant = this.conversationParticipants.find(
      (cp) => cp.conversation_id === params.conversation_id && cp.user_id === params.sender_id,
    );
    if (senderParticipant) {
      senderParticipant.last_read_message_id = message.id;
    }

    return message;
  }

  markConversationRead(conversationId: string, userId: string): void {
    const messages = this.getMessagesForConversation(conversationId);
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    const participant = this.conversationParticipants.find(
      (cp) => cp.conversation_id === conversationId && cp.user_id === userId,
    );
    if (participant) {
      participant.last_read_message_id = lastMsg.id;
    }
  }

  toggleMessageReaction(messageId: string, userId: string, emoji: string): boolean {
    const message = this.getMessageById(messageId);
    if (!message) return false;

    const existing = message.reactions.findIndex(
      (r) => r.user_id === userId && r.emoji === emoji,
    );

    if (existing >= 0) {
      message.reactions.splice(existing, 1);
      return false;
    }

    message.reactions.push({
      user_id: userId,
      emoji,
      created_at: new Date().toISOString(),
    });
    return true;
  }

  deleteMessage(messageId: string): boolean {
    const message = this.getMessageById(messageId);
    if (!message) return false;
    message.is_deleted = true;
    message.content = 'This message was deleted';
    message.media_url = null;
    message.media_thumbnail = null;
    return true;
  }

  toggleConversationPin(conversationId: string): boolean {
    const conv = this.getConversationById(conversationId);
    if (!conv) return false;
    conv.is_pinned = !conv.is_pinned;
    return conv.is_pinned;
  }

  toggleConversationMute(conversationId: string): boolean {
    const conv = this.getConversationById(conversationId);
    if (!conv) return false;
    conv.is_muted = !conv.is_muted;
    return conv.is_muted;
  }

  updateGroupInfo(
    conversationId: string,
    updates: Partial<Pick<Conversation, 'name' | 'avatar_url'>>,
  ): Conversation | undefined {
    const conv = this.getConversationById(conversationId);
    if (!conv || conv.type !== 'group') return undefined;
    if (updates.name !== undefined) conv.name = updates.name;
    if (updates.avatar_url !== undefined) conv.avatar_url = updates.avatar_url;
    return conv;
  }

  addGroupMember(conversationId: string, userId: string, addedBy: string): ConversationParticipant | undefined {
    const conv = this.getConversationById(conversationId);
    if (!conv || conv.type !== 'group') return undefined;

    // Check if already a participant
    const existing = this.conversationParticipants.find(
      (cp) => cp.conversation_id === conversationId && cp.user_id === userId,
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const cp: ConversationParticipant = {
      id: uuid(),
      conversation_id: conversationId,
      user_id: userId,
      role: 'member',
      joined_at: now,
      last_read_message_id: null,
      is_typing: false,
    };
    this.conversationParticipants.push(cp);

    // System message
    const adder = this.getUserById(addedBy);
    const added = this.getUserById(userId);
    const sysMsg: DirectMessage = {
      id: uuid(),
      conversation_id: conversationId,
      sender_id: addedBy,
      type: 'system',
      content: `${adder?.display_name} added ${added?.display_name}`,
      media_url: null,
      media_thumbnail: null,
      reply_to_id: null,
      shared_thread_id: null,
      shared_reel_id: null,
      reactions: [],
      status: 'seen',
      created_at: now,
      is_deleted: false,
    };
    this.directMessages.push(sysMsg);
    conv.last_message_id = sysMsg.id;
    conv.updated_at = now;

    return cp;
  }

  removeGroupMember(conversationId: string, userId: string, removedBy: string): boolean {
    const conv = this.getConversationById(conversationId);
    if (!conv || conv.type !== 'group') return false;

    this.conversationParticipants = this.conversationParticipants.filter(
      (cp) => !(cp.conversation_id === conversationId && cp.user_id === userId),
    );

    const now = new Date().toISOString();
    const remover = this.getUserById(removedBy);
    const removed = this.getUserById(userId);
    const isLeave = removedBy === userId;

    const sysMsg: DirectMessage = {
      id: uuid(),
      conversation_id: conversationId,
      sender_id: removedBy,
      type: 'system',
      content: isLeave
        ? `${removed?.display_name} left the group`
        : `${remover?.display_name} removed ${removed?.display_name}`,
      media_url: null,
      media_thumbnail: null,
      reply_to_id: null,
      shared_thread_id: null,
      shared_reel_id: null,
      reactions: [],
      status: 'seen',
      created_at: now,
      is_deleted: false,
    };
    this.directMessages.push(sysMsg);
    conv.last_message_id = sysMsg.id;
    conv.updated_at = now;

    return true;
  }

  promoteToAdmin(conversationId: string, userId: string): boolean {
    const cp = this.conversationParticipants.find(
      (p) => p.conversation_id === conversationId && p.user_id === userId,
    );
    if (!cp) return false;
    cp.role = 'admin';
    return true;
  }

  findDirectConversation(userId1: string, userId2: string): Conversation | undefined {
    return this.conversations.find((c) => {
      if (c.type !== 'direct') return false;
      const participants = this.getParticipantsForConversation(c.id);
      const userIds = participants.map((p) => p.user_id);
      return userIds.includes(userId1) && userIds.includes(userId2) && participants.length === 2;
    });
  }

  setTyping(conversationId: string, userId: string, isTyping: boolean): void {
    const cp = this.conversationParticipants.find(
      (p) => p.conversation_id === conversationId && p.user_id === userId,
    );
    if (cp) cp.is_typing = isTyping;
  }

  searchConversations(userId: string, query: string): Conversation[] {
    const lowerQuery = query.toLowerCase();
    const userConvs = this.getConversationsForUser(userId);
    return userConvs.filter((c) => {
      // Search group name
      if (c.name && c.name.toLowerCase().includes(lowerQuery)) return true;
      // Search participant names
      const participants = this.getParticipantsForConversation(c.id);
      for (const p of participants) {
        const user = this.getUserById(p.user_id);
        if (user && (user.username.toLowerCase().includes(lowerQuery) || user.display_name.toLowerCase().includes(lowerQuery))) {
          return true;
        }
      }
      // Search message content
      const messages = this.getMessagesForConversation(c.id);
      return messages.some((m) => m.content.toLowerCase().includes(lowerQuery));
    });
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────────

export const db = new Database();

import { CURRENT_USER_ID } from '@/constants/app';
export { CURRENT_USER_ID };

export { uuid };
