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
import { Link2, Share2, MessageSquare, Bookmark, Flag } from 'lucide-react-native';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
}

export function ShareSheet({ isOpen, onClose, threadId }: ShareSheetProps) {
  const handleCopyLink = useCallback(() => {
    const url = `https://threads.net/t/${threadId}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onClose();
  }, [threadId, onClose]);

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
  }, [onClose]);

  const handleBookmark = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleReport = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop className="bg-black/60" />
      <ActionsheetContent className="bg-[#181818] border-t border-[#2a2a2a] rounded-t-3xl pb-8">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator className="bg-[#555555]" />
        </ActionsheetDragIndicatorWrapper>

        <VStack className="w-full mt-2">
          <Text className="text-[#f3f5f7] text-[16px] font-semibold text-center mb-3">
            Share
          </Text>
          <Divider className="bg-[#2a2a2a] mb-1" />

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

          <ActionsheetItem
            className="py-4 px-5 active:bg-white/5 rounded-xl"
            onPress={handleShareExternal}
          >
            <HStack className="items-center flex-1" space="lg">
              <Share2 size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[#f3f5f7] text-[16px]">
                Share via...
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            className="py-4 px-5 active:bg-white/5 rounded-xl"
            onPress={handleSendVia}
          >
            <HStack className="items-center flex-1" space="lg">
              <MessageSquare size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[#f3f5f7] text-[16px]">
                Send via Direct Message
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            className="py-4 px-5 active:bg-white/5 rounded-xl"
            onPress={handleBookmark}
          >
            <HStack className="items-center flex-1" space="lg">
              <Bookmark size={22} color="#f3f5f7" strokeWidth={1.8} />
              <ActionsheetItemText className="text-[#f3f5f7] text-[16px]">
                Save
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <Divider className="bg-[#2a2a2a] my-1" />

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
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}
