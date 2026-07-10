import { projectId, publicAnonKey } from "/utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0de39c1e`;
const authHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`,
};

export interface GradientStop { color: string; position: number }
export interface Shadow { x: number; y: number; blur: number; spread: number; color: string; inset: boolean }
export interface Contributor { name: string; handle: string }

export type BlockType =
  | "text" | "button" | "badge" | "input" | "select" | "toggle" | "slider"
  | "container" | "rectangle" | "ellipse" | "line" | "svg"
  | "image" | "icon" | "shader";

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;

  // Transform
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  blendMode: string;
  zIndex: number;

  // Background
  backgroundColor: string;
  backgroundType: "solid" | "gradient" | "image";
  gradientType: "linear" | "radial";
  gradientAngle: number;
  gradientStops: GradientStop[];
  backgroundImage: string;

  // Typography
  textColor: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  textDecoration: string;
  textTransform: string;

  // Border
  borderRadius: number;
  borderRadiusLinked: boolean;
  borderRadiusTL: number;
  borderRadiusTR: number;
  borderRadiusBR: number;
  borderRadiusBL: number;
  borderWidth: number;
  borderStyle: string;
  borderColor: string;

  // Spacing
  paddingX: number;
  paddingY: number;
  paddingT: number;
  paddingR: number;
  paddingB: number;
  paddingL: number;
  marginT: number;
  marginR: number;
  marginB: number;
  marginL: number;

  // Constraints
  minWidth: string;
  maxWidth: string;
  overflow: string;

  // Layout (container)
  layoutType: "flex" | "grid" | "none";
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
  flexWrap: string;
  gap: number;
  gridColumns: string;
  gridRows: string;
  columnGap: number;
  rowGap: number;

  // Effects
  boxShadow: string;
  shadows: Shadow[];
  backdropBlur: number;

  // Interactivity
  cursorStyle: string;

  // Image / Media
  imageSrc: string;
  objectFit: string;
  filterBrightness: number;
  filterContrast: number;
  filterGrayscale: number;
  filterSepia: number;
  filterHueRotate: number;

  // Shape
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: string;

  // SVG
  svgCode: string;
  svgFillOverride: string;
  svgStrokeOverride: string;

  // Button
  buttonVariant: "solid" | "outline" | "ghost";

  // Input / Form
  inputType: string;
  placeholder: string;
  focusRingColor: string;
  inputMultiline: boolean;

  // Select
  selectOptions: string[];

  // Toggle
  checked: boolean;
  accentColor: string;
  thumbSize: number;

  // Slider
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  sliderValue: number;
  sliderTrackColor: string;
  sliderFillColor: string;
  sliderThumbColor: string;

  // Icon
  iconName: string;
  iconSize: number;
  iconStrokeWidth: number;

  // Shader
  shaderType: string;
  shaderCode: string;
  shaderSpeed: number;
  shaderIntensity: number;
  shaderColor1: string;
  shaderColor2: string;
  shaderFrequency: number;
  shaderAmplitude: number;
  shaderAnimated: boolean;

  // Nesting
  parentId: string | null;

  // Publishing
  isDraft: boolean;
  creator: string;
  creatorHandle: string;
  contributors: Contributor[];
  forkedFrom: string | null;
  isMergeProposed: boolean;
}

// ── Base defaults shared by all types ───────────────────────
const BASE: Omit<Block, "id" | "x" | "y" | "type" | "width" | "height" | "content" | "isDraft" | "creator" | "creatorHandle" | "contributors" | "forkedFrom" | "isMergeProposed" | "parentId"> = {
  rotation: 0, scaleX: 1, scaleY: 1, opacity: 100, blendMode: "normal", zIndex: 0,
  backgroundColor: "transparent", backgroundType: "solid",
  gradientType: "linear", gradientAngle: 135,
  gradientStops: [{ color: "#6366f1", position: 0 }, { color: "#ec4899", position: 100 }],
  backgroundImage: "",
  textColor: "#1a1a1a", fontSize: 16, fontWeight: "400", fontFamily: "Inter",
  lineHeight: "1.5", letterSpacing: "0", textAlign: "left",
  textDecoration: "none", textTransform: "none",
  borderRadius: 0, borderRadiusLinked: true,
  borderRadiusTL: 0, borderRadiusTR: 0, borderRadiusBR: 0, borderRadiusBL: 0,
  borderWidth: 0, borderStyle: "solid", borderColor: "#000000",
  paddingX: 0, paddingY: 0, paddingT: 0, paddingR: 0, paddingB: 0, paddingL: 0,
  marginT: 0, marginR: 0, marginB: 0, marginL: 0,
  minWidth: "", maxWidth: "", overflow: "visible",
  layoutType: "none", flexDirection: "row", alignItems: "flex-start",
  justifyContent: "flex-start", flexWrap: "nowrap", gap: 8,
  gridColumns: "1fr 1fr", gridRows: "auto auto", columnGap: 8, rowGap: 8,
  boxShadow: "none", shadows: [], backdropBlur: 0,
  cursorStyle: "default",
  imageSrc: "", objectFit: "cover",
  filterBrightness: 100, filterContrast: 100, filterGrayscale: 0, filterSepia: 0, filterHueRotate: 0,
  strokeColor: "#000000", strokeWidth: 2, strokeStyle: "solid",
  svgCode: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="currentColor"/></svg>',
  svgFillOverride: "", svgStrokeOverride: "",
  buttonVariant: "solid",
  inputType: "text", placeholder: "", focusRingColor: "#6366f1", inputMultiline: false,
  selectOptions: ["Option 1", "Option 2", "Option 3"],
  checked: false, accentColor: "#6366f1", thumbSize: 20,
  sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderValue: 50,
  sliderTrackColor: "#d4d4d8", sliderFillColor: "#6366f1", sliderThumbColor: "#ffffff",
  iconName: "Star", iconSize: 32, iconStrokeWidth: 2,
  shaderType: "fluid", shaderCode: "",
  shaderSpeed: 1, shaderIntensity: 0.5, shaderColor1: "#6366f1", shaderColor2: "#ec4899",
  shaderFrequency: 6, shaderAmplitude: 0.2, shaderAnimated: true,
};

export const BLOCK_DEFAULTS: Record<string, Omit<Block, "id" | "x" | "y" | "isDraft" | "creator" | "creatorHandle" | "contributors" | "forkedFrom" | "isMergeProposed" | "parentId">> = {
  text: { ...BASE, type: "text", width: 200, height: 48, content: "Hello, world",
    backgroundColor: "transparent", textColor: "#1a1a1a" },

  button: { ...BASE, type: "button", width: 140, height: 44, content: "Click Me",
    backgroundColor: "#6366f1", textColor: "#ffffff", fontSize: 14, fontWeight: "600",
    borderRadius: 8, paddingT: 10, paddingR: 20, paddingB: 10, paddingL: 20, buttonVariant: "solid" },

  badge: { ...BASE, type: "badge", width: 80, height: 28, content: "Badge",
    backgroundColor: "#f4f4f5", textColor: "#71717a", fontSize: 12, fontWeight: "500",
    borderRadius: 9999, paddingT: 4, paddingR: 10, paddingB: 4, paddingL: 10 },

  input: { ...BASE, type: "input", width: 240, height: 44, content: "",
    backgroundColor: "#ffffff", textColor: "#1a1a1a", fontSize: 14,
    borderWidth: 2, borderColor: "#000000", borderRadius: 0,
    paddingT: 10, paddingR: 12, paddingB: 10, paddingL: 12, placeholder: "Enter text…" },

  select: { ...BASE, type: "select", width: 200, height: 44, content: "Option 1",
    backgroundColor: "#ffffff", textColor: "#1a1a1a", fontSize: 14,
    borderWidth: 2, borderColor: "#000000", borderRadius: 0,
    paddingT: 10, paddingR: 32, paddingB: 10, paddingL: 12 },

  toggle: { ...BASE, type: "toggle", width: 100, height: 40, content: "Label",
    backgroundColor: "transparent", textColor: "#1a1a1a", fontSize: 14,
    accentColor: "#6366f1", checked: false, thumbSize: 20 },

  slider: { ...BASE, type: "slider", width: 240, height: 48, content: "",
    backgroundColor: "transparent",
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderValue: 50,
    sliderTrackColor: "#e4e4e7", sliderFillColor: "#6366f1", sliderThumbColor: "#ffffff" },

  container: { ...BASE, type: "container", width: 320, height: 200, content: "",
    backgroundColor: "#f4f4f0", borderWidth: 4, borderColor: "#000000",
    boxShadow: "none",
    paddingT: 16, paddingR: 16, paddingB: 16, paddingL: 16,
    layoutType: "flex", flexDirection: "column", gap: 8 },

  rectangle: { ...BASE, type: "rectangle", width: 160, height: 100, content: "",
    backgroundColor: "#ffe800", borderWidth: 4, borderColor: "#000000",
    boxShadow: "none" },

  ellipse: { ...BASE, type: "ellipse", width: 120, height: 120, content: "",
    backgroundColor: "#ff0054", borderWidth: 4, borderColor: "#000000",
    borderRadius: 9999 },

  line: { ...BASE, type: "line", width: 200, height: 4, content: "",
    backgroundColor: "#000000", strokeColor: "#000000", strokeWidth: 4 },

  svg: { ...BASE, type: "svg", width: 120, height: 120, content: "",
    backgroundColor: "transparent",
    svgCode: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 95,95 5,95" fill="#ffe800" stroke="#000" stroke-width="4"/></svg>' },

  image: { ...BASE, type: "image", width: 240, height: 180, content: "",
    backgroundColor: "#e4e4e7", objectFit: "cover" },

  icon: { ...BASE, type: "icon", width: 64, height: 64, content: "",
    backgroundColor: "transparent", textColor: "#000000",
    iconName: "Star", iconSize: 40, iconStrokeWidth: 2 },

  shader: { ...BASE, type: "shader", width: 320, height: 200, content: "",
    backgroundColor: "#000000", shaderType: "fluid",
    shaderColor1: "#6366f1", shaderColor2: "#ec4899", shaderSpeed: 1 },
};

// ── API functions ────────────────────────────────────────────
// Upload an image file and return a signed URL to use as imageSrc.
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${publicAnonKey}` }, // no Content-Type — browser sets it with boundary
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}

export async function getBlocks(): Promise<Block[]> {
  const res = await fetch(`${API_BASE}/patches`, { headers: authHeaders });
  if (!res.ok) throw new Error("Failed to fetch");
  return (await res.json()).patches || [];
}
export async function createBlock(b: Block): Promise<Block> {
  const res = await fetch(`${API_BASE}/patches`, { method: "POST", headers: authHeaders, body: JSON.stringify(b) });
  if (!res.ok) throw new Error("Failed to create");
  return (await res.json()).patch;
}
export async function updateBlock(id: string, b: Block): Promise<Block> {
  const res = await fetch(`${API_BASE}/patches/${id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(b) });
  if (!res.ok) throw new Error("Failed to update");
  return (await res.json()).patch;
}
export async function deleteBlock(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/patches/${id}`, { method: "DELETE", headers: authHeaders });
  if (!res.ok) throw new Error("Failed to delete");
}
