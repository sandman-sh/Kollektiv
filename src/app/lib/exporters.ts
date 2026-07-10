// Exporters: convert a Kollektiv Block (and its nested children) into
// downloadable code in various formats so designers can take any published
// component into their own projects.

import type { Block } from "./api";

// ── Helpers ──────────────────────────────────────────────────

function radius(b: Block): string {
  if (b.borderRadiusLinked !== false) return `${b.borderRadius ?? 0}px`;
  return `${b.borderRadiusTL ?? 0}px ${b.borderRadiusTR ?? 0}px ${b.borderRadiusBR ?? 0}px ${b.borderRadiusBL ?? 0}px`;
}

function background(b: Block): string | undefined {
  if (b.backgroundType === "gradient") {
    const stops = (b.gradientStops || []).map((s) => `${s.color} ${s.position}%`).join(", ");
    return b.gradientType === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${b.gradientAngle ?? 135}deg, ${stops})`;
  }
  if (b.backgroundType === "image" && b.backgroundImage) {
    return `url("${b.backgroundImage}") center/cover`;
  }
  if (b.backgroundColor && b.backgroundColor !== "transparent") return b.backgroundColor;
  return undefined;
}

function boxShadow(b: Block): string | undefined {
  if (b.shadows?.length) {
    return b.shadows
      .map((s) => `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`)
      .join(", ");
  }
  return b.boxShadow && b.boxShadow !== "none" ? b.boxShadow : undefined;
}

function filter(b: Block): string | undefined {
  const p: string[] = [];
  if ((b.filterBrightness ?? 100) !== 100) p.push(`brightness(${b.filterBrightness}%)`);
  if ((b.filterContrast   ?? 100) !== 100) p.push(`contrast(${b.filterContrast}%)`);
  if ((b.filterGrayscale  ?? 0)   !== 0)   p.push(`grayscale(${b.filterGrayscale}%)`);
  if ((b.filterSepia      ?? 0)   !== 0)   p.push(`sepia(${b.filterSepia}%)`);
  if ((b.filterHueRotate  ?? 0)   !== 0)   p.push(`hue-rotate(${b.filterHueRotate}deg)`);
  return p.length ? p.join(" ") : undefined;
}

/** Build a CSS style object for a single block (no positioning). */
export function styleObject(b: Block, isRoot: boolean): Record<string, string | number> {
  const s: Record<string, string | number> = {};
  const bg = background(b);                if (bg)        s.background     = bg;
  if ((b.opacity ?? 100) !== 100)          s.opacity      = (b.opacity ?? 100) / 100;
  if (b.blendMode && b.blendMode !== "normal") s.mixBlendMode = b.blendMode;
  s.borderRadius = radius(b);
  if ((b.borderWidth ?? 0) > 0) s.border = `${b.borderWidth}px ${b.borderStyle || "solid"} ${b.borderColor}`;
  const sh = boxShadow(b);                 if (sh)        s.boxShadow      = sh;
  if ((b.backdropBlur ?? 0) > 0)           s.backdropFilter = `blur(${b.backdropBlur}px)`;
  const pT = b.paddingT ?? b.paddingY ?? 0;
  const pR = b.paddingR ?? b.paddingX ?? 0;
  const pB = b.paddingB ?? b.paddingY ?? 0;
  const pL = b.paddingL ?? b.paddingX ?? 0;
  if (pT||pR||pB||pL) s.padding = `${pT}px ${pR}px ${pB}px ${pL}px`;
  if (b.fontFamily)                        s.fontFamily   = b.fontFamily;
  if (b.fontSize)                          s.fontSize     = `${b.fontSize}px`;
  if (b.fontWeight)                        s.fontWeight   = b.fontWeight;
  if (b.textColor)                         s.color        = b.textColor;
  if (b.lineHeight && b.lineHeight !== "1.5") s.lineHeight = b.lineHeight;
  if (b.letterSpacing && b.letterSpacing !== "0") s.letterSpacing = b.letterSpacing;
  if (b.textAlign && b.textAlign !== "left") s.textAlign = b.textAlign;
  if (b.textTransform && b.textTransform !== "none") s.textTransform = b.textTransform;
  const f = filter(b);                     if (f)         s.filter       = f;
  if ((b.rotation ?? 0) !== 0 || (b.scaleX ?? 1) !== 1 || (b.scaleY ?? 1) !== 1) {
    s.transform = `rotate(${b.rotation ?? 0}deg) scaleX(${b.scaleX ?? 1}) scaleY(${b.scaleY ?? 1})`;
  }
  if (b.type === "container") {
    if (b.layoutType === "grid") {
      s.display = "grid";
      s.gridTemplateColumns = b.gridColumns || "1fr 1fr";
      if (b.gridRows) s.gridTemplateRows = b.gridRows;
      s.gap = `${b.rowGap ?? b.gap ?? 8}px ${b.columnGap ?? b.gap ?? 8}px`;
    } else {
      s.display = "flex";
      s.flexDirection = b.flexDirection || "row";
      s.alignItems = b.alignItems || "flex-start";
      s.justifyContent = b.justifyContent || "flex-start";
      if (b.flexWrap && b.flexWrap !== "nowrap") s.flexWrap = b.flexWrap;
      if (b.gap) s.gap = `${b.gap}px`;
    }
  }
  if (b.cursorStyle && b.cursorStyle !== "default") s.cursor = b.cursorStyle;
  if (b.overflow && b.overflow !== "visible") s.overflow = b.overflow;
  s.width  = isRoot ? `${b.width}px`  : "100%";
  s.height = isRoot ? `${b.height}px` : "100%";
  s.boxSizing = "border-box";
  return s;
}

// Convert a CSS-style object to inline `style="..."` string (kebab-case keys)
function inlineCss(s: Record<string, string | number>): string {
  return Object.entries(s)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v}`)
    .join("; ");
}

// Same but as a JS object literal string (camelCase keys, for React)
function jsxStyle(s: Record<string, string | number>): string {
  return "{ " + Object.entries(s)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`)
    .join(", ") + " }";
}

function escapeText(t: string): string {
  return (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── HTML exporter ────────────────────────────────────────────

function blockToHtml(b: Block, allBlocks: Record<string, Block>, isRoot = true, indent = 0): string {
  const pad = "  ".repeat(indent);
  const style = inlineCss(styleObject(b, isRoot));
  const children = Object.values(allBlocks).filter((x) => x.parentId === b.id);

  const inner: string = (() => {
    switch (b.type) {
      case "text":    return escapeText(b.content || "");
      case "button":  return `<button style="${style}">${escapeText(b.content || "Button")}</button>`;
      case "badge":   return escapeText(b.content || "Badge");
      case "input":   return `<input type="${b.inputType||"text"}" placeholder="${escapeText(b.placeholder||"")}" style="${style}" />`;
      case "select":  return `<select style="${style}">${(b.selectOptions||[]).map((o)=>`<option>${escapeText(o)}</option>`).join("")}</select>`;
      case "image":   return b.imageSrc ? `<img src="${b.imageSrc}" alt="" style="${style}; object-fit: ${b.objectFit||"cover"}" />` : "";
      case "svg":     return b.svgCode || "";
      case "line":    return `<div style="width:100%;height:${b.strokeWidth||4}px;background:${b.strokeColor||"#000"}"></div>`;
      case "container": {
        const kids = children.map((c) => blockToHtml(c, allBlocks, false, indent + 1)).join("\n");
        return kids ? `\n${kids}\n${pad}` : "";
      }
      default: return "";
    }
  })();

  // For self-closing returns (button/input/select/img), they already include style
  if (["button", "input", "select", "image", "svg"].includes(b.type)) {
    return `${pad}${inner}`;
  }
  return `${pad}<div style="${style}">${inner}</div>`;
}

export function exportHtml(root: Block, all: Record<string, Block>): string {
  const credits = [root.creator, ...(root.contributors?.map((c) => c.name) ?? [])].join(", ");
  return [
    `<!-- Built by ${credits} on Kollektiv -->`,
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <title>${escapeText(root.content || root.type)} — Kollektiv export</title>`,
    `  <link rel="preconnect" href="https://fonts.googleapis.com" />`,
    `  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />`,
    `  <style>body { margin: 40px; font-family: Inter, sans-serif; background: #f4f4f0; }</style>`,
    `</head>`,
    `<body>`,
    blockToHtml(root, all, true, 1),
    `</body>`,
    `</html>`,
  ].join("\n");
}

// ── React exporter ───────────────────────────────────────────

function pascalCase(s: string): string {
  return s.replace(/(^\w|[-_\s]\w)/g, (m) => m.replace(/[-_\s]/, "").toUpperCase());
}

function blockToReact(b: Block, all: Record<string, Block>, isRoot = true, indent = 0): string {
  const pad = "  ".repeat(indent);
  const style = jsxStyle(styleObject(b, isRoot));
  const children = Object.values(all).filter((x) => x.parentId === b.id);

  switch (b.type) {
    case "text":
      return `${pad}<div style={${style}}>${escapeText(b.content || "")}</div>`;

    case "button":
      return `${pad}<button style={${style}}>${escapeText(b.content || "Button")}</button>`;

    case "badge":
      return `${pad}<span style={${style}}>${escapeText(b.content || "Badge")}</span>`;

    case "input":
      return `${pad}<input type="${b.inputType||"text"}" placeholder="${escapeText(b.placeholder||"")}" style={${style}} />`;

    case "select":
      return `${pad}<select style={${style}}>\n` +
        (b.selectOptions||[]).map((o) => `${pad}  <option>${escapeText(o)}</option>`).join("\n") +
        `\n${pad}</select>`;

    case "image":
      return b.imageSrc
        ? `${pad}<img src="${b.imageSrc}" alt="" style={{ ...${style}, objectFit: "${b.objectFit||"cover"}" }} />`
        : `${pad}<div style={${style}} />`;

    case "svg":
      return `${pad}<div style={${style}} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(b.svgCode || "")} }} />`;

    case "line":
      return `${pad}<div style={{ width: "100%", height: ${b.strokeWidth||4}, background: ${JSON.stringify(b.strokeColor||"#000")} }} />`;

    case "container": {
      if (!children.length) return `${pad}<div style={${style}} />`;
      const kids = children.map((c) => blockToReact(c, all, false, indent + 1)).join("\n");
      return `${pad}<div style={${style}}>\n${kids}\n${pad}</div>`;
    }

    case "rectangle":
    case "ellipse":
      return `${pad}<div style={${style}} />`;

    default:
      return `${pad}<div style={${style}} />`;
  }
}

export function exportReact(root: Block, all: Record<string, Block>): string {
  const credits = [root.creator, ...(root.contributors?.map((c) => c.name) ?? [])].join(", ");
  const name = pascalCase(root.content || root.type || "Component") || "Component";
  return [
    `// Built by ${credits} on Kollektiv`,
    ``,
    `export function ${name}() {`,
    `  return (`,
    blockToReact(root, all, true, 2),
    `  );`,
    `}`,
  ].join("\n");
}

// ── CSS-only exporter ────────────────────────────────────────

export function exportCss(root: Block, all: Record<string, Block>): string {
  const lines: string[] = [
    `/* Built by ${root.creator} on Kollektiv */`,
    ``,
  ];

  const emit = (b: Block, isRoot: boolean) => {
    const s = styleObject(b, isRoot);
    const cls = `.kollektiv-${b.type}-${b.id.slice(0, 6)}`;
    lines.push(`${cls} {`);
    for (const [k, v] of Object.entries(s)) {
      const key = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      lines.push(`  ${key}: ${v};`);
    }
    lines.push(`}`, ``);
    // Children
    Object.values(all).filter((x) => x.parentId === b.id).forEach((c) => emit(c, false));
  };
  emit(root, true);
  return lines.join("\n");
}

// ── JSON exporter ────────────────────────────────────────────

export function exportJson(root: Block, all: Record<string, Block>): string {
  // Collect root + all descendants
  const collected: Record<string, Block> = {};
  const walk = (id: string) => {
    const b = all[id];
    if (!b) return;
    collected[id] = b;
    Object.values(all).filter((x) => x.parentId === id).forEach((c) => walk(c.id));
  };
  walk(root.id);

  return JSON.stringify({
    kollektivVersion: "1.0",
    rootId: root.id,
    creator: root.creator,
    creatorHandle: root.creatorHandle,
    contributors: root.contributors,
    blocks: Object.values(collected),
  }, null, 2);
}

// ── Download helper ──────────────────────────────────────────

export function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
