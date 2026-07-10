import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { getBlocks, createBlock, updateBlock, deleteBlock, Block, BLOCK_DEFAULTS } from "../lib/api";
import {
  subscribeRealtime, broadcastBlockUpdate, broadcastBlockDelete,
  trackCursor, getPresenceKey,
} from "../lib/realtime";
import { v4 as uuidv4 } from "uuid";
import { Layers2, Users, ZoomIn, ZoomOut, Maximize2, Hand, X } from "lucide-react";
import { toast } from "sonner";
import { Toolbar } from "./Toolbar";
import { BlockItem } from "./BlockItem";
import { StylePanel } from "./StylePanel";
import { PublishModal } from "./PublishModal";
import { ExportModal } from "./ExportModal";

const CURSOR_COLORS = ["#ffe800", "#ff0054", "#0066ff", "#00f0b5"];

export default function CanvasArea() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; color: string } | null>(null);

  const [scale, setScale]   = useState(1);
  const [pan, setPan]       = useState({ x: 0, y: 0 });
  const isDragging          = useRef(false);
  const isSpaceDown         = useRef(false);
  const [isPanMode, setIsPanMode] = useState(false);

  const [blocks, setBlocks]         = useState<Record<string, Block>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursors, setCursors]       = useState<Record<string, { x: number; y: number; name: string; color: string }>>({});
  const [onlineCount, setOnlineCount]       = useState(1);
  const [publishingBlockId, setPublishingBlockId] = useState<string | null>(null);
  const [exportingBlockId,  setExportingBlockId]  = useState<string | null>(null);

  const containerRef    = useRef<HTMLDivElement>(null);
  // Always-fresh blocks for async/event handlers (avoids stale closure)
  const blocksRef       = useRef<Record<string, Block>>({});
  blocksRef.current     = blocks;
  // Always-fresh pan + scale for cursor tracking inside event handlers
  const panRef          = useRef({ x: 0, y: 0 });
  const scaleRef        = useRef(1);
  panRef.current        = pan;
  scaleRef.current      = scale;
  // Always-fresh user ref
  const userRef         = useRef<{ name: string; color: string } | null>(null);
  userRef.current       = user;
  // Always-fresh selectedId for handleWheel (must be declared BEFORE assignment)
  const selectedIdRef   = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  // Cursor throttle — max one presence update every 50 ms (20 fps)
  const lastTrackMs     = useRef(0);
  // Connection status shown in the UI
  const [connStatus, setConnStatus] = useState<"connecting" | "connected" | "error">("connecting");
  // Per-block broadcast throttle for position-only updates (30fps cap)
  const lastPosBroadcast = useRef<Record<string, number>>({});
  // Per-block debounce timer for DB persistence (only write 250ms after last update)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    const name = sessionStorage.getItem("kollektiv_user");
    if (!name) { navigate("/"); return; }

    const me = {
      name,
      color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
    };
    setUser(me);

    getBlocks()
      .then((data) => {
        const map: Record<string, Block> = {};
        data.forEach((b) => (map[b.id] = b));
        blocksRef.current = map;
        setBlocks(map);
      })
      .catch(() => toast.error("Failed to load canvas"));

    // Subscribe to the singleton realtime channel (survives HMR + StrictMode)
    const myKey = getPresenceKey();
    console.log("[kollektiv] subscribing as", me.name, "key:", myKey);
    const unsub = subscribeRealtime({
      onBlockUpdate: (incoming) => {
        console.log("[kollektiv] ← block_update", incoming.id, "from remote");
        const prev = blocksRef.current[incoming.id];
        // If a fork just became merge-proposed, notify the original creator
        if (
          incoming.isMergeProposed &&
          !prev?.isMergeProposed &&
          incoming.forkedFrom &&
          blocksRef.current[incoming.forkedFrom]?.creator === userRef.current?.name
        ) {
          toast(`${incoming.creator} proposed a merge — select your component to review`, {
            duration: 6000,
          });
        }
        blocksRef.current = { ...blocksRef.current, [incoming.id]: incoming };
        setBlocks((prev) => ({ ...prev, [incoming.id]: incoming }));
      },
      onBlockDelete: (id) => {
        console.log("[kollektiv] ← block_delete", id);
        const next = { ...blocksRef.current };
        delete next[id];
        blocksRef.current = next;
        setBlocks(next);
        setSelectedId((s) => (s === id ? null : s));
      },
      onPresenceSync: (state) => {
        setCursors(state);
        // Count includes self, so +1 (we're not in `state`)
        setOnlineCount(Object.keys(state).length + 1);
      },
      onStatusChange: (s) => setConnStatus(s),
    });
    // Send initial cursor presence so other users see us immediately
    trackCursor({ x: -9999, y: -9999, name: me.name, color: me.color });

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.code === "Space")   { e.preventDefault(); isSpaceDown.current = true; setIsPanMode(true); }
      if (e.code === "Escape")  { setScale(1); setPan({ x: 0, y: 0 }); setSelectedId(null); }
      if (e.code === "Delete" || e.code === "Backspace") {
        setSelectedId((id) => { if (id) handleDeleteBlock(id); return null; });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") { isSpaceDown.current = false; setIsPanMode(false); isDragging.current = false; }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      console.log("[kollektiv] cleanup: unsubscribing listener (channel stays alive)");
      unsub(); // detaches our handlers but keeps the singleton channel alive
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      // Flush any pending DB saves immediately on unmount
      Object.entries(saveTimers.current).forEach(([bid, timer]) => {
        clearTimeout(timer);
        const b = blocksRef.current[bid];
        if (b) updateBlock(bid, b).catch(() => {});
      });
      saveTimers.current = {};
    };
  }, [navigate]);

  // ── Canvas pointer ─────────────────────────────────────────
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      setPan((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }

    // Throttle presence updates to ≤20 fps — the biggest cause of WS floods
    const now = Date.now();
    if (now - lastTrackMs.current < 50) return;
    lastTrackMs.current = now;

    const me = userRef.current;
    if (!me || !containerRef.current) return;

    const p = panRef.current;
    const s = scaleRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const wx = (e.clientX - rect.left - p.x - rect.width  / 2) / s;
    const wy = (e.clientY - rect.top  - p.y - rect.height / 2) / s;
    trackCursor({ x: wx, y: wy, name: me.name, color: me.color });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && isSpaceDown.current)) {
      e.preventDefault();
      isDragging.current = true;
    }
    if (e.button === 0 && !isSpaceDown.current) setSelectedId(null);
  };

  const handlePointerUp   = () => { isDragging.current = false; };

  // Per-block scroll accumulator so a single scroll tick doesn't jump zIndex
  // by 100 — we batch fractional deltas and bump zIndex one step per ~40px.
  const zScrollAccum = useRef<Record<string, number>>({});

  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl/Cmd + scroll → zoom (highest priority — always works)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale((s) => Math.min(5, Math.max(0.1, s - e.deltaY * 0.005)));
      return;
    }

    // Selected block + plain scroll → adjust its zIndex (layer depth)
    //   Scroll DOWN  (deltaY > 0) → zIndex DECREASES → block moves BEHIND others
    //   Scroll UP    (deltaY < 0) → zIndex INCREASES → block moves IN FRONT
    const sel = selectedIdRef.current;
    if (sel && blocksRef.current[sel]) {
      // Ownership: only the creator can change their own block's z-order
      const blk   = blocksRef.current[sel];
      const owner = !blk.creator || blk.creator === userRef.current?.name;
      if (!owner) return; // silently ignore — block belongs to someone else

      e.preventDefault();

      // Accumulate scroll delta; bump zIndex once we cross the threshold
      const acc  = (zScrollAccum.current[sel] ?? 0) + e.deltaY;
      const step = Math.trunc(acc / 40);
      zScrollAccum.current[sel] = acc - step * 40;

      if (step !== 0) {
        // Subtract: scroll down (positive deltaY) lowers zIndex
        const nextZ = Math.max(0, Math.min(9999, (blk.zIndex ?? 0) - step));
        if (nextZ !== blk.zIndex) handleUpdateBlock(sel, { zIndex: nextZ });
      }
      return;
    }

    // Nothing selected → plain scroll pans the canvas (original behaviour)
    setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  };

  // ── Block operations ───────────────────────────────────────
  // Thin wrapper that routes to the singleton realtime manager
  const broadcast = (event: "block_update" | "block_delete", payload: object) => {
    if (event === "block_update") broadcastBlockUpdate(payload as Block);
    else broadcastBlockDelete((payload as { id: string }).id);
  };

  const handleAddBlock = async (type: string, extra?: Record<string, unknown>) => {
    if (!user) return;
    const defaults = BLOCK_DEFAULTS[type];
    if (!defaults) return;

    const w = (extra as any)?.width  ?? defaults.width;
    const h = (extra as any)?.height ?? defaults.height;

    // Desired spawn point: center of the user's current viewport (in world coords)
    const wantX = -pan.x / scale - w / 2;
    const wantY = -pan.y / scale - h / 2;

    // Find a non-overlapping spot by walking outward in a spiral. We only test
    // against ROOT blocks (nested children don't conflict with new root blocks)
    // and reuse the same bounding-box overlap test.
    const overlaps = (x: number, y: number) => {
      for (const other of Object.values(blocksRef.current)) {
        if (other.parentId) continue;
        if (x + w  <= other.x)           continue;
        if (y + h  <= other.y)           continue;
        if (x      >= other.x + other.width)  continue;
        if (y      >= other.y + other.height) continue;
        return true; // bounding boxes intersect
      }
      return false;
    };

    let x = wantX, y = wantY;
    if (overlaps(x, y)) {
      // Square-spiral outward search — 12px step, up to 60 rings ≈ 720px radius
      const STEP = 12;
      outer: for (let ring = 1; ring <= 60; ring++) {
        const sideLen = ring * 2;
        // Walk the perimeter of the ring: right, down, left, up
        const moves: Array<[number, number]> = [];
        for (let i = 0; i < sideLen; i++) moves.push([ STEP, 0]); // top edge →
        for (let i = 0; i < sideLen; i++) moves.push([ 0,  STEP]); // right edge ↓
        for (let i = 0; i < sideLen; i++) moves.push([-STEP, 0]); // bottom edge ←
        for (let i = 0; i < sideLen; i++) moves.push([ 0, -STEP]); // left edge ↑
        // Start at top-left corner of ring
        let cx = wantX - ring * STEP;
        let cy = wantY - ring * STEP;
        for (const [dx, dy] of moves) {
          if (!overlaps(cx, cy)) { x = cx; y = cy; break outer; }
          cx += dx; cy += dy;
        }
      }
    }

    const block: Block = {
      ...defaults,
      ...(extra || {}),
      id: uuidv4(),
      x,
      y,
      isDraft: true,
      creator: user.name,
      creatorHandle: "",
      contributors: [],
      forkedFrom: null,
      isMergeProposed: false,
      parentId: null,
    } as Block;

    blocksRef.current = { ...blocksRef.current, [block.id]: block };
    setBlocks((prev) => ({ ...prev, [block.id]: block }));
    setSelectedId(block.id);
    broadcast("block_update", block);
    await createBlock(block).catch(() => toast.error("Failed to save block"));
  };

  const POSITION_KEYS = new Set(["x", "y", "width", "height"]);

  const handleUpdateBlock = (id: string, updates: Partial<Block>) => {
    const current = blocksRef.current[id];
    if (!current) return;
    // Ownership guard: only the creator can mutate a block. Others must fork.
    // (Note: incoming broadcasts skip this guard because they don't go through
    //  this function — they're applied directly in the realtime listener.)
    if (current.creator && user && current.creator !== user.name) {
      // Allow position-only updates? No — even drag should be blocked.
      return;
    }
    const updated = { ...current, ...updates };
    blocksRef.current = { ...blocksRef.current, [id]: updated };
    setBlocks((prev) => ({ ...prev, [id]: updated }));

    // Throttle position-only broadcasts (drag) to 30 fps; all other changes go out immediately
    const isPositionOnly = Object.keys(updates).every((k) => POSITION_KEYS.has(k));
    const now = Date.now();
    if (isPositionOnly) {
      const lastMs = lastPosBroadcast.current[id] ?? 0;
      if (now - lastMs < 33) {
        // Skip broadcast this frame but still schedule a DB save below
      } else {
        lastPosBroadcast.current[id] = now;
        broadcast("block_update", updated);
      }
    } else {
      broadcast("block_update", updated);
    }

    // Debounce DB writes — persist 250ms after the last update so drag
    // generates one save per gesture instead of hundreds per second
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      const latest = blocksRef.current[id];
      if (latest) updateBlock(id, latest).catch(() => {});
    }, 250);
  };

  const handleDeleteBlock = async (id: string) => {
    const target = blocksRef.current[id];
    if (!target) return;
    // Ownership guard: cannot delete someone else's draft
    if (target.isDraft && target.creator && target.creator !== user?.name) {
      toast.error(`Locked — ${target.creator} is building this`);
      return;
    }

    // Cascade: collect this block + all descendants so nested children aren't orphaned
    const all = blocksRef.current;
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of Object.values(all)) {
        if (b.parentId && toDelete.has(b.parentId) && !toDelete.has(b.id)) {
          toDelete.add(b.id);
          changed = true;
        }
      }
    }

    const next: Record<string, Block> = {};
    for (const [k, v] of Object.entries(all)) if (!toDelete.has(k)) next[k] = v;
    blocksRef.current = next;
    setBlocks(next);
    setSelectedId((s) => (s && toDelete.has(s) ? null : s));

    // Fire side effects for each removed block
    toDelete.forEach((delId) => {
      broadcast("block_delete", { id: delId });
      deleteBlock(delId).catch(() => {});
    });
    toast.success(toDelete.size > 1 ? `Deleted ${toDelete.size} blocks` : "Block deleted");
  };

  // ── Tree helpers ───────────────────────────────────────────────
  // Returns every descendant block (children, grandchildren, …) of `rootId`
  // in breadth-first order, reading from `blocksRef` (always fresh).
  const collectTree = (rootId: string): Block[] => {
    const map = blocksRef.current;
    const result: Block[] = [];
    const queue: string[] = [rootId];
    while (queue.length) {
      const parentId = queue.shift()!;
      for (const b of Object.values(map)) {
        if (b.parentId === parentId) {
          result.push(b);
          queue.push(b.id);
        }
      }
    }
    return result;
  };

  const handleFork = async (rootBlock: Block) => {
    if (!user) return;
    if (rootBlock.isDraft) {
      toast.error(rootBlock.creator === user.name
        ? "Publish your component before forking it"
        : `${rootBlock.creator} hasn't published this yet`);
      return;
    }

    // ── Collect the entire component tree ──────────────────────
    const descendants = collectTree(rootBlock.id);
    const totalElements = 1 + descendants.length;

    // Build an old-ID → new-ID map for every block in the tree so we can
    // correctly remap parentId references inside the fork.
    const idMap = new Map<string, string>();
    idMap.set(rootBlock.id, uuidv4());
    descendants.forEach((b) => idMap.set(b.id, uuidv4()));

    // ── Forked root (placed to the right of the original) ──────
    const forkedRoot: Block = {
      ...rootBlock,
      id: idMap.get(rootBlock.id)!,
      x: rootBlock.x + rootBlock.width + 48,
      y: rootBlock.y,
      forkedFrom: rootBlock.id,  // reference back to original
      creator: user.name,
      creatorHandle: "",
      contributors: [],
      isDraft: true,
      isMergeProposed: false,
      parentId: null,
    };

    // ── Forked children (same relative positions, parent IDs remapped) ──
    const forkedChildren: Block[] = descendants.map((child) => ({
      ...child,
      id: idMap.get(child.id)!,
      parentId: idMap.get(child.parentId!)!,  // remap to new parent
      creator: user.name,
      creatorHandle: "",
      contributors: [],
      isDraft: true,
      isMergeProposed: false,
      forkedFrom: undefined as unknown as string, // children are new; no forkedFrom
    }));

    const allForked = [forkedRoot, ...forkedChildren];

    // ── Write to local state + broadcast + persist ──────────────
    const patch: Record<string, Block> = {};
    allForked.forEach((b) => { patch[b.id] = b; });
    blocksRef.current = { ...blocksRef.current, ...patch };
    setBlocks((prev) => ({ ...prev, ...patch }));
    setSelectedId(forkedRoot.id);

    allForked.forEach((b) => broadcast("block_update", b));
    await Promise.all(allForked.map((b) => createBlock(b).catch(() => {})));

    toast.success(
      totalElements > 1
        ? `Forked component — ${totalElements} elements copied. Edit your copy!`
        : "Component forked — edit your copy!"
    );
  };

  const handlePublish = async (blockId: string, name: string, twitterUrl: string): Promise<string | null> => {
    // Re-check uniqueness on the server to catch races and spoofing attempts
    try {
      const remote = await getBlocks();
      const trimmed = name.trim().toLowerCase();
      const taken = remote.some(
        (b) =>
          !b.isDraft &&
          b.creator?.toLowerCase() === trimmed &&
          b.creator?.toLowerCase() !== user!.name.toLowerCase()
      );
      if (taken) {
        return "Name already taken. Please choose a unique name to protect your designs.";
      }
    } catch {
      // Server unreachable — fall through and let publish proceed
    }

    // ── Publish root + every descendant together ────────────────
    const descendants = collectTree(blockId);
    const publishUpdates = { isDraft: false, creator: name.trim(), creatorHandle: twitterUrl };

    // Root block
    handleUpdateBlock(blockId, publishUpdates);
    // All nested children — they become part of the published component
    descendants.forEach((child) => handleUpdateBlock(child.id, publishUpdates));

    setPublishingBlockId(null);
    const total = 1 + descendants.length;
    toast.success(
      total > 1
        ? `Published component — ${total} elements live on Kollektiv!`
        : "Published to Kollektiv!"
    );
    return null;
  };

  const handleProposeMerge = async (blockId: string) => {
    await handleUpdateBlock(blockId, { isMergeProposed: true });
    toast.success("Merge request sent!");
  };

  // ── Nesting: detect drop into container ───────────────────────
  // Recursively compute world (canvas-space) position of any block by walking
  // up parent chain — supports multi-level nesting.
  const worldPos = (id: string): { x: number; y: number } | null => {
    const map = blocksRef.current;
    const b = map[id];
    if (!b) return null;
    if (!b.parentId) return { x: b.x, y: b.y };
    const p = map[b.parentId];
    if (!p) return { x: b.x, y: b.y }; // orphan — treat as root
    const parentWorld = worldPos(p.id);
    if (!parentWorld) return { x: b.x, y: b.y };
    const pL = p.paddingL ?? p.paddingX ?? 0;
    const pT = p.paddingT ?? p.paddingY ?? 0;
    return { x: parentWorld.x + pL + b.x, y: parentWorld.y + pT + b.y };
  };

  // Check whether `candidate` is an ancestor of `id` (prevents nesting into own descendant)
  const isAncestor = (candidate: string, id: string): boolean => {
    const map = blocksRef.current;
    let cur: string | null = map[id]?.parentId ?? null;
    while (cur) {
      if (cur === candidate) return true;
      cur = map[cur]?.parentId ?? null;
    }
    return false;
  };

  const handleDragEnd = (blockId: string) => {
    const map = blocksRef.current; // ALWAYS fresh
    const block = map[blockId];
    if (!block) return;

    const world = worldPos(blockId);
    if (!world) return;
    const centerX = world.x + block.width / 2;
    const centerY = world.y + block.height / 2;

    // Find smallest-area container that contains the block's center
    // (smallest = innermost when containers overlap)
    let bestContainer: Block | null = null;
    let bestArea = Infinity;
    for (const c of Object.values(map)) {
      if (c.type !== "container") continue;
      if (c.id === blockId) continue;
      if (c.id === block.parentId) continue;
      if (isAncestor(blockId, c.id)) continue; // prevent dropping into own descendant

      const cWorld = worldPos(c.id);
      if (!cWorld) continue;
      if (centerX < cWorld.x || centerX > cWorld.x + c.width) continue;
      if (centerY < cWorld.y || centerY > cWorld.y + c.height) continue;

      const area = c.width * c.height;
      if (area < bestArea) { bestArea = area; bestContainer = c; }
    }

    if (bestContainer) {
      const cWorld = worldPos(bestContainer.id)!;
      const pL = bestContainer.paddingL ?? bestContainer.paddingX ?? 0;
      const pT = bestContainer.paddingT ?? bestContainer.paddingY ?? 0;
      handleUpdateBlock(blockId, {
        parentId: bestContainer.id,
        x: world.x - cWorld.x - pL,
        y: world.y - cWorld.y - pT,
      });
      toast.success("Nested inside container");
      return;
    }

    // No container under drop point → if had a parent, promote to root with world coords
    if (block.parentId) {
      handleUpdateBlock(blockId, {
        parentId: null,
        x: world.x,
        y: world.y,
      });
      toast.success("Promoted to root");
    }
  };

  const handleAcceptMerge = (originalId: string, incomingFork: Block) => {
    // Always read from ref — avoids stale React state closure
    const original = blocksRef.current[originalId];
    const fork     = blocksRef.current[incomingFork.id] ?? incomingFork;
    if (!original || !fork) return;

    // Merge all style/layout/content properties from the fork into the original.
    // We keep the original's identity & position; everything else comes from the fork.
    const KEEP = new Set([
      "id", "x", "y",
      "creator", "creatorHandle",
      "isDraft", "forkedFrom", "isMergeProposed",
      "parentId", "contributors",
    ]);
    const stylePatch: Partial<Block> = {};
    for (const key of Object.keys(fork) as Array<keyof Block>) {
      if (!KEEP.has(key)) (stylePatch as any)[key] = (fork as any)[key];
    }

    // Build updated contributors list (original's list + fork creator, deduped)
    const newContributors = [
      ...(original.contributors ?? []),
      { name: fork.creator, handle: fork.creatorHandle ?? "" },
    ].filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i);

    // ── Step 1: update the original block (guarded update OK — user owns it) ──
    handleUpdateBlock(originalId, { ...stylePatch, contributors: newContributors });

    // ── Step 2: reset the fork's merge-proposed flag ──────────────────────────
    // handleUpdateBlock() has an ownership guard that would silently abort this
    // because the fork's creator ≠ current user (original creator).
    // We bypass it by writing directly to blocksRef + broadcasting.
    const resetFork = { ...blocksRef.current[fork.id] ?? fork, isMergeProposed: false };
    blocksRef.current = { ...blocksRef.current, [fork.id]: resetFork };
    setBlocks((prev) => ({ ...prev, [fork.id]: resetFork }));
    broadcastBlockUpdate(resetFork);
    // Debounced DB save (same pattern as handleUpdateBlock)
    clearTimeout(saveTimers.current[fork.id]);
    saveTimers.current[fork.id] = setTimeout(() => {
      updateBlock(fork.id, blocksRef.current[fork.id] ?? resetFork).catch(() => {});
    }, 250);

    toast.success(`Merged! ${fork.creator}'s changes applied`);
  };

  // ── Nesting helpers (must be before early return) ────────────
  const childBlockMap = useMemo(() => {
    const map: Record<string, Block[]> = {};
    Object.values(blocks).forEach((b) => {
      if (b.parentId) map[b.parentId] = [...(map[b.parentId] || []), b];
    });
    return map;
  }, [blocks]);

  const rootBlocks = useMemo(
    () => Object.values(blocks).filter((b) => !b.parentId),
    [blocks]
  );

  // Set of block IDs that have at least one pending (proposed) merge request.
  // Used to show an indicator badge on the original so the creator knows to check.
  const blocksWithPendingMerge = useMemo(() => {
    const ids = new Set<string>();
    Object.values(blocks).forEach((b) => {
      if (b.isMergeProposed && b.forkedFrom) ids.add(b.forkedFrom);
    });
    return ids;
  }, [blocks]);

  if (!user) return null;

  // Recursive block renderer — plain function (not a hook) so it can recurse
  function renderBlockItem(block: Block, contained = false): React.ReactNode {
    return (
      <BlockItem
        key={block.id}
        block={block}
        isSelected={selectedId === block.id}
        currentUserName={user!.name}
        scale={scale}
        contained={contained}
        onSelect={() => setSelectedId(block.id)}
        onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
        onFork={() => handleFork(block)}
        onExport={!block.isDraft ? () => setExportingBlockId(block.id) : undefined}
        hasPendingMerge={blocksWithPendingMerge.has(block.id)}
        onDragEnd={() => handleDragEnd(block.id)}
        childBlocks={childBlockMap[block.id] || []}
        renderChild={(child) => renderBlockItem(child, true)}
      />
    );
  }

  const cursorClass = isPanMode
    ? isDragging.current ? "cursor-grabbing" : "cursor-grab"
    : "cursor-default";

  return (
    <div
      className="w-full h-full bg-[#f4f4f0] relative overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Grid background ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: `${50 * scale}px ${50 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className={`w-full h-full touch-none ${cursorClass}`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute top-1/2 left-1/2 w-0 h-0"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "0 0" }}
        >
          {rootBlocks.map((block) => renderBlockItem(block))}
        </div>
      </div>

      {/* ── Cursor overlay — screen-space, OUTSIDE the canvas scale transform ── */}
      {/* Rendering here keeps cursors fixed-size regardless of zoom level.      */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[60]">
        {Object.entries(cursors).map(([id, cursor]) => {
          // Skip the "parked" initial position broadcasted on join
          if (!cursor?.name || cursor.x < -9000 || cursor.y < -9000) return null;

          // Convert world coords → screen coords relative to the canvas container
          const cw = containerRef.current?.clientWidth  ?? window.innerWidth;
          const ch = containerRef.current?.clientHeight ?? window.innerHeight;
          const sx = cw / 2 + pan.x + cursor.x * scale;
          const sy = ch / 2 + pan.y + cursor.y * scale;
          const lightBg = cursor.color === "#ffe800" || cursor.color === "#00f0b5";

          return (
            <motion.div
              key={id}
              className="absolute pointer-events-none flex flex-col items-start"
              // Start at the correct position immediately (no flash at 0,0)
              initial={{ x: sx, y: sy }}
              animate={{ x: sx, y: sy }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.4 }}
            >
              <svg width="18" height="26" viewBox="0 0 18 26" fill="none">
                <path
                  d="M2 2L2 20L5 15.5L8 22.5L10.5 21.5L7.5 14.5L13 14.5L2 2Z"
                  fill={cursor.color}
                  stroke="#000"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                className="border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap leading-tight"
                style={{
                  backgroundColor: cursor.color,
                  color: lightBg ? "#000" : "#fff",
                  marginTop: "-2px",
                }}
              >
                {cursor.name}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b-4 border-black flex items-center justify-between px-4 z-50 pointer-events-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { sessionStorage.removeItem("kollektiv_user"); navigate("/"); }}
            className="w-9 h-9 bg-[#ffe800] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
            title="Back to home"
          >
            <Layers2 size={18} strokeWidth={3} />
          </button>
          <span className="text-lg font-black uppercase tracking-tight">Kollektiv</span>
          {isPanMode && (
            <div className="flex items-center gap-1.5 bg-[#ffe800] border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Hand size={12} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-widest">PAN MODE</span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={`flex items-center gap-1.5 border-2 border-black px-2.5 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase ${
            connStatus === "connected"   ? "bg-[#00f0b5]" :
            connStatus === "error"       ? "bg-[#ff0054] text-white" :
                                          "bg-[#ffe800]"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              connStatus === "connected" ? "bg-black" :
              connStatus === "error"     ? "bg-white" :
                                          "bg-black animate-pulse"
            }`} />
            {connStatus === "connected"   ? "LIVE" :
             connStatus === "error"       ? "DISCONNECTED" :
                                           "CONNECTING…"}
          </div>

          <div className="flex items-center gap-1.5 bg-[#00f0b5] border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Users size={12} strokeWidth={3} />
            <span className="text-[11px] font-black uppercase">{onlineCount} ONLINE</span>
          </div>
          <div
            className="flex items-center gap-2 border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: user.color }}
          >
            <div className="w-2 h-2 bg-black rounded-full" />
            <span className="text-[11px] font-black uppercase">{user.name}</span>
          </div>
        </div>
      </div>

      {/* ── Left toolbar ── */}
      <div className="pointer-events-auto">
        <Toolbar onAdd={(type, extra) => handleAddBlock(type, extra as Record<string, unknown>)} />
      </div>

      {/* ── Right style panel — only for blocks the user owns ── */}
      {selectedId && blocks[selectedId] && blocks[selectedId].creator === user.name && (
        <div className="pointer-events-auto">
          <StylePanel
            block={blocks[selectedId]}
            allBlocks={blocks}
            currentUserName={user.name}
            onUpdate={(updates) => handleUpdateBlock(selectedId, updates)}
            onDelete={() => handleDeleteBlock(selectedId)}
            onPublish={() => setPublishingBlockId(selectedId)}
            onFork={() => handleFork(blocks[selectedId])}
            onExport={() => setExportingBlockId(selectedId)}
            onProposeMerge={() => handleProposeMerge(selectedId)}
            onAcceptMerge={(forkBlock) => handleAcceptMerge(selectedId, forkBlock)}
          />
        </div>
      )}

      {/* ── Bottom-right zoom controls ── */}
      <div className="absolute bottom-6 right-6 z-50 flex items-center gap-2 pointer-events-auto">
        {/* Keyboard hints */}
        <div className="hidden md:flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 mr-1">
          <span>
            <kbd className="bg-white border-2 border-black px-1.5 py-0.5 font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">SPACE</kbd>
            {" "}PAN
          </span>
          <span>
            <kbd className="bg-white border-2 border-black px-1.5 py-0.5 font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">CTRL+SCROLL</kbd>
            {" "}ZOOM
          </span>
          <span>
            <kbd className="bg-white border-2 border-black px-1.5 py-0.5 font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">ESC</kbd>
            {" "}RESET
          </span>
        </div>

        {/* Zoom */}
        <div className="flex items-stretch border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={() => setScale((s) => Math.max(0.1, +(s - 0.25).toFixed(2)))}
            className="px-3 py-2 hover:bg-[#f4f4f0] border-r-4 border-black active:bg-[#ffe800] transition-colors"
          >
            <ZoomOut size={14} strokeWidth={3} />
          </button>
          <button
            onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            className="px-3 py-2 text-[11px] font-black border-r-4 border-black hover:bg-[#ffe800] min-w-[52px] text-center transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={() => setScale((s) => Math.min(5, +(s + 0.25).toFixed(2)))}
            className="px-3 py-2 hover:bg-[#f4f4f0] border-r-4 border-black active:bg-[#ffe800] transition-colors"
          >
            <ZoomIn size={14} strokeWidth={3} />
          </button>
          <button
            onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            className="px-3 py-2 hover:bg-[#ffe800] transition-colors"
            title="Reset view"
          >
            <Maximize2 size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* ── Deselect hint ── */}
      {selectedId && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-2 bg-white border-2 border-black text-black text-[10px] font-black uppercase px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#f4f4f0] transition-colors"
          >
            <X size={11} strokeWidth={3} />
            CLICK CANVAS TO DESELECT
          </button>
        </div>
      )}

      {/* ── Publish modal ── */}
      {publishingBlockId && (
        <PublishModal
          defaultName={user.name}
          onPublish={(name, twitterUrl) => handlePublish(publishingBlockId, name, twitterUrl)}
          onClose={() => setPublishingBlockId(null)}
        />
      )}

      {/* ── Export modal ── */}
      {exportingBlockId && blocks[exportingBlockId] && (
        <ExportModal
          block={blocks[exportingBlockId]}
          allBlocks={blocks}
          onClose={() => setExportingBlockId(null)}
        />
      )}
    </div>
  );
}
