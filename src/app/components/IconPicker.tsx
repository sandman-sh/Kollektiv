import { useState } from "react";
import { motion } from "motion/react";
import { X, Search } from "lucide-react";
import * as LucideIcons from "lucide-react";

// Curated list of icon names available in lucide-react
export const ICON_NAMES = [
  "Home","Settings","Search","Menu","X","Plus","Minus","Check","ChevronDown","ChevronRight",
  "ChevronLeft","ChevronUp","ArrowRight","ArrowLeft","ArrowUp","ArrowDown","ExternalLink",
  "Copy","Edit2","Trash2","Eye","EyeOff","Lock","Unlock","Info","AlertCircle","AlertTriangle",
  "HelpCircle","Star","Heart","Bookmark","Share2","Download","Upload","RefreshCw","RotateCcw",
  "Play","Pause","Square","Circle","Triangle","Hexagon","Diamond","Zap","Flame","Sun","Moon",
  "Cloud","CloudRain","Wind","Wifi","Bluetooth","Battery","Power","Cpu","Database","Server",
  "Globe","Map","Navigation","Compass","MapPin","Phone","Mail","MessageCircle","Send","Bell",
  "BellOff","Volume2","VolumeX","Mic","MicOff","Camera","Video","VideoOff","Image","Film",
  "Music","Headphones","Radio","Tv","Monitor","Smartphone","Tablet","Laptop","Printer","Usb",
  "Code","Code2","Terminal","FileText","File","Folder","FolderOpen","Clipboard","ClipboardList",
  "Package","Tag","Layers","LayoutGrid","LayoutList","Grid","List","Columns","Rows","Sidebar",
  "PanelLeft","PanelRight","Table","Users","User","UserPlus","UserMinus","UserCheck","Shield",
  "ShieldCheck","Key","Fingerprint","Activity","BarChart","BarChart2","PieChart","TrendingUp",
  "TrendingDown","DollarSign","CreditCard","ShoppingCart","ShoppingBag","Gift","Truck","Box",
  "Archive","Inbox","Send","Link","Unlink","Anchor","GitBranch","GitCommit","GitFork","GitMerge",
  "Github","Twitter","Linkedin","Instagram","Youtube","Facebook","Slack","Chrome",
  "Maximize","Minimize","Maximize2","Minimize2","Move","Crop","Scissors","PenTool","Pen",
  "Brush","Palette","Pipette","Wand2","Sparkles","Atom","Aperture","Feather","Leaf","Flower2",
] as const;

export type IconName = typeof ICON_NAMES[number];

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  onClose: () => void;
}

export function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = ICON_NAMES.filter((n) =>
    n.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-[480px] max-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black text-white border-b-4 border-black shrink-0">
          <span className="font-black uppercase text-sm tracking-wide">ICON LIBRARY</span>
          <button onClick={onClose} className="hover:text-[#ffe800] transition-colors">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b-4 border-black shrink-0">
          <div className="flex items-center gap-2 border-2 border-black px-3 py-2 bg-[#f4f4f0] focus-within:bg-[#ffe800] transition-colors">
            <Search size={14} strokeWidth={3} className="shrink-0 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH ICONS…"
              autoFocus
              className="flex-1 bg-transparent text-xs font-black uppercase placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-3 grid grid-cols-7 gap-1.5">
          {filtered.map((name) => {
            // @ts-ignore dynamic icon lookup
            const Icon = LucideIcons[name] as React.ElementType | undefined;
            if (!Icon) return null;
            return (
              <button
                key={name}
                onClick={() => { onChange(name); onClose(); }}
                title={name}
                className={`flex flex-col items-center justify-center gap-1 p-2 border-2 border-transparent hover:border-black hover:bg-[#ffe800] transition-all aspect-square ${
                  value === name ? "bg-[#ffe800] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : ""
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="text-[7px] font-black uppercase leading-none truncate w-full text-center">
                  {name}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-7 py-8 text-center text-xs font-black uppercase text-gray-400">
              No icons found
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function renderIcon(name: string, size: number, strokeWidth: number, color: string) {
  // @ts-ignore
  const Icon = LucideIcons[name] as React.ElementType | undefined;
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={strokeWidth} color={color} />;
}
