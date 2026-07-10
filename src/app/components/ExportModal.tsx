import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, Copy, Download, Check, Code2, FileCode2, FileJson2, Palette, Layers2 } from "lucide-react";
import type { Block } from "../lib/api";
import {
  exportReact, exportHtml, exportCss, exportJson, triggerDownload,
} from "../lib/exporters";
import { toast } from "sonner";

type Format = "react" | "html" | "css" | "json";

const FORMATS: Array<{ id: Format; label: string; icon: React.ElementType; ext: string; mime: string; color: string; fg: string }> = [
  { id: "react", label: "REACT (TSX)", icon: Code2,     ext: "tsx",  mime: "text/typescript", color: "#0066ff", fg: "#fff" },
  { id: "html",  label: "HTML",        icon: FileCode2, ext: "html", mime: "text/html",       color: "#ff0054", fg: "#fff" },
  { id: "css",   label: "CSS",         icon: Palette,   ext: "css",  mime: "text/css",        color: "#ffe800", fg: "#000" },
  { id: "json",  label: "JSON",        icon: FileJson2, ext: "json", mime: "application/json", color: "#00f0b5", fg: "#000" },
];

interface ExportModalProps {
  block: Block;
  allBlocks: Record<string, Block>;
  onClose: () => void;
}

export function ExportModal({ block, allBlocks, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<Format>("react");
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    switch (format) {
      case "react": return exportReact(block, allBlocks);
      case "html":  return exportHtml(block, allBlocks);
      case "css":   return exportCss(block, allBlocks);
      case "json":  return exportJson(block, allBlocks);
    }
  }, [format, block, allBlocks]);

  const activeFmt = FORMATS.find((f) => f.id === format)!;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — your browser may have blocked clipboard access");
    }
  };

  const handleDownload = () => {
    const safeName = (block.content || block.type || "component")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "component";
    triggerDownload(`kollektiv-${safeName}.${activeFmt.ext}`, code, activeFmt.mime);
    toast.success(`Downloaded as ${activeFmt.label.toLowerCase()}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-2xl bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#ffe800] border-b-4 border-black shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Download size={16} strokeWidth={3} className="text-[#ffe800]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide">EXPORT COMPONENT</h2>
              <p className="text-[10px] font-black uppercase tracking-wide text-black/60">
                BY {block.creator}{block.contributors?.length ? ` + ${block.contributors.length}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors bg-white"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>

        {/* Format tabs */}
        <div className="flex border-b-4 border-black shrink-0">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-black uppercase border-r-4 last:border-r-0 border-black transition-colors ${
                format === f.id ? "" : "bg-white hover:opacity-90"
              }`}
              style={
                format === f.id
                  ? { backgroundColor: f.color, color: f.fg }
                  : { color: "#000" }
              }
            >
              <f.icon size={12} strokeWidth={3} />
              {f.label}
            </button>
          ))}
        </div>

        {/* Code preview */}
        <div className="flex-1 overflow-auto bg-[#1a1a1a] text-[#e4e4e7] p-4">
          <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words">
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 p-4 border-t-4 border-black shrink-0 bg-white">
          <div className="flex-1 flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
            <Layers2 size={11} strokeWidth={3} />
            {code.split("\n").length} LINES · {(code.length / 1024).toFixed(1)} KB
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-white border-2 border-black text-black font-black uppercase text-xs px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all"
          >
            {copied ? (
              <><Check size={13} strokeWidth={3} className="text-[#00f0b5]" /> COPIED</>
            ) : (
              <><Copy size={13} strokeWidth={3} /> COPY</>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#ff0054] text-white border-2 border-black font-black uppercase text-xs px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all"
          >
            <Download size={13} strokeWidth={3} />
            DOWNLOAD .{activeFmt.ext.toUpperCase()}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
