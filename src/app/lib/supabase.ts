import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const SUPABASE_URL = `https://${projectId}.supabase.co`;

export const supabase = createClient(SUPABASE_URL, publicAnonKey, {
  realtime: {
    heartbeatIntervalMs: 15_000,
    reconnectAfterMs: () => 5_000,
    timeout: 20_000,
    // Increase max channel messages so cursor + block broadcasts at 30fps
    // don't get dropped by client-side rate limiting
    params: { eventsPerSecond: 60 },
  },
});

// CRITICAL: As of Supabase v2.108, broadcast/presence channels require explicit
// authentication — without this, channel.send() silently fails on subscribe.
// We're using the anon key for an open multiplayer canvas.
supabase.realtime.setAuth(publicAnonKey).catch((err) => {
  console.warn("[supabase] realtime.setAuth failed:", err);
});
