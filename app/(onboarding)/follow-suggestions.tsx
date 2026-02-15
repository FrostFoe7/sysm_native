// app/(onboarding)/follow-suggestions.tsx
// Step 5: Suggested accounts to follow — final onboarding step

import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/services/supabase';
import { UserService } from '@/services/user.service';
import { Check, UserPlus } from 'lucide-react-native';
import type { User } from '@/types/types';

export default function FollowSuggestionsStep() {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  // Load suggested users
  useEffect(() => {
    (async () => {
      try {
        // Get users who are verified or popular, excluding current user
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', userId ?? '')
          .eq('is_onboarded', true)
          .order('followers_count', { ascending: false })
          .limit(15);

        if (!error && data) {
          setSuggestions(data.map((d: any) => ({
            id: d.id,
            username: d.username,
            display_name: d.display_name ?? '',
            avatar_url: d.avatar_url ?? '',
            bio: d.bio ?? '',
            verified: d.verified ?? false,
            followers_count: d.followers_count ?? 0,
            following_count: d.following_count ?? 0,
            created_at: d.created_at,
          })));
        }
      } catch {
        // Silently fail — just show empty
      }
      setLoadingSuggestions(false);
    })();
  }, [userId]);

  const toggleFollow = useCallback(async (targetId: string) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
    // toggleFollow handles both follow/unfollow
    UserService.toggleFollow(targetId).catch(() => {});
  }, []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    await completeOnboarding();
    await refreshProfile();
    // Navigation will be handled by root layout watching is_onboarded
    router.replace('/(tabs)');
    setSaving(false);
  }, [completeOnboarding, refreshProfile]);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack className="w-full" space="lg">
        <VStack space="xs">
          <Heading size="xl" className="text-brand-light">Suggested for you</Heading>
          <Text className="text-[14px] leading-[20px] text-brand-muted">
            Follow accounts to build your feed. You can always change this later.
          </Text>
        </VStack>

        {loadingSuggestions ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#0095f6" />
          </View>
        ) : suggestions.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-[14px] text-brand-muted">No suggestions available yet.</Text>
          </View>
        ) : (
          <VStack space="sm">
            {suggestions.map((user) => {
              const isFollowed = followed.has(user.id);
              return (
                <HStack
                  key={user.id}
                  className="items-center rounded-xl border border-brand-border bg-[#1a1a1a] px-4 py-3"
                  space="md"
                >
                  <Image
                    source={{ uri: user.avatar_url || 'https://i.pravatar.cc/100' }}
                    className="size-12 rounded-full"
                    style={{ backgroundColor: '#2a2a2a' }}
                  />

                  <View className="min-w-0 flex-1">
                    <Text className="text-[14px] font-semibold text-brand-light" numberOfLines={1}>
                      {user.display_name || user.username}
                    </Text>
                    <Text className="text-[13px] text-brand-muted" numberOfLines={1}>
                      @{user.username}
                    </Text>
                    {user.bio ? (
                      <Text className="mt-0.5 text-[12px] text-brand-muted" numberOfLines={1}>
                        {user.bio}
                      </Text>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => toggleFollow(user.id)}
                    className={`rounded-lg px-4 py-2 ${
                      isFollowed
                        ? 'bg-brand-border'
                        : 'bg-brand-blue'
                    }`}
                  >
                    {isFollowed ? (
                      <HStack className="items-center" space="xs">
                        <Check size={14} color="#f5f5f5" />
                        <Text className="text-[13px] font-semibold text-brand-light">Following</Text>
                      </HStack>
                    ) : (
                      <HStack className="items-center" space="xs">
                        <UserPlus size={14} color="#fff" />
                        <Text className="text-[13px] font-semibold text-white">Follow</Text>
                      </HStack>
                    )}
                  </Pressable>
                </HStack>
              );
            })}
          </VStack>
        )}

        {/* Finish button */}
        <VStack space="sm">
          <Button
            onPress={handleFinish}
            isDisabled={saving}
            className="h-[50px] rounded-xl bg-brand-blue active:opacity-80"
          >
            {saving ? (
              <ButtonSpinner color="#fff" />
            ) : (
              <ButtonText className="text-[15px] font-semibold text-white">
                {followed.size > 0 ? 'Finish' : 'Skip & finish'}
              </ButtonText>
            )}
          </Button>

          {followed.size === 0 && (
            <Text className="text-center text-[12px] text-brand-muted">
              You can follow people later from your feed
            </Text>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
