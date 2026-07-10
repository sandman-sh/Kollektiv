import { useState, useRef } from "react";
import { Block, Shadow, GradientStop, uploadImage } from "../lib/api";
import {
  Trash2, GitPullRequest, Check, Upload, GitFork, ChevronDown, ChevronUp,
  ArrowRight, ArrowDown, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Globe2, Plus, Minus, Link, Unlink, Code2, Download, ImagePlus, Loader2, X,
} from "lucide-react";
import { SHADER_TYPES } from "./ShaderBlock";
import { IconPicker } from "./IconPicker";
import { toast } from "sonner";

// ── Primitive Controls ────────────────────────────────────────

function Sec({ label, open, toggle, children }: { label: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b-4 border-black">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-[#f4f4f0] border-b-2 border-black hover:bg-[#ffe800] transition-colors"
      >
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
        {open ? <ChevronUp size={10} strokeWidth={3} /> : <ChevronDown size={10} strokeWidth={3} />}
      </button>
      {open && <div className="px-3 py-3 flex flex-col gap-2.5">{children}</div>}
    </div>
  );
}

function Row({ label, children, compact }: { label?: string; children: React.ReactNode; compact?: boolean }) {
  if (!label) return <div className="flex flex-col gap-1">{children}</div>;
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "min-h-[26px]"}`}>
      <span className="text-[9px] font-black uppercase text-gray-500 w-[48px] shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Num({ value, onChange, min = 0, max = 9999, step = 1, unit }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center border-2 border-black overflow-hidden">
      <button onClick={() => onChange(clamp(value - step))} className="px-1.5 py-1 bg-[#f4f4f0] border-r-2 border-black font-black hover:bg-[#ffe800] transition-colors text-sm select-none">-</button>
      <input type="number" value={Math.round(value * 100) / 100} min={min} max={max} step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="flex-1 bg-white text-black text-[11px] text-center py-1 focus:outline-none font-bold min-w-0 w-0"
      />
      <button onClick={() => onChange(clamp(value + step))} className="px-1.5 py-1 bg-[#f4f4f0] border-l-2 border-black font-black hover:bg-[#ffe800] transition-colors text-sm select-none">+</button>
      {unit && <span className="px-1 bg-black text-white text-[9px] font-black select-none">{unit}</span>}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="relative w-7 h-7 border-2 border-black shrink-0 cursor-pointer overflow-hidden">
        <input type="color" value={value === "transparent" ? "#000000" : value} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ backgroundColor: value === "transparent" ? undefined : value }}>
          {value === "transparent" && (
            <div className="w-full h-full" style={{ backgroundImage: "linear-gradient(45deg,#aaa 25%,transparent 25%),linear-gradient(-45deg,#aaa 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#aaa 75%),linear-gradient(-45deg,transparent 75%,#aaa 75%)", backgroundSize: "6px 6px", backgroundPosition: "0 0,0 3px,3px -3px,-3px 0" }} />
          )}
        </div>
      </label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-[#f4f4f0] border-2 border-black text-black text-[10px] font-mono font-bold px-2 py-1 focus:outline-none focus:bg-[#ffe800] transition-colors"
        placeholder="transparent"
      />
    </div>
  );
}

function NbSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#f4f4f0] border-2 border-black text-black text-[11px] font-bold px-2 py-1.5 focus:outline-none"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function NbInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-[#f4f4f0] border-2 border-black text-black text-[11px] font-bold px-2 py-1.5 focus:outline-none focus:bg-[#ffe800] transition-colors ${mono ? "font-mono" : ""}`}
    />
  );
}

function NbTextarea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      className="w-full bg-[#f4f4f0] border-2 border-black text-black text-[11px] font-bold px-2 py-1.5 focus:outline-none focus:bg-[#ffe800] transition-colors resize-none font-mono"
    />
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: React.ReactNode; title?: string }[] }) {
  return (
    <div className="flex border-2 border-black overflow-hidden">
      {options.map((o, i) => (
        <button key={o.v} onClick={() => onChange(o.v)} title={o.title}
          className={`flex-1 py-1 flex items-center justify-center ${i < options.length - 1 ? "border-r-2 border-black" : ""} text-xs font-black transition-colors ${value === o.v ? "bg-black text-[#ffe800]" : "bg-[#f4f4f0] text-black hover:bg-[#ffe800]"}`}
        >{o.label}</button>
      ))}
    </div>
  );
}

function NbBtn({ onClick, label, color, children }: { onClick: () => void; label?: string; color?: string; children?: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="flex items-center justify-center gap-2 w-full border-2 border-black font-black uppercase text-[11px] py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all"
      style={{ backgroundColor: color || "#f4f4f0" }}
    >
      {children}{label}
    </button>
  );
}

// ── Shadow Editor ─────────────────────────────────────────────
function ShadowEditor({ shadows, onChange }: { shadows: Shadow[]; onChange: (s: Shadow[]) => void }) {
  const add = () => onChange([...shadows, { x: 4, y: 4, blur: 0, spread: 0, color: "#000000", inset: false }]);
  const rem = (i: number) => onChange(shadows.filter((_, idx) => idx !== i));
  const upd = (i: number, patch: Partial<Shadow>) => onChange(shadows.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  return (
    <div className="flex flex-col gap-2">
      {shadows.map((s, i) => (
        <div key={i} className="border-2 border-black p-2 flex flex-col gap-1.5 bg-[#f4f4f0]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase">Shadow {i + 1}</span>
            <div className="flex gap-1 items-center">
              <label className="flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer">
                <input type="checkbox" checked={s.inset} onChange={(e) => upd(i, { inset: e.target.checked })} className="w-3 h-3" /> INSET
              </label>
              <button onClick={() => rem(i)} className="text-[#ff0054] ml-1 hover:opacity-70"><Minus size={11} strokeWidth={3} /></button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black text-gray-500 uppercase">X</span><Num value={s.x} onChange={(v) => upd(i, { x: v })} min={-100} max={100} /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black text-gray-500 uppercase">Y</span><Num value={s.y} onChange={(v) => upd(i, { y: v })} min={-100} max={100} /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black text-gray-500 uppercase">BLUR</span><Num value={s.blur} onChange={(v) => upd(i, { blur: v })} max={100} /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black text-gray-500 uppercase">SPREAD</span><Num value={s.spread} onChange={(v) => upd(i, { spread: v })} min={-50} max={100} /></div>
          </div>
          <ColorInput value={s.color} onChange={(v) => upd(i, { color: v })} />
        </div>
      ))}
      <button onClick={add} className="flex items-center justify-center gap-1.5 border-2 border-black border-dashed text-[10px] font-black uppercase py-1.5 hover:bg-[#ffe800] hover:border-solid transition-all">
        <Plus size={11} strokeWidth={3} /> ADD SHADOW
      </button>
    </div>
  );
}

// ── Gradient Editor ───────────────────────────────────────────
function GradientEditor({ stops, angle, type, onStops, onAngle, onType }: {
  stops: GradientStop[]; angle: number; type: string;
  onStops: (s: GradientStop[]) => void; onAngle: (a: number) => void; onType: (t: string) => void;
}) {
  const add = () => onStops([...stops, { color: "#ffffff", position: 100 }]);
  const rem = (i: number) => { if (stops.length > 2) onStops(stops.filter((_, idx) => idx !== i)); };
  const upd = (i: number, patch: Partial<GradientStop>) => onStops(stops.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  return (
    <div className="flex flex-col gap-2">
      <Row label="TYPE">
        <Seg value={type} onChange={onType}
          options={[{ v: "linear", label: "Linear" }, { v: "radial", label: "Radial" }]}
        />
      </Row>
      {type === "linear" && (
        <Row label="ANGLE"><Num value={angle} onChange={onAngle} min={0} max={360} unit="°" /></Row>
      )}
      <div className="flex flex-col gap-1.5">
        {stops.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <ColorInput value={s.color} onChange={(v) => upd(i, { color: v })} />
            <Num value={s.position} onChange={(v) => upd(i, { position: v })} max={100} unit="%" />
            <button onClick={() => rem(i)} className="text-gray-400 hover:text-[#ff0054] transition-colors shrink-0"><Minus size={11} strokeWidth={3} /></button>
          </div>
        ))}
        <button onClick={add} className="flex items-center justify-center gap-1.5 border-2 border-black border-dashed text-[10px] font-black uppercase py-1 hover:bg-[#ffe800] hover:border-solid transition-all">
          <Plus size={10} strokeWidth={3} /> ADD STOP
        </button>
      </div>
    </div>
  );
}

// ── Spacing 4-value editor ────────────────────────────────────
function Spacing4({ label, t, r, b, l, onT, onR, onB, onL }: {
  label: string; t: number; r: number; b: number; l: number;
  onT: (v: number) => void; onR: (v: number) => void; onB: (v: number) => void; onL: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-black uppercase text-gray-500">{label}</span>
      <div className="grid grid-cols-4 gap-1">
        {[["T", t, onT], ["R", r, onR], ["B", b, onB], ["L", l, onL]].map(([lbl, val, fn]) => (
          <div key={lbl as string} className="flex flex-col gap-0.5 items-center">
            <span className="text-[8px] font-black uppercase text-gray-400">{lbl as string}</span>
            <Num value={val as number} onChange={fn as (v: number) => void} max={200} step={1} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Border Radius editor ──────────────────────────────────────
function RadiusEditor({ b, u }: { b: Block; u: (p: Partial<Block>) => void }) {
  const linked = b.borderRadiusLinked !== false;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase text-gray-500">CORNER RADIUS</span>
        <button onClick={() => u({ borderRadiusLinked: !linked })} title="Link corners" className={`border-2 border-black p-0.5 transition-colors ${linked ? "bg-black text-[#ffe800]" : "bg-white"}`}>
          {linked ? <Link size={10} strokeWidth={3} /> : <Unlink size={10} strokeWidth={3} />}
        </button>
      </div>
      {linked ? (
        <Num value={b.borderRadius ?? 0} onChange={(v) => u({ borderRadius: v, borderRadiusTL: v, borderRadiusTR: v, borderRadiusBR: v, borderRadiusBL: v })} max={9999} unit="px" />
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {[["TL", b.borderRadiusTL ?? 0, (v: number) => u({ borderRadiusTL: v })],
            ["TR", b.borderRadiusTR ?? 0, (v: number) => u({ borderRadiusTR: v })],
            ["BR", b.borderRadiusBR ?? 0, (v: number) => u({ borderRadiusBR: v })],
            ["BL", b.borderRadiusBL ?? 0, (v: number) => u({ borderRadiusBL: v })]
          ].map(([lbl, val, fn]) => (
            <div key={lbl as string} className="flex flex-col gap-0.5 items-center">
              <span className="text-[8px] font-black uppercase text-gray-400">{lbl as string}</span>
              <Num value={val as number} onChange={fn as (v: number) => void} max={9999} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────
const FONT_FAMILIES = [
  { label: "Inter",    value: "Inter" },
  { label: "Mono",     value: "JetBrains Mono, monospace" },
  { label: "Serif",    value: "Playfair Display, Georgia, serif" },
  { label: "System",   value: "system-ui, sans-serif" },
];
const FONT_WEIGHTS = [
  { label: "Thin",     value: "100" }, { label: "Light",  value: "300" },
  { label: "Regular",  value: "400" }, { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" }, { label: "Bold",   value: "700" },
  { label: "Black",    value: "900" },
];
const BLEND_MODES = ["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"].map(v => ({ label: v, value: v }));
const CURSOR_OPTS = ["default","pointer","grab","text","crosshair","not-allowed","zoom-in","move"].map(v => ({ label: v, value: v }));
const OVERFLOW_OPTS = ["visible","hidden","scroll","auto"].map(v => ({ label: v, value: v }));
const OBJECT_FIT_OPTS = ["cover","contain","fill","none","scale-down"].map(v => ({ label: v, value: v }));
const BORDER_STYLES = ["solid","dashed","dotted","double","none"].map(v => ({ label: v, value: v }));
const INPUT_TYPES = ["text","email","password","number","url","tel","search"].map(v => ({ label: v, value: v }));

const isTextLike = (t: string) => ["text","button","badge","input","select","toggle","slider"].includes(t);
const isShapeLike = (t: string) => ["rectangle","ellipse","line","svg"].includes(t);
const isContainer = (t: string) => t === "container";
const isForm = (t: string) => ["input","select","toggle","slider"].includes(t);

// ── Main StylePanel ───────────────────────────────────────────
interface StylePanelProps {
  block: Block;
  allBlocks: Record<string, Block>;
  currentUserName: string;
  onUpdate: (u: Partial<Block>) => void;
  onDelete: () => void;
  onPublish: () => void;
  onFork: () => void;
  onExport: () => void;
  onProposeMerge: () => void;
  onAcceptMerge: (fork: Block) => void;
}

export function StylePanel({ block: b, allBlocks, currentUserName, onUpdate: u, onDelete, onPublish, onFork, onExport, onProposeMerge, onAcceptMerge }: StylePanelProps) {
  const def: Record<string, boolean> = { transform: true, fill: true, typography: isTextLike(b.type), border: true, collab: true };
  const [open, setOpen] = useState<Record<string, boolean>>(def);
  const [showMerges,  setShowMerges]  = useState(true); // open by default so merges are immediately visible
  const [uploading,   setUploading]   = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      u({ imageSrc: url, backgroundType: "image" as const });
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleUploadFile(file);
  };
  const [showIconPicker, setShowIconPicker] = useState(false);

  const tog = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const isFork    = !!b.forkedFrom;
  const isCreator = b.creator === currentUserName;
  const pendingMerges = Object.values(allBlocks).filter((x) => x.forkedFrom === b.id && x.isMergeProposed);

  const paddingT = b.paddingT ?? b.paddingY ?? 0;
  const paddingR = b.paddingR ?? b.paddingX ?? 0;
  const paddingB = b.paddingB ?? b.paddingY ?? 0;
  const paddingL = b.paddingL ?? b.paddingX ?? 0;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-72 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[calc(100vh-100px)] overflow-hidden">
      {/* Header */}
      <div className="bg-black text-white px-4 py-3 border-b-4 border-black shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-500">PROPERTIES</p>
        <p className="text-sm font-black uppercase">{b.type}</p>
      </div>

      <div className="overflow-y-auto flex-1">

        {/* ── Transform ── */}
        <Sec label="TRANSFORM" open={!!open.transform} toggle={() => tog("transform")}>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black uppercase text-gray-500">X</span><Num value={Math.round(b.x)} onChange={(v) => u({ x: v })} min={-9999} max={9999} /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black uppercase text-gray-500">Y</span><Num value={Math.round(b.y)} onChange={(v) => u({ y: v })} min={-9999} max={9999} /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black uppercase text-gray-500">W</span><Num value={Math.round(b.width)} onChange={(v) => u({ width: v })} min={20} max={4000} unit="px" /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black uppercase text-gray-500">H</span><Num value={Math.round(b.height)} onChange={(v) => u({ height: v })} min={10} max={4000} unit="px" /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black uppercase text-gray-500">ROT</span><Num value={b.rotation ?? 0} onChange={(v) => u({ rotation: v })} min={-360} max={360} unit="°" /></div>
            <div className="flex flex-col gap-0.5"><span className="text-[8px] font-black uppercase text-gray-500">OPACITY</span><Num value={b.opacity ?? 100} onChange={(v) => u({ opacity: v })} max={100} unit="%" /></div>
          </div>
          <Row label="SCALE X"><Num value={b.scaleX ?? 1} onChange={(v) => u({ scaleX: v })} min={0.1} max={10} step={0.1} /></Row>
          <Row label="SCALE Y"><Num value={b.scaleY ?? 1} onChange={(v) => u({ scaleY: v })} min={0.1} max={10} step={0.1} /></Row>
          <Row label="Z-INDEX"><Num value={b.zIndex ?? 0} onChange={(v) => u({ zIndex: v })} min={0} max={9999} /></Row>
          <p className="text-[9px] font-bold uppercase text-gray-400 -mt-1">Tip: scroll while selected to change Z</p>
          <Row label="BLEND"><NbSelect value={b.blendMode || "normal"} onChange={(v) => u({ blendMode: v })} options={BLEND_MODES} /></Row>
        </Sec>

        {/* ── Fill ── */}
        {b.type !== "line" && (
          <Sec label="FILL" open={!!open.fill} toggle={() => tog("fill")}>
            <Row label="TYPE">
              <Seg value={(b.backgroundType || "solid") as "solid" | "gradient" | "image"} onChange={(v) => u({ backgroundType: v })}
                options={[{ v: "solid", label: "Solid" }, { v: "gradient", label: "Gradient" }, { v: "image", label: "Image" }]}
              />
            </Row>
            {(!b.backgroundType || b.backgroundType === "solid") && (
              <Row label="COLOR"><ColorInput value={b.backgroundColor} onChange={(v) => u({ backgroundColor: v })} /></Row>
            )}
            {b.backgroundType === "gradient" && (
              <GradientEditor
                stops={b.gradientStops || [{ color: "#6366f1", position: 0 }, { color: "#ec4899", position: 100 }]}
                angle={b.gradientAngle ?? 135}
                type={b.gradientType || "linear"}
                onStops={(s) => u({ gradientStops: s })}
                onAngle={(a) => u({ gradientAngle: a })}
                onType={(t) => u({ gradientType: t as "linear" | "radial" })}
              />
            )}
            {b.backgroundType === "image" && (
              <>
                <Row label="URL"><NbInput value={b.backgroundImage || ""} onChange={(v) => u({ backgroundImage: v })} placeholder="https://…" /></Row>
                <Row label="FIT"><NbSelect value={b.objectFit || "cover"} onChange={(v) => u({ objectFit: v })} options={OBJECT_FIT_OPTS} /></Row>
              </>
            )}
          </Sec>
        )}

        {/* ── Typography ── */}
        {isTextLike(b.type) && (
          <Sec label="TYPOGRAPHY" open={!!open.typography} toggle={() => tog("typography")}>
            <Row label="CONTENT">
              <textarea value={b.content} onChange={(e) => u({ content: e.target.value })} rows={2}
                className="w-full bg-[#f4f4f0] border-2 border-black text-black text-[11px] font-bold px-2 py-1.5 focus:outline-none focus:bg-[#ffe800] transition-colors resize-none"
              />
            </Row>
            <Row label="COLOR"><ColorInput value={b.textColor} onChange={(v) => u({ textColor: v })} /></Row>
            <Row label="FONT"><NbSelect value={b.fontFamily} onChange={(v) => u({ fontFamily: v })} options={FONT_FAMILIES} /></Row>
            <Row label="SIZE"><Num value={b.fontSize} onChange={(v) => u({ fontSize: v })} min={6} max={300} unit="px" /></Row>
            <Row label="WEIGHT"><NbSelect value={b.fontWeight} onChange={(v) => u({ fontWeight: v })} options={FONT_WEIGHTS} /></Row>
            <Row label="LH"><NbInput value={b.lineHeight || "1.5"} onChange={(v) => u({ lineHeight: v })} placeholder="1.5" /></Row>
            <Row label="LS"><NbInput value={b.letterSpacing || "0"} onChange={(v) => u({ letterSpacing: v })} placeholder="0" /></Row>
            <Row label="ALIGN">
              <Seg value={(b.textAlign || "left") as any} onChange={(v) => u({ textAlign: v })}
                options={[
                  { v: "left",    label: <AlignLeft    size={12} strokeWidth={3} />, title: "Left"    },
                  { v: "center",  label: <AlignCenter  size={12} strokeWidth={3} />, title: "Center"  },
                  { v: "right",   label: <AlignRight   size={12} strokeWidth={3} />, title: "Right"   },
                  { v: "justify", label: <AlignJustify size={12} strokeWidth={3} />, title: "Justify" },
                ]}
              />
            </Row>
            <Row label="DECO">
              <Seg value={(b.textDecoration || "none") as any} onChange={(v) => u({ textDecoration: v })}
                options={[{ v: "none", label: "—" }, { v: "underline", label: <span className="underline text-xs">U</span> }, { v: "line-through", label: <span className="line-through text-xs">S</span> }]}
              />
            </Row>
            <Row label="CASE">
              <NbSelect value={b.textTransform || "none"} onChange={(v) => u({ textTransform: v })}
                options={["none","uppercase","lowercase","capitalize"].map(v => ({ label: v, value: v }))}
              />
            </Row>
          </Sec>
        )}

        {/* ── Layout (container) ── */}
        {isContainer(b.type) && (
          <Sec label="LAYOUT" open={!!open.layout} toggle={() => tog("layout")}>
            <Row label="TYPE">
              <Seg value={(b.layoutType || "flex") as "flex" | "grid"} onChange={(v) => u({ layoutType: v })}
                options={[{ v: "flex", label: "Flex" }, { v: "grid", label: "Grid" }]}
              />
            </Row>
            {b.layoutType !== "grid" ? (
              <>
                <Row label="DIR">
                  <Seg value={(b.flexDirection || "row") as "row" | "column"} onChange={(v) => u({ flexDirection: v })}
                    options={[{ v: "row", label: <ArrowRight size={12} strokeWidth={3} />, title: "Row" }, { v: "column", label: <ArrowDown size={12} strokeWidth={3} />, title: "Column" }]}
                  />
                </Row>
                <Row label="ALIGN">
                  <Seg value={(b.alignItems || "flex-start") as any} onChange={(v) => u({ alignItems: v })}
                    options={[{ v: "flex-start", label: "Start" }, { v: "center", label: "Center" }, { v: "flex-end", label: "End" }, { v: "stretch", label: "Stretch" }]}
                  />
                </Row>
                <Row label="JUSTIFY">
                  <Seg value={(b.justifyContent || "flex-start") as any} onChange={(v) => u({ justifyContent: v })}
                    options={[{ v: "flex-start", label: "Start" }, { v: "center", label: "Center" }, { v: "flex-end", label: "End" }, { v: "space-between", label: "Between" }]}
                  />
                </Row>
                <Row label="WRAP">
                  <Seg value={(b.flexWrap || "nowrap") as "nowrap" | "wrap"} onChange={(v) => u({ flexWrap: v })}
                    options={[{ v: "nowrap", label: "No Wrap" }, { v: "wrap", label: "Wrap" }]}
                  />
                </Row>
                <Row label="GAP"><Num value={b.gap || 8} onChange={(v) => u({ gap: v })} max={200} unit="px" /></Row>
              </>
            ) : (
              <>
                <Row label="COLS"><NbInput value={b.gridColumns || "1fr 1fr"} onChange={(v) => u({ gridColumns: v })} placeholder="1fr 1fr" /></Row>
                <Row label="ROWS"><NbInput value={b.gridRows || "auto"} onChange={(v) => u({ gridRows: v })} placeholder="auto" /></Row>
                <Row label="COL GAP"><Num value={b.columnGap ?? 8} onChange={(v) => u({ columnGap: v })} max={200} unit="px" /></Row>
                <Row label="ROW GAP"><Num value={b.rowGap ?? 8} onChange={(v) => u({ rowGap: v })} max={200} unit="px" /></Row>
              </>
            )}
            <Row label="OVERFLOW"><NbSelect value={b.overflow || "visible"} onChange={(v) => u({ overflow: v })} options={OVERFLOW_OPTS} /></Row>
          </Sec>
        )}

        {/* ── Spacing ── */}
        {!["line","icon","shader"].includes(b.type) && (
          <Sec label="SPACING" open={!!open.spacing} toggle={() => tog("spacing")}>
            <Spacing4 label="PADDING" t={paddingT} r={paddingR} b={paddingB} l={paddingL}
              onT={(v) => u({ paddingT: v, paddingY: v })} onR={(v) => u({ paddingR: v, paddingX: v })}
              onB={(v) => u({ paddingB: v })} onL={(v) => u({ paddingL: v })}
            />
            <Spacing4 label="MARGIN" t={b.marginT ?? 0} r={b.marginR ?? 0} b={b.marginB ?? 0} l={b.marginL ?? 0}
              onT={(v) => u({ marginT: v })} onR={(v) => u({ marginR: v })}
              onB={(v) => u({ marginB: v })} onL={(v) => u({ marginL: v })}
            />
          </Sec>
        )}

        {/* ── Border ── */}
        {!["line","shader"].includes(b.type) && (
          <Sec label="BORDER" open={!!open.border} toggle={() => tog("border")}>
            <RadiusEditor b={b} u={u} />
            <Row label="WIDTH"><Num value={b.borderWidth ?? 0} onChange={(v) => u({ borderWidth: v })} max={40} unit="px" /></Row>
            {(b.borderWidth ?? 0) > 0 && (
              <>
                <Row label="STYLE"><NbSelect value={b.borderStyle || "solid"} onChange={(v) => u({ borderStyle: v })} options={BORDER_STYLES} /></Row>
                <Row label="COLOR"><ColorInput value={b.borderColor} onChange={(v) => u({ borderColor: v })} /></Row>
              </>
            )}
          </Sec>
        )}

        {/* ── Shape / Stroke (shapes only) ── */}
        {isShapeLike(b.type) && (
          <Sec label="STROKE" open={!!open.stroke} toggle={() => tog("stroke")}>
            <Row label="COLOR"><ColorInput value={b.strokeColor || "#000"} onChange={(v) => u({ strokeColor: v })} /></Row>
            <Row label="WIDTH"><Num value={b.strokeWidth || 2} onChange={(v) => u({ strokeWidth: v })} max={40} unit="px" /></Row>
            <Row label="STYLE"><NbSelect value={b.strokeStyle || "solid"} onChange={(v) => u({ strokeStyle: v })} options={BORDER_STYLES} /></Row>
            {b.type === "svg" && (
              <>
                <div className="text-[9px] font-black uppercase text-gray-500 mt-1">SVG CODE</div>
                <NbTextarea value={b.svgCode || ""} onChange={(v) => u({ svgCode: v })} rows={4} placeholder="<svg>…</svg>" />
                <Row label="FILL OV"><ColorInput value={b.svgFillOverride || ""} onChange={(v) => u({ svgFillOverride: v })} /></Row>
                <Row label="STR OV"><ColorInput value={b.svgStrokeOverride || ""} onChange={(v) => u({ svgStrokeOverride: v })} /></Row>
              </>
            )}
          </Sec>
        )}

        {/* ── Image ── */}
        {b.type === "image" && (
          <Sec label="MEDIA" open={!!open.media} toggle={() => tog("media")}>
            {/* ── Upload drop-zone ── */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center gap-2 border-4 border-dashed py-5 transition-colors cursor-pointer ${
                dragOver ? "border-[#0066ff] bg-[#0066ff]/10" : "border-black hover:bg-[#ffe800]"
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 size={22} strokeWidth={3} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase">Uploading…</span>
                </>
              ) : b.imageSrc ? (
                <>
                  <img
                    src={b.imageSrc}
                    alt=""
                    className="w-full max-h-28 object-cover border-2 border-black"
                    style={{ pointerEvents: "none" }}
                  />
                  <span className="text-[9px] font-black uppercase text-gray-500">Click or drop to replace</span>
                </>
              ) : (
                <>
                  <ImagePlus size={22} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase">Upload Image</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase">JPEG, PNG, GIF, WebP, SVG — max 10 MB</span>
                </>
              )}

              {/* Clear button */}
              {b.imageSrc && !uploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); u({ imageSrc: "" }); }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#ff0054] border-2 border-black flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <X size={11} strokeWidth={3} className="text-white" />
                </button>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* URL override */}
            <Row label="URL">
              <NbInput value={b.imageSrc || ""} onChange={(v) => u({ imageSrc: v })} placeholder="or paste https://…" />
            </Row>
            <Row label="FIT"><NbSelect value={b.objectFit || "cover"} onChange={(v) => u({ objectFit: v })} options={OBJECT_FIT_OPTS} /></Row>

            <div className="text-[9px] font-black uppercase text-gray-500 mt-1">CSS FILTERS</div>
            <Row label="BRIGHT"><Num value={b.filterBrightness ?? 100} onChange={(v) => u({ filterBrightness: v })} max={200} unit="%" /></Row>
            <Row label="CONTRAST"><Num value={b.filterContrast ?? 100} onChange={(v) => u({ filterContrast: v })} max={200} unit="%" /></Row>
            <Row label="GRAY"><Num value={b.filterGrayscale ?? 0} onChange={(v) => u({ filterGrayscale: v })} max={100} unit="%" /></Row>
            <Row label="SEPIA"><Num value={b.filterSepia ?? 0} onChange={(v) => u({ filterSepia: v })} max={100} unit="%" /></Row>
            <Row label="HUE"><Num value={b.filterHueRotate ?? 0} onChange={(v) => u({ filterHueRotate: v })} max={360} unit="°" /></Row>
          </Sec>
        )}

        {/* ── Icon ── */}
        {b.type === "icon" && (
          <Sec label="ICON" open={!!open.icon} toggle={() => tog("icon")}>
            <button onClick={() => setShowIconPicker(true)}
              className="flex items-center justify-center gap-2 w-full border-2 border-black bg-[#f4f4f0] font-black uppercase text-[11px] py-2 hover:bg-[#ffe800] transition-colors"
            >
              <Code2 size={12} strokeWidth={3} /> {b.iconName || "PICK ICON"}
            </button>
            <Row label="SIZE"><Num value={b.iconSize || 32} onChange={(v) => u({ iconSize: v })} min={8} max={200} unit="px" /></Row>
            <Row label="STROKE"><Num value={b.iconStrokeWidth || 2} onChange={(v) => u({ iconStrokeWidth: v })} min={0.5} max={5} step={0.5} /></Row>
            <Row label="COLOR"><ColorInput value={b.textColor || "#000"} onChange={(v) => u({ textColor: v })} /></Row>
          </Sec>
        )}

        {/* ── Form Controls ── */}
        {isForm(b.type) && (
          <Sec label="COMPONENT" open={!!open.component} toggle={() => tog("component")}>
            {b.type === "input" && (
              <>
                <Row label="PHOLDER"><NbInput value={b.placeholder || ""} onChange={(v) => u({ placeholder: v })} placeholder="Placeholder…" /></Row>
                <Row label="TYPE"><NbSelect value={b.inputType || "text"} onChange={(v) => u({ inputType: v })} options={INPUT_TYPES} /></Row>
                <Row label="MULTI">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!b.inputMultiline} onChange={(e) => u({ inputMultiline: e.target.checked })} />
                    <span className="text-[11px] font-black uppercase">Textarea</span>
                  </label>
                </Row>
                <Row label="FOCUS"><ColorInput value={b.focusRingColor || "#6366f1"} onChange={(v) => u({ focusRingColor: v })} /></Row>
              </>
            )}
            {b.type === "select" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase text-gray-500">OPTIONS (ONE PER LINE)</span>
                <NbTextarea
                  value={(b.selectOptions || ["Option 1", "Option 2"]).join("\n")}
                  onChange={(v) => u({ selectOptions: v.split("\n").filter(Boolean) })}
                  rows={4}
                />
              </div>
            )}
            {b.type === "toggle" && (
              <>
                <Row label="LABEL"><NbInput value={b.content || ""} onChange={(v) => u({ content: v })} placeholder="Label…" /></Row>
                <Row label="ACCENT"><ColorInput value={b.accentColor || "#6366f1"} onChange={(v) => u({ accentColor: v })} /></Row>
                <Row label="STATE">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!b.checked} onChange={(e) => u({ checked: e.target.checked })} />
                    <span className="text-[11px] font-black uppercase">Checked</span>
                  </label>
                </Row>
              </>
            )}
            {b.type === "slider" && (
              <>
                <Row label="MIN"><Num value={b.sliderMin ?? 0} onChange={(v) => u({ sliderMin: v })} min={-1000} max={9999} /></Row>
                <Row label="MAX"><Num value={b.sliderMax ?? 100} onChange={(v) => u({ sliderMax: v })} min={-1000} max={9999} /></Row>
                <Row label="VALUE"><Num value={b.sliderValue ?? 50} onChange={(v) => u({ sliderValue: v })} min={b.sliderMin ?? 0} max={b.sliderMax ?? 100} /></Row>
                <Row label="STEP"><Num value={b.sliderStep ?? 1} onChange={(v) => u({ sliderStep: v })} min={0.01} max={100} step={0.01} /></Row>
                <Row label="TRACK"><ColorInput value={b.sliderTrackColor || "#d4d4d8"} onChange={(v) => u({ sliderTrackColor: v })} /></Row>
                <Row label="FILL"><ColorInput value={b.sliderFillColor || "#6366f1"} onChange={(v) => u({ sliderFillColor: v })} /></Row>
                <Row label="THUMB"><ColorInput value={b.sliderThumbColor || "#fff"} onChange={(v) => u({ sliderThumbColor: v })} /></Row>
              </>
            )}
          </Sec>
        )}

        {/* ── Button variant ── */}
        {b.type === "button" && (
          <Sec label="BUTTON" open={!!open.button} toggle={() => tog("button")}>
            <Row label="LABEL"><NbInput value={b.content || ""} onChange={(v) => u({ content: v })} placeholder="Button label…" /></Row>
            <Row label="VARIANT">
              <Seg value={(b.buttonVariant || "solid") as "solid" | "outline" | "ghost"} onChange={(v) => u({ buttonVariant: v })}
                options={[{ v: "solid", label: "Solid" }, { v: "outline", label: "Outline" }, { v: "ghost", label: "Ghost" }]}
              />
            </Row>
          </Sec>
        )}

        {/* ── Shader ── */}
        {b.type === "shader" && (
          <Sec label="SHADER" open={!!open.shader} toggle={() => tog("shader")}>
            <Row label="TYPE"><NbSelect value={b.shaderType || "fluid"} onChange={(v) => u({ shaderType: v })} options={SHADER_TYPES.map((s) => ({ label: s.label, value: s.id }))} /></Row>
            {b.shaderType !== "custom" && (
              <>
                <Row label="SPEED"><Num value={b.shaderSpeed ?? 1} onChange={(v) => u({ shaderSpeed: v })} min={0} max={10} step={0.1} /></Row>
                <Row label="INTENSITY"><Num value={b.shaderIntensity ?? 0.5} onChange={(v) => u({ shaderIntensity: v })} min={0} max={1} step={0.05} /></Row>
                {["fluid","holographic"].includes(b.shaderType || "fluid") && (
                  <>
                    <Row label="COLOR 1"><ColorInput value={b.shaderColor1 || "#6366f1"} onChange={(v) => u({ shaderColor1: v })} /></Row>
                    <Row label="COLOR 2"><ColorInput value={b.shaderColor2 || "#ec4899"} onChange={(v) => u({ shaderColor2: v })} /></Row>
                  </>
                )}
                {b.shaderType === "fluid" && (
                  <>
                    <Row label="FREQ"><Num value={b.shaderFrequency ?? 6} onChange={(v) => u({ shaderFrequency: v })} min={0.5} max={30} step={0.5} /></Row>
                    <Row label="AMP"><Num value={b.shaderAmplitude ?? 0.2} onChange={(v) => u({ shaderAmplitude: v })} min={0} max={1} step={0.05} /></Row>
                  </>
                )}
                <Row label="ANIMATED">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={b.shaderAnimated !== false} onChange={(e) => u({ shaderAnimated: e.target.checked })} />
                    <span className="text-[11px] font-black uppercase">Live animation</span>
                  </label>
                </Row>
              </>
            )}
            {b.shaderType === "custom" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase text-gray-500">GLSL FRAGMENT CODE</span>
                <NbTextarea value={b.shaderCode || ""} onChange={(v) => u({ shaderCode: v })} rows={8}
                  placeholder={"precision mediump float;\nuniform float u_time;\nuniform vec2 u_res;\nvoid main(){\n  vec2 uv=gl_FragCoord.xy/u_res;\n  gl_FragColor=vec4(uv,sin(u_time)*.5+.5,1.);\n}"}
                />
                <div className="text-[9px] font-black uppercase text-gray-500 leading-relaxed">
                  Uniforms: u_time, u_res, u_c1, u_c2, u_speed, u_intensity, u_freq, u_amp
                </div>
              </div>
            )}
          </Sec>
        )}

        {/* ── Effects ── */}
        <Sec label="EFFECTS" open={!!open.effects} toggle={() => tog("effects")}>
          <ShadowEditor shadows={b.shadows || []} onChange={(s) => u({ shadows: s })} />
          <Row label="BD BLUR"><Num value={b.backdropBlur ?? 0} onChange={(v) => u({ backdropBlur: v })} max={100} unit="px" /></Row>
        </Sec>

        {/* ── Interactivity ── */}
        <Sec label="INTERACTIVITY" open={!!open.interact} toggle={() => tog("interact")}>
          <Row label="CURSOR"><NbSelect value={b.cursorStyle || "default"} onChange={(v) => u({ cursorStyle: v })} options={CURSOR_OPTS} /></Row>
          <Row label="MIN W"><NbInput value={b.minWidth || ""} onChange={(v) => u({ minWidth: v })} placeholder="e.g. 100px" /></Row>
          <Row label="MAX W"><NbInput value={b.maxWidth || ""} onChange={(v) => u({ maxWidth: v })} placeholder="e.g. 800px" /></Row>
        </Sec>

        {/* ── Collaboration ── */}
        <Sec label="COLLABORATION" open={!!open.collab} toggle={() => tog("collab")}>
          {b.isDraft && (
            <NbBtn onClick={onPublish} color="#ff0054" label="PUBLISH TO KOLLEKTIV">
              <Upload size={12} strokeWidth={3} className="text-white" />
            </NbBtn>
          )}
          {!b.isDraft && (
            <NbBtn onClick={onFork} label="FORK COMPONENT">
              <GitFork size={12} strokeWidth={3} />
            </NbBtn>
          )}
          {!b.isDraft && (
            <NbBtn onClick={onExport} color="#00f0b5" label="EXPORT / DOWNLOAD">
              <Download size={12} strokeWidth={3} />
            </NbBtn>
          )}
          {/* Propose merge: available as soon as the fork exists (draft or published) */}
          {isFork && isCreator && !b.isMergeProposed && (
            <NbBtn onClick={onProposeMerge} color="#00f0b5" label="PROPOSE MERGE">
              <GitPullRequest size={12} strokeWidth={3} />
            </NbBtn>
          )}
          {b.isMergeProposed && (
            <div className="flex items-center gap-2 bg-[#00f0b5] border-2 border-black text-black text-[10px] font-black uppercase px-3 py-2">
              <GitPullRequest size={11} strokeWidth={3} /> MERGE REQUEST OPEN
            </div>
          )}
          {!isFork && pendingMerges.length > 0 && (
            <div className="border-2 border-black overflow-hidden">
              <button onClick={() => setShowMerges((v) => !v)}
                className="flex items-center justify-between w-full px-3 py-2 bg-[#0066ff] text-white font-black uppercase text-[11px]"
              >
                <span className="flex items-center gap-1.5"><GitPullRequest size={11} strokeWidth={3} /> {pendingMerges.length} PENDING MERGE{pendingMerges.length > 1 ? "S" : ""}</span>
                {showMerges ? <ChevronUp size={11} strokeWidth={3} /> : <ChevronDown size={11} strokeWidth={3} />}
              </button>
              {showMerges && (
                <div className="divide-y-2 divide-black border-t-2 border-black">
                  {pendingMerges.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-white gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 bg-[#0066ff] border-2 border-black flex items-center justify-center text-[9px] text-white font-black shrink-0">{m.creator?.[0]?.toUpperCase()}</div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase truncate">{m.creator}</p>
                          {m.creatorHandle && (
                            <a href={m.creatorHandle} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="text-[9px] font-bold text-gray-500 hover:text-black flex items-center gap-0.5 uppercase"
                            ><Globe2 size={8} /> @{m.creator}</a>
                          )}
                        </div>
                      </div>
                      <button onClick={() => onAcceptMerge(m)}
                        className="flex items-center gap-1 bg-[#00f0b5] border-2 border-black text-black text-[9px] font-black uppercase px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all shrink-0"
                      ><Check size={10} strokeWidth={3} /> ACCEPT</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Sec>

        {/* ── Delete ── */}
        {(() => {
          // Count all descendants so the button label is precise
          const countDescendants = (parentId: string): number => {
            const children = Object.values(allBlocks).filter((x) => x.parentId === parentId);
            return children.reduce((acc, c) => acc + 1 + countDescendants(c.id), 0);
          };
          const childCount = countDescendants(b.id);
          const label = childCount > 0
            ? `DELETE COMPONENT (${1 + childCount} ELEMENTS)`
            : "DELETE BLOCK";
          return (
            <div className="px-3 py-3 flex flex-col gap-2">
              <button
                onClick={onDelete}
                className="flex items-center justify-center gap-2 w-full bg-white text-black border-2 border-black font-black uppercase text-[11px] py-2 hover:bg-[#ff0054] hover:text-white transition-colors"
              >
                <Trash2 size={12} strokeWidth={3} /> {label}
              </button>
              {childCount > 0 && (
                <p className="text-[9px] font-bold uppercase text-center text-gray-400">
                  This will remove the root and all {childCount} nested element{childCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {showIconPicker && (
        <IconPicker value={b.iconName || "Star"} onChange={(name) => u({ iconName: name })} onClose={() => setShowIconPicker(false)} />
      )}
    </div>
  );
}
