// app/(tabs)/new.tsx

import React, { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { Composer } from "@/components/Composer";
import { ScreenLayout } from "@/components/ScreenLayout";
import { ThreadService } from "@/services/thread.service";

export default function NewThreadScreen() {
  const router = useRouter();
  const [key, setKey] = useState(0);

  const handleSubmit = useCallback(
    async (content: string) => {
      const newThread = await ThreadService.createThread(content);
      // Reset composer and navigate to the new thread
      setKey((k) => k + 1);
      if (newThread?.id) {
        router.push(`/thread/${newThread.id}`);
      } else {
        router.navigate("/(tabs)");
      }
    },
    [router],
  );

  return (
    <ScreenLayout edges={["top", "bottom"]}>
      <Composer key={key} onSubmit={handleSubmit} autoFocus={false} />
    </ScreenLayout>
  );
}
