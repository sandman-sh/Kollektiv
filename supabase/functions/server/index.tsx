import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

// ── Supabase Storage client (service role) ────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const IMAGE_BUCKET = "make-0de39c1e-images";

// Idempotently create the private image bucket on cold start
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b: { name: string }) => b.name === IMAGE_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(IMAGE_BUCKET, { public: false });
      console.log(`[storage] created bucket "${IMAGE_BUCKET}"`);
    }
  } catch (e) {
    console.log("[storage] bucket init error (non-fatal):", e);
  }
})();

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-0de39c1e/health", (c) => c.json({ status: "ok" }));

// ── Blocks ────────────────────────────────────────────────────

app.get("/make-server-0de39c1e/patches", async (c) => {
  try {
    const patches = await kv.getByPrefix("patch_");
    return c.json({ patches });
  } catch (err) {
    console.log("GET /patches error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/make-server-0de39c1e/patches", async (c) => {
  try {
    const patch = await c.req.json();
    await kv.set(`patch_${patch.id}`, patch);
    return c.json({ success: true, patch });
  } catch (err) {
    console.log("POST /patches error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.put("/make-server-0de39c1e/patches/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const patch = await c.req.json();
    await kv.set(`patch_${id}`, patch);
    return c.json({ success: true, patch });
  } catch (err) {
    console.log("PUT /patches error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.delete("/make-server-0de39c1e/patches/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.mdel([`patch_${id}`]);
    return c.json({ success: true });
  } catch (err) {
    console.log("DELETE /patches error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ── PIN authentication ────────────────────────────────────────
// Hash is stored as a plain hex string in the KV store.
// Salt format: "kollektiv-v1:{name_lowercase}:{pin}"

const SALT = "kollektiv-v1";

async function hashPin(name: string, pin: string): Promise<string> {
  const input = `${SALT}:${name.toLowerCase().trim()}:${pin}`;
  const data  = new TextEncoder().encode(input);
  const buf   = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// GET /pin/:name → { exists: boolean }
app.get("/make-server-0de39c1e/pin/:name", async (c) => {
  try {
    const name = c.req.param("name").toLowerCase().trim();
    const stored = await kv.get(`pin_${name}`);
    return c.json({ exists: stored !== null && stored !== undefined });
  } catch (err) {
    console.log("GET /pin error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /pin/create → { ok: true } | 409 | 400
app.post("/make-server-0de39c1e/pin/create", async (c) => {
  try {
    const body = await c.req.json();
    const name = String(body?.name ?? "").trim();
    const pin  = String(body?.pin  ?? "").replace(/\D/g, "");

    if (!name)          return c.json({ error: "Name is required" }, 400);
    if (pin.length !== 4) return c.json({ error: "PIN must be exactly 4 digits" }, 400);

    const key     = `pin_${name.toLowerCase()}`;
    const existing = await kv.get(key);

    if (existing !== null && existing !== undefined)
      return c.json({ error: "This name is already claimed" }, 409);

    // Store the hash as a plain string — avoids any object-deserialisation issues
    const hash = await hashPin(name, pin);
    await kv.set(key, hash);

    console.log(`PIN created for "${name}"`);
    return c.json({ ok: true });
  } catch (err) {
    console.log("POST /pin/create error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

/**
 * Extract a 64-char hex SHA-256 hash from any of the three legacy formats
 * the KV store may return:
 *   1. plain hex string (current format)              → "abc123..."
 *   2. deserialised object  (old format)              → { hash: "abc123...", createdAt }
 *   3. JSON-stringified object (old format, raw)      → '{"hash":"abc123...","createdAt":"..."}'
 */
function extractStoredHash(stored: unknown): string {
  // Direct object
  if (stored && typeof stored === "object") {
    return (stored as Record<string, string>).hash ?? "";
  }
  if (typeof stored !== "string") return "";

  // Plain hex hash — exactly 64 lowercase hex chars
  if (/^[a-f0-9]{64}$/i.test(stored)) return stored;

  // Could be a JSON-encoded object string
  if (stored.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(stored);
      return parsed?.hash ?? "";
    } catch {
      return "";
    }
  }

  // Fallback — assume raw string is the hash
  return stored;
}

// POST /pin/verify → { match: boolean }
app.post("/make-server-0de39c1e/pin/verify", async (c) => {
  try {
    const body = await c.req.json();
    const name = String(body?.name ?? "").trim();
    const pin  = String(body?.pin  ?? "").replace(/\D/g, "");

    if (!name)            return c.json({ error: "Name is required" }, 400);
    if (pin.length !== 4) return c.json({ error: "PIN must be exactly 4 digits" }, 400);

    const key    = `pin_${name.toLowerCase()}`;
    const stored = await kv.get(key);

    if (stored === null || stored === undefined)
      return c.json({ error: "No PIN registered for this name" }, 404);

    const storedHash = extractStoredHash(stored);
    const inputHash  = await hashPin(name, pin);

    console.log(
      `[pin/verify] name="${name}" stored-type=${typeof stored} ` +
      `stored-hash-len=${storedHash.length} input-hash-len=${inputHash.length} ` +
      `match=${storedHash === inputHash}`,
    );

    if (!storedHash) {
      console.log(`[pin/verify] corrupted record for "${name}" — raw value: ${JSON.stringify(stored).slice(0, 200)}`);
      return c.json({ error: "PIN record is corrupted. Please clear and reset." }, 500);
    }

    const match = storedHash === inputHash;

    // ── Auto-migration: if old format matched, rewrite as plain string ──
    if (match && typeof stored !== "string") {
      try {
        await kv.set(key, storedHash);
        console.log(`[pin/verify] migrated "${name}" record to plain-string format`);
      } catch (e) {
        console.log("[pin/verify] migration failed (non-fatal):", e);
      }
    }

    return c.json({ match });
  } catch (err) {
    console.log("[pin/verify] error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /pin/reset → { ok: true }
// Last-resort recovery: deletes a corrupted PIN record so the user can re-register.
// (Not exposed in the UI yet — call it manually if a user is stuck.)
app.post("/make-server-0de39c1e/pin/reset", async (c) => {
  try {
    const body = await c.req.json();
    const name = String(body?.name ?? "").trim().toLowerCase();
    if (!name) return c.json({ error: "Name is required" }, 400);
    await kv.del(`pin_${name}`);
    console.log(`[pin/reset] cleared record for "${name}"`);
    return c.json({ ok: true });
  } catch (err) {
    console.log("[pin/reset] error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ── Image upload ──────────────────────────────────────────────
// POST /upload  multipart/form-data field: "file"
// Returns: { url: string }  (10-year signed URL)
app.post("/make-server-0de39c1e/upload", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File))
      return c.json({ error: "Missing 'file' field" }, 400);

    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"];
    if (!ALLOWED.includes(file.type))
      return c.json({ error: `Unsupported type. Allowed: JPEG, PNG, GIF, WebP, SVG, AVIF` }, 400);

    if (file.size > 10 * 1024 * 1024)
      return c.json({ error: "File too large (max 10 MB)" }, 400);

    const ext  = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.log("[upload] storage error:", uploadError.message);
      return c.json({ error: uploadError.message }, 500);
    }

    // Signed URL with 10-year TTL (max allowed by Supabase)
    const { data: signed, error: signError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

    if (signError || !signed)
      return c.json({ error: signError?.message ?? "Signed URL creation failed" }, 500);

    console.log(`[upload] "${file.name}" → ${path} (${(file.size / 1024).toFixed(1)} KB)`);
    return c.json({ url: signed.signedUrl });
  } catch (err) {
    console.log("[upload] error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

Deno.serve(app.fetch);
