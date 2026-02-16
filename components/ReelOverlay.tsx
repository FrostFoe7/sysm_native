// components/ReelOverlay.tsx
// Right-side action stack + bottom caption overlay for a single Reel

import React, { useState, useCallback } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import {
  Heart,
  MoreHorizontal,
  Music,
  Plus,
  Bookmark,
  Flag,
  Link2,
  EyeOff,
} from 'lucide-react-native';
import { VerifiedIcon, ChatIcon, ShareIcon, TOAST_ICONS } from '@/constants/icons';
import { formatCount } from '@/services/format';
import { ReelService } from '@/services/reel.service';
import { UserService } from '@/services/user.service';
import { useAppToast } from '@/components/AppToast';
import type { ReelWithAuthor } from '@/types/types';

interface ReelOverlayProps {
  reel: ReelWithAuthor;
  onCommentPress: () => void;
  onSharePress?: () => void;
}

export function ReelOverlay({ reel, onCommentPress, onSharePress }: ReelOverlayProps) {
  const router = useRouter();
  const { showToast } = useAppToast();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [commentCount] = useState(reel.commentCount);
  const [shareCount] = useState(reel.shareCount);
  const [following, setFollowing] = useState(false);

  React.useEffect(() => {
    ReelService.isReelLiked(reel.id).then(setLiked).catch(() => {});
    UserService.isFollowing(reel.author.id).then(setFollowing).catch(() => {});
  }, [reel.id, reel.author.id]);
  const [showMenu, setShowMenu] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showLikeHeart, setShowLikeHeart] = useState(false);

  const handleLike = useCallback(async () => {
    const result = await ReelService.toggleLike(reel.id);
    setLiked(result.liked);
    setLikeCount(result.count);
    if (result.liked) {
      setShowLikeHeart(true);
      setTimeout(() => setShowLikeHeart(false), 800);
    }
  }, [reel.id]);

  const handleFollow = useCallback(async () => {
    const result = await UserService.toggleFollow(reel.author.id);
    setFollowing(result.following);
    showToast(
      result.following ? `Following ${reel.author.username}` : `Unfollowed ${reel.author.username}`,
    );
  }, [reel.author, showToast]);

  const handleAvatarPress = useCallback(() => {
    router.push(`/profile/${reel.author.id}` as any);
  }, [reel.author.id, router]);

  const handleCopyLink = useCallback(() => {
    showToast('Link copied', TOAST_ICONS.copied);
    setShowMenu(false);
  }, [showToast]);

  const handleSave = useCallback(() => {
    showToast('Reel saved', TOAST_ICONS.saved);
    setShowMenu(false);
  }, [showToast]);

  const handleReport = useCallback(() => {
    showToast('Report submitted', TOAST_ICONS.reported);
    setShowMenu(false);
  }, [showToast]);

  const captionTruncated =
    !captionExpanded && reel.caption.length > 80
      ? reel.caption.slice(0, 80) + '...'
      : reel.caption;

  return (
    <>
      {/* Center heart animation on double-tap like */}
      {showLikeHeart && (
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -40,
            marginTop: -40,
            zIndex: 100,
          }}
          pointerEvents="none"
        >
          <Heart
            size={80}
            color="#ff3040"
            fill="#ff3040"
            style={{ opacity: 0.9 }}
          />
        </View>
      )}

      {/* Right side action stack */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: Platform.OS === 'ios' ? 140 : 110,
          alignItems: 'center',
          gap: 18,
          zIndex: 20,
        }}
      >
        {/* Creator avatar + follow */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Pressable onPress={handleAvatarPress}>
            <Avatar size="sm" style={{ borderWidth: 2, borderColor: '#f3f5f7' }}>
              <AvatarImage source={{ uri: reel.author.avatar_url }} />
            </Avatar>
          </Pressable>
          {!following && (
            <Pressable
              onPress={handleFollow}
              style={{
                position: 'absolute',
                bottom: -8,
                backgroundColor: '#0095f6',
                borderRadius: 10,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#0a0a0a',
              }}
            >
              <Plus size={12} color="#ffffff" strokeWidth={3} />
            </Pressable>
          )}
        </View>

        {/* Like */}
        <Pressable
          onPress={handleLike}
          style={{ alignItems: 'center' }}
          hitSlop={6}
        >
          <Heart
            size={28}
            color={liked ? '#ff3040' : '#ffffff'}
            fill={liked ? '#ff3040' : 'transparent'}
            strokeWidth={liked ? 0 : 2}
          />
          <Text className="mt-1 text-[12px] font-medium text-white">
            {formatCount(likeCount)}
          </Text>
        </Pressable>

        {/* Comment */}
        <Pressable
          onPress={onCommentPress}
          style={{ alignItems: 'center' }}
          hitSlop={6}
        >
          <ChatIcon size={28} color="#ffffff" />
          <Text className="mt-1 text-[12px] font-medium text-white">
            {formatCount(commentCount)}
          </Text>
        </Pressable>

        {/* Share */}
        <Pressable
          onPress={() => {
            handleCopyLink();
            onSharePress?.();
          }}
          style={{ alignItems: 'center' }}
          hitSlop={6}
        >
          <ShareIcon size={26} color="#ffffff" />
          <Text className="mt-1 text-[12px] font-medium text-white">
            {formatCount(shareCount)}
          </Text>
        </Pressable>

        {/* Three-dot menu */}
        <Pressable
          onPress={() => setShowMenu(!showMenu)}
          style={{ alignItems: 'center' }}
          hitSlop={6}
        >
          <MoreHorizontal size={24} color="#ffffff" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Three-dot menu dropdown */}
      {showMenu && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              position: 'absolute',
              right: 56,
              bottom: Platform.OS === 'ios' ? 140 : 110,
              backgroundColor: '#2a2a2a',
              borderRadius: 12,
              paddingVertical: 4,
              minWidth: 180,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 10,
            }}
          >
            <Pressable
              onPress={handleSave}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 12,
              }}
            >
              <Bookmark size={18} color="#f3f5f7" strokeWidth={1.8} />
              <Text className="text-[14px] text-brand-light">Save</Text>
            </Pressable>
            <Pressable
              onPress={handleCopyLink}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 12,
              }}
            >
              <Link2 size={18} color="#f3f5f7" strokeWidth={1.8} />
              <Text className="text-[14px] text-brand-light">Copy link</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                showToast('Reel hidden');
                setShowMenu(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 12,
              }}
            >
              <EyeOff size={18} color="#f3f5f7" strokeWidth={1.8} />
              <Text className="text-[14px] text-brand-light">Not interested</Text>
            </Pressable>
            <Pressable
              onPress={handleReport}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 12,
              }}
            >
              <Flag size={18} color="#ff3b30" strokeWidth={1.8} />
              <Text className="text-[14px] text-[#ff3b30]">Report</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* Bottom overlay: username + caption + music */}
      <View
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 40 : 16,
          left: 12,
          right: 72,
          zIndex: 10,
        }}
      >
        {/* Username */}
        <Pressable onPress={handleAvatarPress}>
          <HStack space="sm" style={{ alignItems: 'center', marginBottom: 6 }}>
            <Text className="text-[15px] font-bold text-white">
              {reel.author.username}
            </Text>
            {reel.author.verified && (
              <VerifiedIcon size={14} color="#0095f6" />
            )}
            {!following && (
              <Pressable onPress={handleFollow}>
                <Text className="text-[13px] font-semibold text-brand-blue">Follow</Text>
              </Pressable>
            )}
          </HStack>
        </Pressable>

        {/* Caption (expandable) */}
        <Pressable onPress={() => setCaptionExpanded(!captionExpanded)}>
          <Text
            className="text-[14px] leading-[20px] text-white"
            numberOfLines={captionExpanded ? undefined : 2}
          >
            {captionTruncated}
          </Text>
          {!captionExpanded && reel.caption.length > 80 && (
            <Text className="mt-1 text-[13px] text-[#aaaaaa]">more</Text>
          )}
        </Pressable>

        {/* Music label */}
        <HStack space="sm" style={{ alignItems: 'center', marginTop: 8 }}>
          <Music size={12} color="#ffffff" strokeWidth={2} />
          <Text className="text-[12px] text-white" numberOfLines={1}>
            {reel.author.display_name} · Original audio
          </Text>
        </HStack>
      </View>

      {/* Gradient overlay at bottom for text readability */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <View
          style={{
            flex: 1,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          } as any}
        />
      </View>
    </>
  );
}
