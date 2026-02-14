// components/ThreadOverflowMenu.tsx

import React, { useCallback, useState } from 'react';
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
import { useAppToast, TOAST_ICONS } from '@/components/AppToast';
import {
  muteUser,
  unmuteUser,
  isUserMuted,
  hideThread,
  deleteThread as deleteThreadAction,
} from '@/db/selectors';
import { CURRENT_USER_ID } from '@/db/db';
import type { ThreadWithAuthor } from '@/db/db';
import {
  VolumeX,
  Volume2,
  EyeOff,
  Flag,
  Trash2,
  UserMinus,
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
  const isOwnThread = thread?.user_id === CURRENT_USER_ID;
  const muted = thread ? isUserMuted(thread.user_id) : false;
  const { showToast } = useAppToast();

  const handleMuteToggle = useCallback(() => {
    if (!thread) return;
    if (muted) {
      unmuteUser(thread.user_id);
      showToast(`Unmuted @${thread.author.username}`, TOAST_ICONS.unmuted);
    } else {
      muteUser(thread.user_id);
      onUserMuted?.(thread.user_id);
      showToast(`Muted @${thread.author.username}`, TOAST_ICONS.muted);
    }
    onClose();
  }, [thread, muted, onClose, onUserMuted, showToast]);

  const handleHide = useCallback(() => {
    if (!thread) return;
    hideThread(thread.id);
    onThreadHidden?.(thread.id);
    onClose();
    showToast('Thread hidden', TOAST_ICONS.hidden);
  }, [thread, onClose, onThreadHidden, showToast]);

  const handleDelete = useCallback(() => {
    if (!thread) return;
    onClose();
    const doDelete = () => {
      deleteThreadAction(thread.id);
      onThreadDeleted?.(thread.id);
      showToast('Thread deleted', TOAST_ICONS.deleted, '#ff3040');
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
    onClose();
    showToast('Thread reported', TOAST_ICONS.reported, '#ff3040');
  }, [onClose, showToast]);

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
      <ActionsheetContent className="bg-[#181818] border-t border-[#2a2a2a] rounded-t-3xl pb-8">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator className="bg-[#555555]" />
        </ActionsheetDragIndicatorWrapper>

        <VStack className="w-full mt-2">
          {/* Thread info header */}
          <Text
            className="text-[#777777] text-[13px] text-center mb-3 px-6"
            numberOfLines={1}
            style={{ overflow: 'hidden' }}
          >
            @{thread.author.username}&apos;s thread
          </Text>
          <Divider className="bg-[#2a2a2a] mb-1" />

          {/* Copy link */}
          <ActionsheetItem
            className="py-4 px-5 active:bg-white/5 rounded-xl"
            onPress={handleCopyLink}
          >
            <HStack className="items-center flex-1" space="lg">
              <Link2 size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[#f3f5f7] text-[16px]">
                Copy link
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          {/* Hide thread */}
          <ActionsheetItem
            className="py-4 px-5 active:bg-white/5 rounded-xl"
            onPress={handleHide}
          >
            <HStack className="items-center flex-1" space="lg">
              <EyeOff size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[#f3f5f7] text-[16px]">
                Hide
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          {!isOwnThread && (
            <>
              {/* Mute/Unmute user */}
              <ActionsheetItem
                className="py-4 px-5 active:bg-white/5 rounded-xl"
                onPress={handleMuteToggle}
              >
                <HStack className="items-center flex-1" space="lg">
                  {muted ? (
                    <Volume2 size={22} color="#f3f5f7" strokeWidth={1.8} />
                  ) : (
                    <VolumeX size={22} color="#f3f5f7" strokeWidth={1.8} />
                  )}
                  <ActionsheetItemText className="text-[#f3f5f7] text-[16px]" numberOfLines={1}>
                    {muted ? `Unmute @${thread.author.username}` : `Mute @${thread.author.username}`}
                  </ActionsheetItemText>
                </HStack>
              </ActionsheetItem>

              <Divider className="bg-[#2a2a2a] my-1" />

              {/* Report */}
              <ActionsheetItem
                className="py-4 px-5 active:bg-white/5 rounded-xl"
                onPress={handleReport}
              >
                <HStack className="items-center flex-1" space="lg">
                  <Flag size={22} color="#ff3040" strokeWidth={1.8} />
                  <ActionsheetItemText className="text-[#ff3040] text-[16px]">
                    Report
                  </ActionsheetItemText>
                </HStack>
              </ActionsheetItem>
            </>
          )}

          {isOwnThread && (
            <>
              <Divider className="bg-[#2a2a2a] my-1" />

              {/* Delete thread */}
              <ActionsheetItem
                className="py-4 px-5 active:bg-white/5 rounded-xl"
                onPress={handleDelete}
              >
                <HStack className="items-center flex-1" space="lg">
                  <Trash2 size={22} color="#ff3040" strokeWidth={1.8} />
                  <ActionsheetItemText className="text-[#ff3040] text-[16px]">
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
