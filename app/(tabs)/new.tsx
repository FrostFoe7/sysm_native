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
      await ThreadService.createThread(content);
      // Reset composer and navigate to home
      setKey((k) => k + 1);
      router.navigate("/(tabs)");
    },
    [router],
  );

  return (
    <ScreenLayout edges={["top", "bottom"]}>
      <Composer key={key} onSubmit={handleSubmit} autoFocus={false} />
    </ScreenLayout>
  );
}
