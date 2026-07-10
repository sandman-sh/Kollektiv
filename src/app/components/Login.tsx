import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers2, Users, GitFork, Zap, ArrowRight, ArrowLeft,
  MousePointer2, GitMerge, Globe, AlertCircle, Loader2,
  Lock, Shield, CheckCircle2,
} from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const API_BASE    = `https://${projectId}.supabase.co/functions/v1/make-server-0de39c1e`;
const API_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`,
};

// ── Constants ─────────────────────────────────────────────────
const ROTATING_WORDS = ["FORK.", "MERGE.", "SHIP.", "REMIX.", "COLLAB."];

const FEATURES = [
  { icon: Users,         label: "LIVE CURSORS",   color: "#ffe800", fg: "#000" },
  { icon: GitFork,       label: "FORK & REMIX",   color: "#ff0054", fg: "#fff" },
  { icon: GitMerge,      label: "MERGE CHANGES",  color: "#0066ff", fg: "#fff" },
  { icon: Zap,           label: "REAL-TIME SYNC", color: "#00f0b5", fg: "#000" },
  { icon: MousePointer2, label: "PRO BUILDER",    color: "#ffe800", fg: "#000" },
  { icon: Globe,         label: "OPEN SOURCE",    color: "#ff0054", fg: "#fff" },
];

const BG_SHAPES = [
  { x: "6%",  y: "8%",  color: "#ffe800", size: 72,  rotate: -12, delay: 0,    floatY: -12, floatDur: 4.2 },
  { x: "82%", y: "6%",  color: "#ff0054", size: 48,  rotate: 18,  delay: 0.2,  floatY: 10,  floatDur: 3.8 },
  { x: "3%",  y: "65%", color: "#0066ff", size: 88,  rotate: -8,  delay: 0.35, floatY: -8,  floatDur: 5.1 },
  { x: "87%", y: "70%", color: "#00f0b5", size: 56,  rotate: 22,  delay: 0.15, floatY: 14,  floatDur: 4.6 },
  { x: "50%", y: "1%",  color: "#00f0b5", size: 36,  rotate: -24, delay: 0.3,  floatY: -10, floatDur: 3.5 },
  { x: "70%", y: "86%", color: "#ffe800", size: 52,  rotate: 10,  delay: 0.45, floatY: 8,   floatDur: 4.0 },
  { x: "16%", y: "85%", color: "#ff0054", size: 40,  rotate: -18, delay: 0.25, floatY: -14, floatDur: 4.8 },
  { x: "92%", y: "38%", color: "#0066ff", size: 28,  rotate: 30,  delay: 0.1,  floatY: 12,  floatDur: 3.3 },
  { x: "22%", y: "5%",  color: "#0066ff", size: 44,  rotate: 14,  delay: 0.08, floatY: 10,  floatDur: 4.3 },
];

// ── Animated counter ─────────────────────────────────────────
function AnimatedCount({ end, delay = 0 }: { end: number; delay?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const step = Math.ceil(end / 40);
      const iv = setInterval(() => {
        setCount((c) => { if (c + step >= end) { clearInterval(iv); return end; } return c + step; });
      }, 30);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [end, delay]);
  return <>{count.toLocaleString()}</>;
}

// ── 4-digit PIN input ────────────────────────────────────────
export interface PinRowHandle {
  focus: () => void;
  clear: () => void;
}

const PinRow = forwardRef<PinRowHandle, {
  value: string[];
  onChange: (v: string[]) => void;
  // IMPORTANT: receives the completed value array, NOT React state.
  // Avoids stale closure bugs when onComplete is called via setTimeout.
  onComplete?: (completedValue: string[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}>(function PinRow({ value, onChange, onComplete, disabled = false, autoFocus = false }, externalRef) {
  const refs  = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const focus = (i: number) => refs.current[i]?.focus();

  useImperativeHandle(externalRef, () => ({
    focus: () => focus(0),
    clear: () => onChange(["", "", "", ""]),
  }), [onChange]);

  useEffect(() => { if (autoFocus) setTimeout(() => focus(0), 60); }, [autoFocus]);

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value]; next[i] = digit; onChange(next);
    if (digit) {
      if (i < 3) {
        focus(i + 1);
      } else if (onComplete) {
        // Capture the completed array NOW — don't rely on React state
        const completed = next;
        setTimeout(() => onComplete(completed), 60);
      }
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[i]) { const n = [...value]; n[i] = ""; onChange(n); }
      else if (i > 0) { focus(i - 1); const n = [...value]; n[i - 1] = ""; onChange(n); }
    } else if (e.key === "ArrowLeft"  && i > 0) focus(i - 1);
    else if   (e.key === "ArrowRight" && i < 3) focus(i + 1);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const next = ["", "", "", ""];
    for (let j = 0; j < digits.length; j++) next[j] = digits[j];
    onChange(next);
    if (digits.length === 4 && onComplete) {
      const completed = next;
      setTimeout(() => onComplete(completed), 60);
    } else {
      focus(Math.min(digits.length, 3));
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={2}
          value={value[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-14 h-14 text-center text-3xl font-black border-4 border-black bg-[#f4f4f0] focus:outline-none focus:bg-[#ffe800] transition-colors disabled:opacity-40 caret-transparent select-none"
        />
      ))}
    </div>
  );
});

// ── Error banner ─────────────────────────────────────────────
function Err({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 bg-[#ff0054] border-2 border-black text-white text-[11px] font-bold px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    >
      <AlertCircle size={13} strokeWidth={3} className="shrink-0 mt-0.5" />
      {msg}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────
type Step = "name" | "pin-create" | "pin-verify";

export default function Login() {
  const navigate = useNavigate();
  const [wordIdx, setWordIdx] = useState(0);
  const [step,    setStep]    = useState<Step>("name");
  const [name,    setName]    = useState("");
  const [pin,     setPin]     = useState(["", "", "", ""]);
  const [confirm, setConfirm] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const attempts              = useRef(0);
  // Ref to the Confirm-PIN row so the Set-PIN row can auto-focus it when complete
  const confirmRowRef         = useRef<PinRowHandle>(null);

  useEffect(() => {
    const id = setInterval(() => setWordIdx((i) => (i + 1) % ROTATING_WORDS.length), 1800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setPin(["", "", "", ""]); setConfirm(["", "", "", ""]);
    setError(null); attempts.current = 0;
  }, [step]);

  // Step 1 — check whether name has a PIN already
  const handleNameNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(
        `${API_BASE}/pin/${encodeURIComponent(name.trim().toLowerCase())}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await res.json();
      setStep(data.exists ? "pin-verify" : "pin-create");
    } catch {
      setStep("pin-create"); // network failure → assume new user
    } finally {
      setLoading(false);
    }
  };

  // Step 2a — register a new PIN
  // `completedConfirm` is passed from PinRow's onComplete so we always read
  // the latest value, avoiding React state-closure timing issues.
  const handleCreate = async (completedConfirm?: string[]) => {
    const p = pin.join("");
    const c = (completedConfirm ?? confirm).join("");
    if (p.length !== 4)   { setError("Enter all 4 digits for your PIN"); return; }
    if (c.length !== 4)   { setError("Enter all 4 digits to confirm");   return; }
    if (p !== c)          { setError("PINs don't match — re-enter to confirm"); setConfirm(["","","",""]); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/pin/create`, {
        method: "POST", headers: API_HEADERS,
        body: JSON.stringify({ name: name.trim(), pin: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setError("Name just got claimed — choose a different one."); setStep("name"); }
        else                    { setError(data.error || "Failed to save PIN — try again"); }
        return;
      }
      sessionStorage.setItem("kollektiv_user", name.trim());
      navigate("/canvas");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  // Step 2b — verify existing PIN
  const handleVerify = async (completedPin?: string[]) => {
    const p = (completedPin ?? pin).join("");
    if (p.length !== 4) { setError("Enter all 4 digits"); return; }
    if (attempts.current >= 5) { setError("Too many wrong attempts. Go back and try a different name."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/pin/verify`, {
        method: "POST", headers: API_HEADERS,
        body: JSON.stringify({ name: name.trim(), pin: p }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Verification failed"); return; }
      if (data.match) {
        sessionStorage.setItem("kollektiv_user", name.trim());
        navigate("/canvas");
      } else {
        attempts.current += 1;
        const left = 5 - attempts.current;
        setError(left > 0
          ? `Wrong PIN — ${left} attempt${left !== 1 ? "s" : ""} remaining`
          : "Too many wrong attempts. Go back and use a different name.");
        setPin(["","","",""]);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="w-full h-full bg-[#f4f4f0] flex items-center justify-center p-6 relative overflow-hidden">

      {/* Grid */}
      <motion.div className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }} animate={{ opacity: 0.07 }} transition={{ duration: 1 }}
        style={{ backgroundImage: "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)", backgroundSize: "40px 40px" }}
      />

      {/* Floating shapes */}
      {BG_SHAPES.map((s, i) => (
        <motion.div key={i} className="absolute border-4 border-black"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, backgroundColor: s.color, boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
          initial={{ opacity: 0, rotate: s.rotate - 25, scale: 0.4 }}
          animate={{ opacity: 0.85, rotate: s.rotate, scale: 1, y: [0, s.floatY, 0] }}
          transition={{ opacity: { delay: s.delay, duration: 0.5 }, rotate: { delay: s.delay, duration: 0.5 }, scale: { delay: s.delay, duration: 0.5 }, y: { delay: s.delay + 0.6, duration: s.floatDur, repeat: Infinity, ease: "easeInOut" } }}
        />
      ))}

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-14 max-w-5xl w-full">

        {/* ── Left branding (unchanged) ── */}
        <motion.div
          initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex-1 flex flex-col gap-7"
        >
          <div className="flex items-center gap-4">
            <motion.div className="w-14 h-14 bg-[#ffe800] border-4 border-black flex items-center justify-center"
              style={{ boxShadow: "5px 5px 0px 0px rgba(0,0,0,1)" }}
              whileHover={{ rotate: -8, scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}
            >
              <Layers2 size={28} strokeWidth={3} />
            </motion.div>
            <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Kollektiv</h1>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500 mt-1">Open Multiplayer UI Canvas</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-3xl font-black uppercase leading-tight">BUILD TOGETHER.</p>
            <div className="flex items-center gap-3 text-3xl font-black uppercase leading-tight">
              <AnimatePresence mode="wait">
                <motion.span key={wordIdx} className="inline-block bg-black text-[#ffe800] px-3 py-0.5"
                  initial={{ opacity: 0, y: 14, rotateX: -45 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -14, rotateX: 45 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }} style={{ perspective: "200px" }}
                >{ROTATING_WORDS[wordIdx]}</motion.span>
              </AnimatePresence>
              <span className="text-gray-400">FOREVER.</span>
            </div>
            <p className="text-sm font-bold text-gray-600 mt-2 max-w-xs leading-relaxed">
              The open canvas where designers build, fork, and merge UI components in real-time — like GitHub, but for design.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.label}
                initial={{ opacity: 0, scale: 0.7, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.07, type: "spring", stiffness: 260 }}
                whileHover={{ y: -3, scale: 1.04 }}
                className="flex items-center gap-2 px-3 py-2 border-2 border-black text-[11px] font-black uppercase cursor-default shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                style={{ backgroundColor: f.color, color: f.fg }}
              ><f.icon size={12} strokeWidth={3} />{f.label}</motion.div>
            ))}
          </div>

          <motion.div className="flex gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
            {[{ label: "COMPONENTS BUILT", end: 1247 }, { label: "ACTIVE FORKS", end: 348 }, { label: "MERGES ACCEPTED", end: 89 }].map((s, i) => (
              <div key={s.label} className="bg-white border-2 border-black px-3 py-2" style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}>
                <p className="text-lg font-black leading-none"><AnimatedCount end={s.end} delay={900 + i * 150} /></p>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right: multi-step form card ── */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="bg-white border-4 border-black overflow-hidden" style={{ boxShadow: "10px 10px 0px 0px rgba(0,0,0,1)" }}>

            {/* Animated header */}
            <motion.div
              animate={{ backgroundColor: step === "name" ? "#000" : step === "pin-create" ? "#0066ff" : "#ff0054" }}
              transition={{ duration: 0.3 }}
              className="px-6 py-5"
            >
              <div className="flex items-center gap-3">
                {step === "name"       ? <Layers2 size={20} strokeWidth={3} className="text-[#ffe800]" />
                 : step === "pin-create" ? <Shield  size={20} strokeWidth={3} className="text-white" />
                 :                         <Lock    size={20} strokeWidth={3} className="text-white" />}
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide text-white">
                    {step === "name" ? "Join the Canvas" : step === "pin-create" ? "Create Your PIN" : "Welcome Back"}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-white/60">
                    {step === "name" ? "No account · No signup · Just build" : step === "pin-create" ? `Securing ${name}` : `Verifying ${name}`}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="flex gap-2 mt-4">
                {(["name", "pin-create", "pin-verify"] as const).map((s) => (
                  <div key={s} className="h-1.5 border border-white/30 transition-all duration-300"
                    style={{ flex: s === step ? 2 : 1, backgroundColor: s === step ? "#fff" : "rgba(255,255,255,0.25)" }} />
                ))}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">

              {/* ── Step 1: Name ── */}
              {step === "name" && (
                <motion.form key="name" onSubmit={handleNameNext}
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 flex flex-col gap-5"
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">Your Name</label>
                    <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(null); }}
                      placeholder="E.G. SARAH CHEN" maxLength={28} autoFocus autoComplete="off"
                      className="w-full bg-[#f4f4f0] border-4 border-black text-black font-bold px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:bg-[#ffe800] transition-colors"
                    />
                    {error && <Err msg={error} />}
                  </div>
                  <button type="submit" disabled={!name.trim() || loading}
                    className="w-full py-4 bg-[#ff0054] text-white text-lg font-black uppercase border-4 border-black flex items-center justify-center gap-3 disabled:opacity-40 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px active:shadow-none transition-all"
                  >
                    {loading ? <><Loader2 size={20} strokeWidth={3} className="animate-spin" /> CHECKING…</> : <>NEXT <ArrowRight size={20} strokeWidth={3} /></>}
                  </button>
                  <div className="flex items-center gap-2">
                    {["#ffe800","#ff0054","#0066ff","#00f0b5"].map((c, i) => (
                      <motion.div key={c} className="w-5 h-5 border-2 border-black" style={{ backgroundColor: c }}
                        animate={{ y: [0,-4,0] }} transition={{ delay: 0.8+i*0.15, duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
                    ))}
                    <span className="text-[10px] font-black uppercase text-gray-500">Random cursor color</span>
                  </div>
                </motion.form>
              )}

              {/* ── Step 2a: Create PIN ── */}
              {step === "pin-create" && (
                <motion.div key="create"
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 flex flex-col gap-5"
                >
                  <div className="bg-[#f4f4f0] border-2 border-black p-3 text-[11px] font-bold uppercase text-gray-600 flex items-start gap-2">
                    <Shield size={14} strokeWidth={3} className="text-[#0066ff] shrink-0 mt-0.5" />
                    Your 4-digit PIN locks your designer identity. Only you will know it — we only store the hash.
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-center">Set PIN</label>
                    <PinRow
                      value={pin}
                      onChange={setPin}
                      autoFocus
                      disabled={loading}
                      // When the 4th digit is entered, auto-jump focus to the Confirm row
                      onComplete={() => confirmRowRef.current?.focus()}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-center">Confirm PIN</label>
                    <PinRow
                      ref={confirmRowRef}
                      value={confirm}
                      onChange={setConfirm}
                      onComplete={handleCreate}
                      disabled={loading}
                    />
                  </div>

                  {error && <Err msg={error} />}

                  <div className="flex gap-3">
                    <button onClick={() => setStep("name")} disabled={loading}
                      className="flex items-center gap-1.5 border-2 border-black bg-white font-black uppercase text-xs px-4 py-2.5 hover:bg-[#f4f4f0] disabled:opacity-40 transition-colors"
                    ><ArrowLeft size={13} strokeWidth={3} /> BACK</button>
                    <button onClick={handleCreate} disabled={loading || pin.join("").length !== 4 || confirm.join("").length !== 4}
                      className="flex-1 bg-[#0066ff] text-white border-2 border-black font-black uppercase text-xs py-2.5 flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? <><Loader2 size={14} strokeWidth={3} className="animate-spin" /> SAVING…</> : <><CheckCircle2 size={14} strokeWidth={3} /> CREATE &amp; ENTER</>}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2b: Verify PIN ── */}
              {step === "pin-verify" && (
                <motion.div key="verify"
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 flex flex-col gap-5"
                >
                  <div className="bg-[#f4f4f0] border-2 border-black p-3 text-[11px] font-bold uppercase text-gray-600 flex items-start gap-2">
                    <Lock size={14} strokeWidth={3} className="text-[#ff0054] shrink-0 mt-0.5" />
                    <span><span className="text-black">{name}</span> is a registered name. Enter your PIN to access your designs.</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-center">Your PIN</label>
                    <PinRow value={pin} onChange={setPin} onComplete={handleVerify} autoFocus disabled={loading} />
                  </div>

                  {error && <Err msg={error} />}

                  <div className="flex gap-3">
                    <button onClick={() => setStep("name")} disabled={loading}
                      className="flex items-center gap-1.5 border-2 border-black bg-white font-black uppercase text-xs px-4 py-2.5 hover:bg-[#f4f4f0] disabled:opacity-40 transition-colors"
                    ><ArrowLeft size={13} strokeWidth={3} /> BACK</button>
                    <button onClick={handleVerify} disabled={loading || pin.join("").length !== 4}
                      className="flex-1 bg-[#ff0054] text-white border-2 border-black font-black uppercase text-xs py-2.5 flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? <><Loader2 size={14} strokeWidth={3} className="animate-spin" /> VERIFYING…</> : <><ArrowRight size={14} strokeWidth={3} /> ENTER CANVAS</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* How-it-works strip */}
          <motion.div className="mt-4 bg-white border-4 border-black px-4 py-3 flex flex-col gap-2"
            style={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          >
            {[
              ["01", "#ffe800", "Choose a name and set a private 4-digit PIN"],
              ["02", "#ff0054", "Fork any published component to remix it"],
              ["03", "#00f0b5", "Propose & accept merges to collaborate"],
            ].map(([num, color, text]) => (
              <div key={num} className="flex items-center gap-3 text-xs font-bold">
                <span className="w-6 h-6 flex items-center justify-center border-2 border-black text-[10px] font-black shrink-0" style={{ backgroundColor: color }}>{num}</span>
                {text}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
