// components/ConfirmationDialog.tsx

import React from "react";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog isOpen={isOpen} onClose={onClose}>
      <AlertDialogBackdrop className="bg-black/60" />
      <AlertDialogContent className="border-brand-border-secondary bg-brand-elevated">
        <AlertDialogHeader>
          <Heading size="md" className="text-brand-light">
            {title}
          </Heading>
        </AlertDialogHeader>
        <AlertDialogBody className="mb-4 mt-2">
          <Text className="text-[15px] text-brand-muted-alt">
            {description}
          </Text>
        </AlertDialogBody>
        <AlertDialogFooter className="gap-3">
          <Button
            variant="outline"
            action="secondary"
            onPress={onClose}
            className="border-brand-border-secondary"
          >
            <ButtonText className="text-brand-light">{cancelLabel}</ButtonText>
          </Button>
          <Button
            action={isDestructive ? "negative" : "primary"}
            onPress={() => {
              onConfirm();
              onClose();
            }}
            className={isDestructive ? "bg-brand-red" : "bg-brand-blue"}
          >
            <ButtonText className="text-white">{confirmLabel}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
