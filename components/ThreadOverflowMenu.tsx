// components/ThreadOverflowMenu.tsx

import React, { useCallback } from 'react';
import { Platform, Alert } from 'react-native';
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
import { UserService } from '@/services/user.service';
import { ThreadService } from '@/services/thread.service';
import { useAuthStore } from '@/store/useAuthStore';
import { analytics } from '@/services/analytics.service';
import type { ThreadWithAuthor } from '@/types/types';
import {
  VolumeX,
  Volume2,
  EyeOff,
  Flag,
  Trash2,
  Link2,
} from 'lucide-react-native';

interface ThreadOverflowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  thread: ThreadWithAuthor | null;
  onThreadDeleted?: (threadId: string) => void;
  onThreadHidden?: (threadId: string) => void;
  onUserMuted?: (userId: string) => void;
}

export function ThreadOverflowMenu({
  isOpen,
  onClose,
  thread,
  onThreadDeleted,
  onThreadHidden,
  onUserMuted,
}: ThreadOverflowMenuProps) {
  const currentUserId = useAuthStore((s) => s.userId);
  const isOwnThread = thread?.user_id === currentUserId;
  const [muted, setMuted] = React.useState(false);
  const { showToast } = useAppToast();

  React.useEffect(() => {
    if (thread) {
      UserService.isUserMuted(thread.user_id).then(setMuted).catch(() => {});
    }
  }, [thread]);

  const handleMuteToggle = useCallback(() => {
    if (!thread) return;
    if (muted) {
      UserService.unmuteUser(thread.user_id);
      showToast(`Unmuted @${thread.author.username}`, TOAST_ICONS.unmuted);
    } else {
      UserService.muteUser(thread.user_id);
      analytics.recordSignal('thread', thread.id, 'mute');
      onUserMuted?.(thread.user_id);
      showToast(`Muted @${thread.author.username}`, TOAST_ICONS.muted);
    }
    onClose();
  }, [thread, muted, onClose, onUserMuted, showToast]);

  const handleHide = useCallback(() => {
    if (!thread) return;
    ThreadService.hideThread(thread.id);
    analytics.recordSignal('thread', thread.id, 'hide');
    onThreadHidden?.(thread.id);
    onClose();
    showToast('Thread hidden', TOAST_ICONS.hidden);
  }, [thread, onClose, onThreadHidden, showToast]);

  const handleDelete = useCallback(() => {
    if (!thread) return;
    onClose();
    const doDelete = () => {
      ThreadService.deleteThread(thread.id);
      onThreadDeleted?.(thread.id);
      showToast('Thread deleted', TOAST_ICONS.deleted, 'brand-red');
    };
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Delete this thread? This action cannot be undone.');
      if (confirmed) doDelete();
    } else {
      Alert.alert(
        'Delete thread?',
        'This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  }, [thread, onClose, onThreadDeleted, showToast]);

  const handleReport = useCallback(() => {
    if (thread) {
      analytics.recordSignal('thread', thread.id, 'report');
    }
    onClose();
    showToast('Thread reported — we\'ll review this content', TOAST_ICONS.reported, 'brand-red');
  }, [thread, onClose, showToast]);

  const handleCopyLink = useCallback(() => {
    if (!thread) return;
    const url = `https://threads.net/t/${thread.id}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onClose();
    showToast('Link copied', TOAST_ICONS.copied);
  }, [thread, onClose, showToast]);

  if (!thread) return null;

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop className="bg-black/60" />
      <ActionsheetContent className="rounded-t-3xl border-t border-brand-border-secondary bg-brand-elevated pb-8">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator className="bg-brand-muted" />
        </ActionsheetDragIndicatorWrapper>

        <VStack className="mt-2 w-full">
          {/* Thread info header */}
          <Text
            className="mb-3 px-6 text-center text-[13px] text-brand-muted-alt"
            numberOfLines={1}
            style={{ overflow: 'hidden' }}
          >
            @{thread.author.username}&apos;s thread
          </Text>
          <Divider className="mb-1 bg-brand-border-secondary" />

          {/* Copy link */}
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

          {/* Hide thread */}
          <ActionsheetItem
            className="rounded-xl px-5 py-4 active:bg-white/5"
            onPress={handleHide}
          >
            <HStack className="flex-1 items-center" space="lg">
              <EyeOff size={22} color="brand-light" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[16px] text-brand-light">
                Hide
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          {!isOwnThread && (
            <>
              {/* Mute/Unmute user */}
              <ActionsheetItem
                className="rounded-xl px-5 py-4 active:bg-white/5"
                onPress={handleMuteToggle}
              >
                <HStack className="flex-1 items-center" space="lg">
                  {muted ? (
                    <Volume2 size={22} color="brand-light" strokeWidth={1.8} />
                  ) : (
                    <VolumeX size={22} color="brand-light" strokeWidth={1.8} />
                  )}
                  <ActionsheetItemText className="text-[16px] text-brand-light" numberOfLines={1}>
                    {muted ? `Unmute @${thread.author.username}` : `Mute @${thread.author.username}`}
                  </ActionsheetItemText>
                </HStack>
              </ActionsheetItem>

              <Divider className="my-1 bg-brand-border-secondary" />

              {/* Report */}
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
            </>
          )}

          {isOwnThread && (
            <>
              <Divider className="my-1 bg-brand-border-secondary" />

              {/* Delete thread */}
              <ActionsheetItem
                className="rounded-xl px-5 py-4 active:bg-white/5"
                onPress={handleDelete}
              >
                <HStack className="flex-1 items-center" space="lg">
                  <Trash2 size={22} color="brand-red" strokeWidth={1.8} />
                  <ActionsheetItemText className="text-[16px] text-brand-red">
                    Delete
                  </ActionsheetItemText>
                </HStack>
              </ActionsheetItem>
            </>
          )}
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}
