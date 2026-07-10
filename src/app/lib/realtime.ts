// Singleton Realtime channel manager.
// Survives React StrictMode double-mount and Vite HMR by living at module scope.
//
// Why: the previous approach created/destroyed the channel inside useEffect,
// which during StrictMode dev or HMR would close the subscription and never
// reconnect. This module keeps exactly ONE channel alive per browser tab.

import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";
import type { Block } from "./api";

type CursorPayload = { x: number; y: number; name: string; color: string };
type Listener = {
  onBlockUpdate?:    (b: Block)             => void;
  onBlockDelete?:    (id: string)           => void;
  onPresenceSync?:   (state: Record<string, CursorPayload>) => void;
  onStatusChange?:   (s: "connecting" | "connected" | "error") => void;
};

const TOPIC = "kollektiv-canvas";

// ── Module-level singleton state ─────────────────────────────
let channel: ReturnType<typeof supabase.channel> | null = null;
let isSubscribed = false;
let status: "connecting" | "connected" | "error" = "connecting";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let myKey: string =
  (typeof sessionStorage !== "undefined" && sessionStorage.getItem("kollektiv_presence_key")) ||
  uuidv4();
if (typeof sessionStorage !== "undefined") {
  sessionStorage.setItem("kollektiv_presence_key", myKey);
}

const listeners = new Set<Listener>();
const pendingBroadcasts: Array<{ event: string; payload: object }> = [];
// Last-known cursor payload — re-sent in heartbeat so idle users stay visible
let lastCursor: CursorPayload | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ──────────────────────────────────────────────────
function setStatus(next: typeof status) {
  if (status !== next) {
    status = next;
    listeners.forEach((l) => l.onStatusChange?.(next));
  }
}

function syncPresence() {
  if (!channel) return;
  const raw = channel.presenceState();
  const state: Record<string, CursorPayload> = {};
  for (const id in raw) {
    if (id === myKey) continue;
    // @ts-ignore
    const p = raw[id][0];
    if (p) state[id] = p as CursorPayload;
  }
  listeners.forEach((l) => l.onPresenceSync?.(state));
}

function buildChannel() {
  console.log("[realtime] building channel for", myKey);
  const ch = supabase.channel(TOPIC, {
    config: {
      broadcast: { self: false, ack: false },
      presence:  { key: myKey },
    },
  });

  ch.on("presence", { event: "sync" },  syncPresence)
    .on("presence", { event: "join" },  syncPresence)
    .on("presence", { event: "leave" }, syncPresence)
    .on("broadcast", { event: "block_update" }, ({ payload }) => {
      if (!payload?.id) return;
      listeners.forEach((l) => l.onBlockUpdate?.(payload as Block));
    })
    .on("broadcast", { event: "block_delete" }, ({ payload }) => {
      if (!payload?.id) return;
      listeners.forEach((l) => l.onBlockDelete?.(payload.id as string));
    })
    .subscribe(async (s, err) => {
      console.log("[realtime] status:", s, err || "");
      if (s === "SUBSCRIBED") {
        isSubscribed = true;
        setStatus("connected");
        if (lastCursor) {
          await ch.track(lastCursor).catch(() => {});
        } else {
          await ch.track({ x: -9999, y: -9999, name: "", color: "#000" }).catch(() => {});
        }
        // Flush queue
        const queued = pendingBroadcasts.splice(0);
        for (const m of queued) ch.send({ type: "broadcast", event: m.event, payload: m.payload });
        syncPresence();
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
        isSubscribed = false;
        setStatus("error");
        scheduleReconnect();
      } else if (s === "CLOSED") {
        isSubscribed = false;
        setStatus("connecting");
        scheduleReconnect();
      }
    });

  return ch;
}

function scheduleReconnect() {
  if (reconnectTimer) return; // already scheduled
  console.log("[realtime] scheduling reconnect in 2s");
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (isSubscribed) return; // already recovered
    if (channel) {
      try { await supabase.removeChannel(channel); } catch {}
      channel = null;
    }
    channel = buildChannel();
  }, 2_000);
}

function ensureHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    if (isSubscribed && channel && lastCursor) {
      channel.track(lastCursor).catch(() => {});
    }
  }, 25_000);
}

// ── Public API ───────────────────────────────────────────────

/** Subscribe to realtime events. Returns an unsubscribe function. */
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  // Build channel lazily on first subscriber
  if (!channel) channel = buildChannel();
  ensureHeartbeat();

  // Immediately give the new listener the current state
  listener.onStatusChange?.(status);
  if (channel && isSubscribed) syncPresence();

  return () => {
    listeners.delete(listener);
    // We DO NOT tear down the channel here — keep it alive across HMR/StrictMode.
    // The channel will be reused by the next subscriber.
  };
}

/** Broadcast a block update to all other clients. */
export function broadcastBlockUpdate(block: Block) {
  if (!channel) channel = buildChannel();
  if (isSubscribed) {
    channel.send({ type: "broadcast", event: "block_update", payload: block });
  } else {
    pendingBroadcasts.push({ event: "block_update", payload: block });
  }
}

/** Broadcast a block deletion to all other clients. */
export function broadcastBlockDelete(id: string) {
  if (!channel) channel = buildChannel();
  if (isSubscribed) {
    channel.send({ type: "broadcast", event: "block_delete", payload: { id } });
  } else {
    pendingBroadcasts.push({ event: "block_delete", payload: { id } });
  }
}

/** Push the user's cursor position to other clients. */
export function trackCursor(payload: CursorPayload) {
  lastCursor = payload;
  if (channel && isSubscribed) channel.track(payload).catch(() => {});
}

/** Get the unique presence key for this browser tab. */
export function getPresenceKey() {
  return myKey;
}

/** Get the current connection status. */
export function getRealtimeStatus() {
  return status;
}
