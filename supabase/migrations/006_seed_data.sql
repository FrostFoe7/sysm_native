-- supabase/migrations/006_seed_data.sql
-- Seed data matching the in-memory Database for development/testing
-- Maps directly to db.ts user IDs and content

-- ═══════════════════════════════════════════════════════════════════════════════
-- USERS (matching db.ts u-000 through u-007)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.users (id, username, display_name, avatar_url, bio, verified, followers_count, following_count) VALUES
  ('00000000-0000-0000-0000-000000000000', 'you', 'You', '', 'Building the future, one thread at a time.', FALSE, 0, 5),
  ('00000000-0000-0000-0000-000000000001', 'alice_dev', 'Alice Chen', 'https://i.pravatar.cc/150?u=alice', 'Full-stack developer. React enthusiast. Coffee addict.', TRUE, 2400, 180),
  ('00000000-0000-0000-0000-000000000002', 'marcus_ui', 'Marcus Rivera', 'https://i.pravatar.cc/150?u=marcus', 'UI/UX Designer | Making the web beautiful', TRUE, 5200, 320),
  ('00000000-0000-0000-0000-000000000003', 'priya_codes', 'Priya Sharma', 'https://i.pravatar.cc/150?u=priya', 'Backend engineer at Scale. Rust & Go fanatic.', TRUE, 8100, 95),
  ('00000000-0000-0000-0000-000000000004', 'jordan_builds', 'Jordan Kim', 'https://i.pravatar.cc/150?u=jordan', 'Building AI tools for developers | YC W24', TRUE, 12000, 430),
  ('00000000-0000-0000-0000-000000000005', 'elena_writes', 'Elena Vasquez', 'https://i.pravatar.cc/150?u=elena', 'Tech journalist. Writing about what matters.', FALSE, 3200, 890),
  ('00000000-0000-0000-0000-000000000006', 'david.tsx', 'David Park', 'https://i.pravatar.cc/150?u=david', 'React Native dev. Open source contributor.', FALSE, 1800, 210),
  ('00000000-0000-0000-0000-000000000007', 'sarah_ml', 'Sarah Thompson', 'https://i.pravatar.cc/150?u=sarah', 'ML Engineer @BigTech | PhD in NLP', TRUE, 15000, 150);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FOLLOWS (matching db.ts follow relationships)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.follows (follower_id, following_id) VALUES
  -- Current user follows
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000007'),
  -- Cross-follows
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003');

-- Note: Thread/Reel seed data is not included here because it would be very large.
-- The in-memory Database class in db.ts serves as the development data source.
-- When migrating to Supabase, use the `scripts/seed-supabase.ts` script to
-- programmatically insert all threads, reels, and conversations.
