// components/EditThreadModal.tsx

import React, { useCallback } from "react";
import { View, Modal } from "react-native";
import { Composer } from "./Composer";
import { ThreadService } from "@/services/thread.service";
import type { ThreadWithAuthor, MediaItem } from "@/types/types";
import { useAppToast } from "./AppToast";
import { TOAST_ICONS } from "@/constants/icons";

interface EditThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: ThreadWithAuthor | null;
  onThreadUpdated?: (updatedThread: ThreadWithAuthor) => void;
}

export function EditThreadModal({
  isOpen,
  onClose,
  thread,
  onThreadUpdated,
}: EditThreadModalProps) {
  const { showToast } = useAppToast();

  const handleSubmit = useCallback(
    async (content: string, media?: MediaItem[]) => {
      if (!thread) return;
      try {
        const updated = await ThreadService.editThread(thread.id, content, media);
        onThreadUpdated?.(updated);
        showToast("Thread updated", TOAST_ICONS.success);
        onClose();
      } catch (err) {
        console.error("Failed to edit thread:", err);
        showToast("Failed to update thread", TOAST_ICONS.reported, "brand-red");
      }
    },
    [thread, onThreadUpdated, showToast, onClose],
  );

  if (!thread) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-brand-dark">
        <Composer
          onSubmit={handleSubmit}
          initialContent={thread.content}
          initialMedia={thread.media}
          submitLabel="Save"
          headerTitle="Edit thread"
          autoFocus
        />
      </View>
    </Modal>
  );
}
