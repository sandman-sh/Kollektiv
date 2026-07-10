import { useRef } from "react";
import { Block } from "../lib/api";
import { GitFork, ExternalLink, LayoutTemplate, Grid3x3, ChevronDown, Lock, Download, GitPullRequest } from "lucide-react";
import { ShaderBlock } from "./ShaderBlock";
import { renderIcon } from "./IconPicker";

// ── Helpers ───────────────────────────────────────────────────

export function radiusStyle(b: Block): string {
  if (b.borderRadiusLinked !== false) return `${b.borderRadius ?? 0}px`;
  return `${b.borderRadiusTL ?? 0}px ${b.borderRadiusTR ?? 0}px ${b.borderRadiusBR ?? 0}px ${b.borderRadiusBL ?? 0}px`;
}

function bgStyle(b: Block): React.CSSProperties {
  if (b.backgroundType === "gradient") {
    const stops = (b.gradientStops || []).map((s) => `${s.color} ${s.position}%`).join(", ");
    const bg = b.gradientType === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${b.gradientAngle ?? 135}deg, ${stops})`;
    return { background: bg };
  }
  if (b.backgroundType === "image" && b.backgroundImage) {
    return { backgroundImage: `url(${b.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  if (!b.backgroundColor || b.backgroundColor === "transparent") return {};
  return { backgroundColor: b.backgroundColor };
}

function shadowStyle(b: Block): string {
  if (b.shadows?.length) {
    return b.shadows.map((s) => `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`).join(", ");
  }
  return b.boxShadow && b.boxShadow !== "none" ? b.boxShadow : "";
}

function filterStyle(b: Block): string {
  const p: string[] = [];
  if ((b.filterBrightness ?? 100) !== 100) p.push(`brightness(${b.filterBrightness}%)`);
  if ((b.filterContrast   ?? 100) !== 100) p.push(`contrast(${b.filterContrast}%)`);
  if ((b.filterGrayscale  ?? 0) !== 0)    p.push(`grayscale(${b.filterGrayscale}%)`);
  if ((b.filterSepia      ?? 0) !== 0)    p.push(`sepia(${b.filterSepia}%)`);
  if ((b.filterHueRotate  ?? 0) !== 0)    p.push(`hue-rotate(${b.filterHueRotate}deg)`);
  return p.join(" ");
}

function masterStyle(b: Block): React.CSSProperties {
  const paddingT = b.paddingT ?? b.paddingY ?? 0;
  const paddingR = b.paddingR ?? b.paddingX ?? 0;
  const paddingB = b.paddingB ?? b.paddingY ?? 0;
  const paddingL = b.paddingL ?? b.paddingX ?? 0;
  return {
    ...bgStyle(b),
    opacity: (b.opacity ?? 100) / 100,
    mixBlendMode: (b.blendMode || "normal") as React.CSSProperties["mixBlendMode"],
    borderRadius: radiusStyle(b),
    border: (b.borderWidth ?? 0) > 0 ? `${b.borderWidth}px ${b.borderStyle || "solid"} ${b.borderColor}` : undefined,
    boxShadow: shadowStyle(b) || undefined,
    backdropFilter: (b.backdropBlur ?? 0) > 0 ? `blur(${b.backdropBlur}px)` : undefined,
    padding: `${paddingT}px ${paddingR}px ${paddingB}px ${paddingL}px`,
    fontFamily: b.fontFamily || "Inter",
    fontSize: `${b.fontSize || 16}px`,
    fontWeight: b.fontWeight || "400",
    color: b.textColor || "#1a1a1a",
    lineHeight: b.lineHeight || "1.5",
    letterSpacing: b.letterSpacing !== "0" ? b.letterSpacing : undefined,
    textAlign: (b.textAlign || "left") as React.CSSProperties["textAlign"],
    textDecoration: b.textDecoration !== "none" ? b.textDecoration : undefined,
    textTransform: (b.textTransform || "none") as React.CSSProperties["textTransform"],
    cursor: b.cursorStyle || "default",
    filter: filterStyle(b) || undefined,
    transform: `rotate(${b.rotation ?? 0}deg) scaleX(${b.scaleX ?? 1}) scaleY(${b.scaleY ?? 1})`,
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
  };
}

// ── Content renderers ─────────────────────────────────────────

function RenderText({ b }: { b: Block }) {
  return <div style={{ ...masterStyle(b), display: "flex", alignItems: "center", overflow: "hidden" }}>{b.content || "Double-click to edit"}</div>;
}

function RenderButton({ b }: { b: Block }) {
  const s = masterStyle(b);
  if (b.buttonVariant === "outline") { s.backgroundColor = "transparent"; s.border = `${Math.max(b.borderWidth||2,2)}px solid ${b.textColor||"#000"}`; }
  if (b.buttonVariant === "ghost")   { s.backgroundColor = "transparent"; s.border = "none"; }
  return <button style={{ ...s, display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none" }}>{b.content || "Button"}</button>;
}

function RenderInput({ b }: { b: Block }) {
  const Comp = b.inputMultiline ? "textarea" : "input";
  return <Comp type={!b.inputMultiline ? (b.inputType || "text") : undefined} placeholder={b.placeholder || b.content || "Enter text…"} readOnly style={{ ...masterStyle(b), resize: "none", outline: "none" }} />;
}

function RenderBadge({ b }: { b: Block }) {
  return <div style={{ ...masterStyle(b), display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" }}>{b.content || "Badge"}</div>;
}

function RenderSelect({ b }: { b: Block }) {
  return (
    <div style={{ ...masterStyle(b), display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
      <span>{b.content || (b.selectOptions?.[0] ?? "Option 1")}</span>
      <ChevronDown size={14} strokeWidth={3} />
    </div>
  );
}

function RenderToggle({ b }: { b: Block }) {
  const accent = b.accentColor || "#6366f1";
  const on = !!b.checked;
  const tw = b.thumbSize || 20;
  const trackW = tw * 2, trackH = tw * 1.1;
  return (
    <div style={{ ...masterStyle(b), display: "flex", alignItems: "center", gap: "10px", userSelect: "none" }}>
      <div style={{ width: trackW, height: trackH, borderRadius: trackH, backgroundColor: on ? accent : "#d4d4d8", border: "2px solid #000", position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 1, left: on ? trackW - tw - 1 : 1, width: tw - 4, height: tw - 4, borderRadius: "50%", backgroundColor: "#fff", border: "2px solid #000", transition: "left .15s" }} />
      </div>
      {b.content && <span style={{ fontSize: `${b.fontSize||14}px`, fontWeight: b.fontWeight||"500" }}>{b.content}</span>}
    </div>
  );
}

function RenderSlider({ b }: { b: Block }) {
  const pct = ((b.sliderValue ?? 50) - (b.sliderMin ?? 0)) / ((b.sliderMax ?? 100) - (b.sliderMin ?? 0)) * 100;
  return (
    <div style={{ ...masterStyle(b), display: "flex", alignItems: "center", gap: "8px", padding: "0 12px" }}>
      <div style={{ flex: 1, height: 6, backgroundColor: b.sliderTrackColor || "#d4d4d8", border: "2px solid #000", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, backgroundColor: b.sliderFillColor || "#6366f1" }} />
        <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%,-50%)", width: 18, height: 18, borderRadius: "50%", backgroundColor: b.sliderThumbColor||"#fff", border: "2px solid #000", boxShadow: "1px 1px 0 rgba(0,0,0,1)" }} />
      </div>
    </div>
  );
}

// Container renders children as absolutely-positioned nested BlockItems
function RenderContainer({ b, childBlocks, renderChild }: { b: Block; childBlocks: Block[]; renderChild: (c: Block) => React.ReactNode }) {
  const isGrid = b.layoutType === "grid";
  const paddingT = b.paddingT ?? b.paddingY ?? 0;
  const paddingR = b.paddingR ?? b.paddingX ?? 0;
  const paddingB = b.paddingB ?? b.paddingY ?? 0;
  const paddingL = b.paddingL ?? b.paddingX ?? 0;
  return (
    <div style={{
      ...bgStyle(b),
      borderRadius: radiusStyle(b),
      border: (b.borderWidth??0) > 0 ? `${b.borderWidth}px ${b.borderStyle||"solid"} ${b.borderColor}` : undefined,
      boxShadow: shadowStyle(b) || undefined,
      opacity: (b.opacity??100)/100,
      width: "100%", height: "100%", boxSizing: "border-box",
      position: "relative",
      overflow: b.overflow === "hidden" ? "hidden" : "visible",
    }}>
      {/* Actual content area (padded) with absolutely positioned children */}
      <div style={{ position: "absolute", top: paddingT, right: paddingR, bottom: paddingB, left: paddingL, overflow: "visible" }}>
        {childBlocks.map((child) => (
          <div
            key={child.id}
            style={{ position: "absolute", left: child.x, top: child.y, width: child.width, height: child.height }}
          >
            {renderChild(child)}
          </div>
        ))}
        {childBlocks.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.2, pointerEvents: "none" }}>
            {isGrid ? <Grid3x3 size={22} /> : <LayoutTemplate size={22} />}
            <span style={{ fontFamily: "Inter", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {isGrid ? "Grid" : "Flex"} — drag elements inside
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderRectangle({ b }: { b: Block }) { return <div style={masterStyle(b)} />; }
function RenderEllipse({ b }: { b: Block })   { return <div style={{ ...masterStyle(b), borderRadius: "50%" }} />; }

function RenderLine({ b }: { b: Block }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
      <div style={{ width: "100%", height: `${b.strokeWidth || 4}px`, backgroundColor: b.strokeColor || b.backgroundColor || "#000" }} />
    </div>
  );
}

function RenderSvg({ b }: { b: Block }) {
  let code = b.svgCode || "";
  if (b.svgFillOverride)   code = code.replace(/fill="[^"]*"/g,   `fill="${b.svgFillOverride}"`);
  if (b.svgStrokeOverride) code = code.replace(/stroke="[^"]*"/g, `stroke="${b.svgStrokeOverride}"`);
  return <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }} dangerouslySetInnerHTML={{ __html: code.replace(/<svg/, '<svg width="100%" height="100%"') }} />;
}

function RenderImage({ b }: { b: Block }) {
  if (b.imageSrc) {
    return <img src={b.imageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: (b.objectFit as any)||"cover", display: "block", borderRadius: radiusStyle(b), filter: filterStyle(b)||undefined }} />;
  }
  return (
    <div style={{ ...masterStyle(b), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={b.textColor||"#999"} strokeWidth="1.5" opacity={0.35}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );
}

function RenderIcon({ b }: { b: Block }) {
  const icon = renderIcon(b.iconName||"Star", b.iconSize||32, b.iconStrokeWidth||2, b.textColor||"#000");
  return <div style={{ ...masterStyle(b), display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>;
}

// ── Main component ────────────────────────────────────────────

export interface BlockItemProps {
  block: Block;
  isSelected: boolean;
  currentUserName: string;
  scale: number;
  /** True when rendered inside a container — no absolute positioning, fills wrapper div */
  contained?: boolean;
  /** Called after a drag completes so parent can detect container drops */
  onDragEnd?: () => void;
  /** Child blocks for container type */
  childBlocks?: Block[];
  /** Function to render a child block (provides recursion) */
  renderChild?: (b: Block) => React.ReactNode;
  onSelect: () => void;
  onUpdate: (u: Partial<Block>) => void;
  onFork: () => void;
  onExport?: () => void;
  hasPendingMerge?: boolean;
}

export function BlockItem({ block: b, isSelected, currentUserName, scale, contained = false, onDragEnd, childBlocks = [], renderChild, onSelect, onUpdate, onFork, onExport, hasPendingMerge }: BlockItemProps) {
  const drag = useRef<{ cx: number; cy: number; bx: number; by: number; moved: boolean } | null>(null);

  // ── Ownership lock ────────────────────────────────────────
  // Drafts belong exclusively to their creator until they're published. Other
  // users can SEE the in-progress component but cannot select / move / resize
  // / edit it. Once published, anyone may fork it.
  const isOwnedByMe = !b.creator || b.creator === currentUserName;
  const isLocked    = b.isDraft && !isOwnedByMe;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (isLocked) {
      // Eat the click so the canvas doesn't deselect the user's own selection
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    drag.current = { cx: e.clientX, cy: e.clientY, bx: b.x, by: b.y, moved: false };

    const onMove = (ev: PointerEvent) => {
      if (!drag.current) return;
      const dx = ev.clientX - drag.current.cx, dy = ev.clientY - drag.current.cy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        drag.current.moved = true;
        onUpdate({ x: drag.current.bx + dx / scale, y: drag.current.by + dy / scale });
      }
    };
    const onUp = () => {
      if (drag.current?.moved) onDragEnd?.();
      else if (!drag.current?.moved) onSelect();
      drag.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleResize = (e: React.PointerEvent, corner: "se"|"sw"|"ne"|"nw") => {
    if (isLocked) { e.stopPropagation(); return; }
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, sw = b.width, sh = b.height, spx = b.x, spy = b.y;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx)/scale, dy = (ev.clientY - sy)/scale;
      const u: Partial<Block> = {};
      if (corner.includes("e")) u.width  = Math.max(40, sw + dx);
      if (corner.includes("s")) u.height = Math.max(20, sh + dy);
      if (corner.includes("w")) { u.width = Math.max(40, sw - dx); u.x = spx + dx; }
      if (corner.includes("n")) { u.height = Math.max(20, sh - dy); u.y = spy + dy; }
      onUpdate(u);
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const creditName = [b.creator, ...(b.contributors?.map((c) => c.name) ?? [])].join(" · ");

  const content = (() => {
    switch (b.type) {
      case "text":      return <RenderText b={b} />;
      case "button":    return <RenderButton b={b} />;
      case "badge":     return <RenderBadge b={b} />;
      case "input":     return <RenderInput b={b} />;
      case "select":    return <RenderSelect b={b} />;
      case "toggle":    return <RenderToggle b={b} />;
      case "slider":    return <RenderSlider b={b} />;
      case "container": return <RenderContainer b={b} childBlocks={childBlocks} renderChild={renderChild ?? (() => null)} />;
      case "rectangle": return <RenderRectangle b={b} />;
      case "ellipse":   return <RenderEllipse b={b} />;
      case "line":      return <RenderLine b={b} />;
      case "svg":       return <RenderSvg b={b} />;
      case "image":     return <RenderImage b={b} />;
      case "icon":      return <RenderIcon b={b} />;
      case "shader":    return <ShaderBlock block={b} />;
      default:          return null;
    }
  })();

  // Z-layering: base z-index comes from the block itself (controlled by scroll).
  // Selection adds a flat +1000 boost so the active block is always reachable
  // even if other blocks were scrolled to high values.
  const baseZ = (b.zIndex ?? 0) + 10;
  const z     = isSelected ? baseZ + 1000 : baseZ;

  // Wrapper: absolute on canvas for root blocks, fills div for nested children
  const wrapperStyle: React.CSSProperties = contained
    ? { width: "100%", height: "100%", position: "relative", zIndex: z }
    : { left: b.x, top: b.y, width: b.width, height: b.height, position: "absolute", zIndex: z };

  return (
    <div
      style={{ ...wrapperStyle, cursor: isLocked ? "not-allowed" : undefined }}
      className="group"
      onPointerDown={handlePointerDown}
    >
      {/* Selection ring (only when WE selected it) */}
      {isSelected && (
        <div className="absolute pointer-events-none z-30" style={{ inset: -4, border: "4px solid #000", boxShadow: "4px 4px 0px 0px #ffe800" }} />
      )}

      {/* Lock ring — when another user is building this draft */}
      {isLocked && (
        <div
          className="absolute pointer-events-none z-30"
          style={{
            inset: -3,
            border: "3px dashed #0066ff",
            background: "rgba(0,102,255,0.05)",
          }}
        />
      )}

      {/* Content */}
      <div
        className="w-full h-full relative overflow-visible"
        style={{
          borderRadius: radiusStyle(b),
          // Locked-but-from-others: subtly tone down so it's clear it's not yours
          opacity: isLocked ? 0.85 : undefined,
          pointerEvents: isLocked ? "none" : undefined,
        }}
      >
        {content}
      </div>

      {/* Action buttons (hover, published, not contained) */}
      {!b.isDraft && !contained && (
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
          {onExport && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onExport(); }}
              title="Export this component"
              className="flex items-center gap-1.5 bg-white border-2 border-black text-black text-[10px] font-black uppercase px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#00f0b5] active:shadow-none active:translate-y-px transition-all"
            >
              <Download size={10} strokeWidth={3} /> GET
            </button>
          )}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onFork(); }}
            title="Fork this component"
            className="flex items-center gap-1.5 bg-white border-2 border-black text-black text-[10px] font-black uppercase px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffe800] active:shadow-none active:translate-y-px transition-all"
          >
            <GitFork size={10} strokeWidth={3} /> FORK
          </button>
        </div>
      )}

      {/* Status badges */}
      {/* Own draft → small yellow "DRAFT" pill on hover */}
      {b.isDraft && isOwnedByMe && (
        <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          <div className="bg-[#ffe800] border-2 border-black text-black text-[9px] font-black uppercase px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">DRAFT</div>
        </div>
      )}
      {/* Locked by another user — always visible, with creator's name */}
      {isLocked && (
        <div className="absolute -top-7 left-0 z-40 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-[#0066ff] text-white border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
            <Lock size={10} strokeWidth={3} />
            {b.creator} is building…
          </div>
        </div>
      )}
      {!b.isDraft && b.forkedFrom && (
        <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none">
          <div className="flex items-center gap-1 bg-[#0066ff] border-2 border-black text-white text-[9px] font-black uppercase px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"><GitFork size={8} strokeWidth={3} /> FORK</div>
        </div>
      )}
      {b.isMergeProposed && (
        <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none">
          <div className="bg-[#00f0b5] border-2 border-black text-black text-[9px] font-black uppercase px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">PR OPEN</div>
        </div>
      )}

      {/* Incoming merge badge on the ORIGINAL block — always visible to alert the creator */}
      {hasPendingMerge && !contained && (
        <div className="absolute -top-7 left-0 z-40 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-[#0066ff] text-white border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap animate-pulse">
            <GitPullRequest size={10} strokeWidth={3} />
            MERGE REQUEST — SELECT TO REVIEW
          </div>
        </div>
      )}

      {/* Credit tag (published, not nested) */}
      {!b.isDraft && b.creator && !contained && (
        <div className="absolute -bottom-7 left-0 z-20 pointer-events-auto">
          {b.creatorHandle ? (
            <a href={b.creatorHandle} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-black text-white text-[10px] font-black uppercase px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffe800] hover:text-black transition-colors whitespace-nowrap"
            >Built by {creditName} <ExternalLink size={9} strokeWidth={3} /></a>
          ) : (
            <div className="flex items-center gap-1.5 bg-black text-white text-[10px] font-black uppercase px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">Built by {creditName}</div>
          )}
        </div>
      )}

      {/* Resize handles */}
      {isSelected && (["nw","ne","sw","se"] as const).map((c) => (
        <div key={c} className="absolute w-3 h-3 bg-black z-40 hover:bg-[#ffe800] transition-colors border-2 border-black"
          style={{ top: c.includes("n") ? -6 : undefined, bottom: c.includes("s") ? -6 : undefined, left: c.includes("w") ? -6 : undefined, right: c.includes("e") ? -6 : undefined, cursor: `${c}-resize` }}
          onPointerDown={(e) => { e.stopPropagation(); handleResize(e, c); }}
        />
      ))}
    </div>
  );
}
