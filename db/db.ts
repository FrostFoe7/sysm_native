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

// ─── Types ──────────────────────────────────────────────────────────────────────

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

export interface Thread {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  parent_id: string | null;
  root_id: string | null;
  reply_count: number;
  like_count: number;
  repost_count: number;
  created_at: string;
  updated_at: string;
}

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

export type ThreadWithAuthor = Thread & { author: User; reposted_by?: User };

export type ThreadWithReplies = ThreadWithAuthor & {
  replies: ThreadWithAuthor[];
};

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

// ─── In-Memory Database ─────────────────────────────────────────────────────────

class Database {
  users: User[];
  threads: Thread[];
  likes: Like[];
  follows: Follow[];
  reposts: Repost[];
  bookmarks: Bookmark[];
  muted_users: string[];
  hidden_threads: string[];

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
    this.muted_users = [];
    this.hidden_threads = [];
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
    parent_id?: string | null;
    root_id?: string | null;
  }): Thread {
    const now = new Date().toISOString();
    const thread: Thread = {
      id: uuid(),
      user_id: params.user_id,
      content: params.content,
      images: params.images ?? [],
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
}

// ─── Singleton ──────────────────────────────────────────────────────────────────

export const db = new Database();

export const CURRENT_USER_ID = 'u-000';

export { uuid };
