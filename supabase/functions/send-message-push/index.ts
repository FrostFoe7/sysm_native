// supabase/functions/send-message-push/index.ts
// Edge Function: triggered by database webhook on message INSERT.
// Sends push notifications to all eligible recipients via Expo Push API.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    conversation_id: string;
    sender_id: string;
    type: string;
    content: string;
    audio_url?: string;
    audio_duration_ms?: number;
    is_encrypted?: boolean;
    created_at: string;
  };
  old_record: null;
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only process message inserts
    if (payload.type !== "INSERT" || payload.table !== "messages") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
      });
    }

    const message = payload.record;

    // Skip system messages
    if (message.type === "system") {
      return new Response(JSON.stringify({ ok: true, skipped: "system" }), {
        status: 200,
      });
    }

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get push targets (all participants except sender, not muted, with active tokens)
    const { data: targets, error: targetError } = await supabase.rpc(
      "get_push_targets",
      {
        p_conversation_id: message.conversation_id,
        p_sender_id: message.sender_id,
      },
    );

    if (targetError || !targets || targets.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: "no_targets",
          error: targetError?.message,
        }),
        { status: 200 },
      );
    }

    // Get sender info
    const { data: senderInfo } = await supabase.rpc("get_sender_info", {
      p_user_id: message.sender_id,
    });

    // get_sender_info returns a single-row result set
    const sender = Array.isArray(senderInfo) ? senderInfo[0] : senderInfo;
    const senderName = sender?.display_name ?? "Someone";

    // Get conversation info for group name
    const { data: conv } = await supabase
      .from("conversations")
      .select("type, name")
      .eq("id", message.conversation_id)
      .single();

    const isGroup = conv?.type === "group";
    const groupName = conv?.name ?? "Group";

    // Build message preview
    let messagePreview: string;
    if (message.is_encrypted) {
      messagePreview = "🔒 Encrypted message";
    } else if (message.type === "voice_note") {
      messagePreview = "🎤 Voice message";
    } else if (message.type === "image") {
      messagePreview = "📷 Photo";
    } else if (message.type === "video") {
      messagePreview = "🎬 Video";
    } else if (message.type === "reel_share") {
      messagePreview = "🎬 Shared a reel";
    } else if (message.type === "thread_share") {
      messagePreview = "📝 Shared a thread";
    } else {
      messagePreview =
        message.content.length > 100
          ? message.content.substring(0, 100) + "..."
          : message.content;
    }

    // Build Expo push messages
    const pushMessages = targets
      .filter((t: any) => t.expo_push_token?.startsWith("ExponentPushToken["))
      .map((target: any) => ({
        to: target.expo_push_token,
        title: isGroup ? groupName : senderName,
        body: isGroup ? `${senderName}: ${messagePreview}` : messagePreview,
        sound: "default",
        badge: 1,
        channelId: "messages",
        data: {
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          senderName,
          messagePreview,
          type: isGroup ? "group_message" : "message",
        },
        categoryId: "message",
        priority: "high",
      }));

    if (pushMessages.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no_valid_tokens" }),
        { status: 200 },
      );
    }

    // Send via Expo Push API (batched)
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < pushMessages.length; i += batchSize) {
      const batch = pushMessages.slice(i, i + batchSize);

      const pushResponse = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      const pushResult = await pushResponse.json();
      results.push(pushResult);

      // Handle invalid tokens — deactivate them
      if (pushResult.data) {
        for (let j = 0; j < pushResult.data.length; j++) {
          const ticket = pushResult.data[j];
          if (
            ticket.status === "error" &&
            ticket.details?.error === "DeviceNotRegistered"
          ) {
            const token = batch[j].to;
            await supabase
              .from("user_devices")
              .update({ is_active: false })
              .eq("expo_push_token", token);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent: pushMessages.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
