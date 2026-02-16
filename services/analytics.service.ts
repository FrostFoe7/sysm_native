import { supabase, getCachedUserId } from "./supabase";
import type { AnalyticsEventType } from "@/types/types";

let sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function resetSession(): void {
  sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function track(
  eventType: AnalyticsEventType,
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  try {
    const userId = await getCachedUserId();

    await supabase.from("analytics_events").insert({
      event_type: eventType,
      user_id: userId,
      properties,
      session_id: sessionId,
    });
  } catch (error) {
    // Analytics should never break the app — log and move on
    console.warn("Analytics tracking failed:", error);
  }
}

async function trackEngagement(params: {
  contentType: "thread" | "reel";
  contentId: string;
  signalType: string;
  value?: number;
}): Promise<void> {
  try {
    const userId = await getCachedUserId();

    await supabase.from("feed_events").insert({
      user_id: userId,
      content_type: params.contentType,
      content_id: params.contentId,
      signal_type: params.signalType,
      value: params.value ?? 1,
    });
  } catch (error) {
    console.warn("Engagement tracking failed:", error);
  }
}

export const analytics = {
  track,
  trackEngagement,
  resetSession,
  /** Shorthand for trackEngagement — used by overlay menus */
  recordSignal: (
    contentType: "thread" | "reel",
    contentId: string,
    signalType: string,
  ) => trackEngagement({ contentType, contentId, signalType }),
};
