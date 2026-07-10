import {
  Type, MousePointer2, TextCursorInput, Tag, LayoutTemplate, Image as ImageIcon,
  Square, Circle, Minus, Code2, Smile, Sliders, ToggleLeft, ChevronDown,
  Layers, Sparkles, Grid3x3,
} from "lucide-react";

const GROUPS = [
  {
    label: "TEXT",
    items: [
      { type: "text",   icon: Type,          label: "Text",      color: "#ffe800", fg: "#000" },
      { type: "badge",  icon: Tag,           label: "Badge",     color: "#00f0b5", fg: "#000" },
    ],
  },
  {
    label: "ELEMENTS",
    items: [
      { type: "button", icon: MousePointer2, label: "Button",    color: "#ff0054", fg: "#fff" },
      { type: "input",  icon: TextCursorInput,label: "Input",   color: "#0066ff", fg: "#fff" },
      { type: "select", icon: ChevronDown,   label: "Select",    color: "#ffe800", fg: "#000" },
      { type: "toggle", icon: ToggleLeft,    label: "Toggle",    color: "#00f0b5", fg: "#000" },
      { type: "slider", icon: Sliders,       label: "Slider",    color: "#ff0054", fg: "#fff" },
    ],
  },
  {
    label: "LAYOUT",
    items: [
      { type: "container", icon: LayoutTemplate, label: "Flex Box",  color: "#ffe800", fg: "#000" },
      { type: "container", icon: Grid3x3,        label: "Grid",      color: "#0066ff", fg: "#fff",
        extra: { layoutType: "grid" } },
    ],
  },
  {
    label: "SHAPES",
    items: [
      { type: "rectangle", icon: Square,   label: "Rect",     color: "#ffe800", fg: "#000" },
      { type: "ellipse",   icon: Circle,   label: "Ellipse",  color: "#ff0054", fg: "#fff" },
      { type: "line",      icon: Minus,    label: "Line",     color: "#0066ff", fg: "#fff" },
      { type: "svg",       icon: Code2,    label: "SVG",      color: "#00f0b5", fg: "#000" },
    ],
  },
  {
    label: "MEDIA",
    items: [
      { type: "image", icon: ImageIcon, label: "Image",  color: "#ff0054", fg: "#fff" },
      { type: "icon",  icon: Smile,     label: "Icon",   color: "#ffe800", fg: "#000" },
    ],
  },
  {
    label: "EFFECTS",
    items: [
      { type: "shader", icon: Sparkles, label: "Shader", color: "#0066ff", fg: "#fff" },
    ],
  },
];

interface ToolbarProps {
  onAdd: (type: string, extra?: Record<string, unknown>) => void;
}

export function Toolbar({ onAdd }: ToolbarProps) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-44 overflow-hidden max-h-[calc(100vh-80px)] flex flex-col">
      <div className="bg-black px-3 py-2 border-b-4 border-black shrink-0">
        <span className="text-[9px] font-black text-white uppercase tracking-[0.25em]">ELEMENTS</span>
      </div>

      <div className="overflow-y-auto flex-1 p-1.5 flex flex-col gap-2">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-1.5 py-0.5 mb-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{group.label}</span>
            </div>
            <div className="flex flex-col gap-1">
              {group.items.map((el, i) => (
                <button
                  key={`${el.type}-${i}`}
                  onClick={() => onAdd(el.type, (el as any).extra)}
                  title={el.label}
                  className="flex items-center gap-2 px-2 py-1.5 border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-px transition-all text-left w-full"
                  style={{ backgroundColor: el.color, color: el.fg }}
                >
                  <el.icon size={12} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase">{el.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
