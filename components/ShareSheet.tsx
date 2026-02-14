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
import { analytics } from '@/services/analytics.service';
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
    analytics.track('thread_share', { contentId: threadId, method: 'external' });
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
    if (result.bookmarked) {
      analytics.track('thread_save', { contentId: threadId });
    }
    showToast(
      result.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks',
      TOAST_ICONS.saved,
    );
  }, [threadId, onClose, showToast]);

  const handleReport = useCallback(() => {
    onClose();
    analytics.track('thread_share', { contentId: threadId, action: 'report' });
    analytics.recordSignal('thread', threadId, 'report');
    showToast('Thread reported', TOAST_ICONS.reported, 'brand-red');
  }, [threadId, onClose, showToast]);

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop className="bg-black/60" />
      <ActionsheetContent className="rounded-t-3xl border-t border-brand-border-secondary bg-brand-elevated pb-8">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator className="bg-brand-muted" />
        </ActionsheetDragIndicatorWrapper>

        <VStack className="mt-2 w-full">
          <Text className="mb-3 text-center text-[16px] font-semibold text-brand-light">
            Share
          </Text>
          <Divider className="mb-1 bg-brand-border-secondary" />

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleCopyLink}
          >
            <HStack className="flex-1 items-center" space="lg">
              <Link2 size={22} color="brand-light" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-brand-light">
                Copy link
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleShareExternal}
          >
            <HStack className="flex-1 items-center" space="lg">
              <Share2 size={22} color="brand-light" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-brand-light">
                Share via...
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleSendVia}
          >
            <HStack className="flex-1 items-center" space="lg">
              <MessageSquare size={22} color="brand-light" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-brand-light">
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
                color="brand-light"
                strokeWidth={1.8}
                fill={isBookmarked ? 'brand-light' : 'none'}
              />
              <ActionsheetItemText className="text-[16px] text-brand-light">
                {isBookmarked ? 'Unsave' : 'Save'}
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <Divider className="my-1 bg-brand-border-secondary" />

          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleReport}
          >
            <HStack className="flex-1 items-center" space="lg">
              <Flag size={22} color="brand-red" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-brand-red">
                Report
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}
