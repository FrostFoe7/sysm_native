import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// SSR-safe no-op storage — AsyncStorage accesses `window` which doesn't exist
// during Expo's static rendering / server-side export.
const _isSSR = typeof window === 'undefined';
const _ssrStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, _value: string) => Promise.resolve(),
  removeItem: (_key: string) => Promise.resolve(),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: _isSSR ? _ssrStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: !_isSSR,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

/** Get the current authenticated user's profile UUID (from users table). */
export async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (error || !data) throw new Error('Profile not found');
  return data.id;
}

/** Cached version of getCurrentUserId to avoid repeated queries. */
let _cachedUserId: string | null = null;
let _cacheExpiry = 0;

export async function getCachedUserId(): Promise<string> {
  const now = Date.now();
  if (_cachedUserId && now < _cacheExpiry) return _cachedUserId;

  _cachedUserId = await getCurrentUserId();
  _cacheExpiry = now + 5 * 60 * 1000; // Cache for 5 minutes
  return _cachedUserId;
}

export function clearUserIdCache(): void {
  _cachedUserId = null;
  _cacheExpiry = 0;
}
