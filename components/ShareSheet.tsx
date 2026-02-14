// components/ShareSheet.tsx

import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import {
  Actionsheet,
  ActionsheetContent,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetBackdrop,
} from '@/components/ui/actionsheet';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
import { useAppToast } from '@/components/AppToast';
import { TOAST_ICONS } from '@/constants/icons';
import { isBookmarkedByCurrentUser, toggleBookmark } from '@/db/selectors';
import { Link2, Share2, MessageSquare, Bookmark, Flag } from 'lucide-react-native';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
}

export function ShareSheet({ isOpen, onClose, threadId }: ShareSheetProps) {
  const { showToast } = useAppToast();
  const isBookmarked = threadId ? isBookmarkedByCurrentUser(threadId) : false;

  const handleCopyLink = useCallback(() => {
    const url = `https://threads.net/t/${threadId}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onClose();
    showToast('Link copied', TOAST_ICONS.copied);
  }, [threadId, onClose, showToast]);

  const handleShareExternal = useCallback(() => {
    const url = `https://threads.net/t/${threadId}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({ title: 'Thread', url })
        .catch(() => {});
    }
    onClose();
  }, [threadId, onClose]);

  const handleSendVia = useCallback(() => {
    onClose();
    showToast('Coming soon', TOAST_ICONS.success);
  }, [onClose, showToast]);

  const handleBookmark = useCallback(() => {
    if (!threadId) return;
    const result = toggleBookmark(threadId);
    onClose();
    showToast(
      result.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks',
      TOAST_ICONS.saved,
    );
  }, [threadId, onClose, showToast]);

  const handleReport = useCallback(() => {
    onClose();
    showToast('Thread reported', TOAST_ICONS.reported, '#ff3040');
  }, [onClose, showToast]);

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop className="bg-black/60" />
      <ActionsheetContent className="rounded-t-3xl border-t border-[#2a2a2a] bg-[#181818] pb-8">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator className="bg-[#555555]" />
        </ActionsheetDragIndicatorWrapper>

        <VStack className="mt-2 w-full">
          <Text className="mb-3 text-center text-[16px] font-semibold text-[#f3f5f7]">
            Share
          </Text>
          <Divider className="mb-1 bg-[#2a2a2a]" />

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleCopyLink}
          >
            <HStack className="flex-1 items-center" space="lg">
              <Link2 size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-[#f3f5f7]">
                Copy link
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleShareExternal}
          >
            <HStack className="flex-1 items-center" space="lg">
              <Share2 size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-[#f3f5f7]">
                Share via...
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleSendVia}
          >
            <HStack className="flex-1 items-center" space="lg">
              <MessageSquare size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-[#f3f5f7]">
                Send via Direct Message
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleBookmark}
          >
            <HStack className="flex-1 items-center" space="lg">
              <Bookmark
                size={22}
                color="#f3f5f7"
                strokeWidth={1.8}
                fill={isBookmarked ? '#f3f5f7' : 'none'}
              />
              <ActionsheetItemText className="text-[16px] text-[#f3f5f7]">
                {isBookmarked ? 'Unsave' : 'Save'}
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <Divider className="my-1 bg-[#2a2a2a]" />

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleReport}
          >
            <HStack className="flex-1 items-center" space="lg">
              <Flag size={22} color="#ff3040" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-[#ff3040]">
                Report
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}
