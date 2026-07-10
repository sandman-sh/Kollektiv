import { useState } from "react";
import { motion } from "motion/react";
import { X, AlertCircle, CheckCircle2, ArrowRight, Layers2 } from "lucide-react";

function validateTwitterUrl(url: string): string | null {
  if (!url.trim()) return null;
  if (url.startsWith("https://twitter.com/") || url.startsWith("https://x.com/")) {
    const path = url.replace("https://twitter.com/", "").replace("https://x.com/", "");
    if (path.length > 0 && !path.includes(" ")) return null;
    return "Include a username after the URL — e.g. https://x.com/yourhandle";
  }
  return "Only Twitter/X links accepted — must start with https://twitter.com/ or https://x.com/";
}

interface PublishModalProps {
  defaultName: string;
  /** Return a string error message to display, or null/undefined on success */
  onPublish: (name: string, twitterUrl: string) => void | string | null | Promise<string | null | void>;
  onClose: () => void;
}

export function PublishModal({ defaultName, onPublish, onClose }: PublishModalProps) {
  const [name, setName] = useState(defaultName);
  const [twitterUrl, setTwitterUrl] = useState("");
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Clear name error whenever name changes
  const handleNameChange = (v: string) => { setName(v); if (nameError) setNameError(null); };

  const handleTwitterChange = (value: string) => {
    setTwitterUrl(value);
    if (touched) setTwitterError(validateTwitterUrl(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const error = validateTwitterUrl(twitterUrl);
    if (error) { setTwitterError(error); return; }
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const result = await onPublish(name.trim(), twitterUrl.trim());
      if (typeof result === "string" && result) setNameError(result);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = twitterUrl.trim() === "" || validateTwitterUrl(twitterUrl) === null;

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
        className="relative w-full max-w-md bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#ffe800] border-b-4 border-black">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Layers2 size={16} strokeWidth={3} className="text-[#ffe800]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide">PUBLISH TO KOLLEKTIV</h2>
              <p className="text-[10px] font-black uppercase tracking-wide text-black/60">
                Visible to everyone on the canvas
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest">
              Your Name <span className="text-[#ff0054]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Your display name"
              required
              maxLength={40}
              className={`w-full bg-[#f4f4f0] border-2 text-black font-bold px-3 py-2.5 text-sm focus:outline-none transition-colors ${nameError ? "border-[#ff0054] focus:bg-[#ff0054]/10" : "border-black focus:bg-[#ffe800]"}`}
            />
            {nameError && (
              <p className="text-[11px] font-bold text-[#ff0054] flex items-start gap-1.5">
                <AlertCircle size={11} className="shrink-0 mt-0.5" />
                {nameError}
              </p>
            )}
          </div>

          {/* Twitter/X */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              Twitter / X Profile
              <span className="font-bold text-gray-500 normal-case tracking-normal text-[10px]">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={twitterUrl}
                onChange={(e) => handleTwitterChange(e.target.value)}
                onBlur={() => { setTouched(true); setTwitterError(validateTwitterUrl(twitterUrl)); }}
                placeholder="https://x.com/yourhandle"
                className={`w-full bg-[#f4f4f0] border-2 text-black font-bold px-3 py-2.5 text-sm focus:outline-none transition-colors pr-9
                  ${twitterError ? "border-[#ff0054] focus:bg-[#ff0054]/10" :
                    isValid && twitterUrl ? "border-[#00f0b5]" : "border-black focus:bg-[#ffe800]"}`}
              />
              {twitterUrl && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {twitterError
                    ? <AlertCircle size={14} className="text-[#ff0054]" />
                    : <CheckCircle2 size={14} className="text-[#00f0b5]" />}
                </div>
              )}
            </div>
            {twitterError ? (
              <p className="text-[11px] font-bold text-[#ff0054] flex items-start gap-1.5">
                <AlertCircle size={11} className="shrink-0 mt-0.5" />
                {twitterError}
              </p>
            ) : (
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                Must start with https://twitter.com/ or https://x.com/
              </p>
            )}
          </div>

          {/* Info box */}
          <div className="bg-[#f4f4f0] border-2 border-black p-3 text-[11px] font-bold uppercase tracking-wide text-gray-600">
            Your component will be <span className="text-black">LOCKED</span> on the canvas with a credit tag. Others can fork it.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border-2 border-black text-black font-black uppercase text-sm py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex-1 bg-[#ff0054] text-white border-2 border-black font-black uppercase text-sm py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "PUBLISHING…" : (<>PUBLISH <ArrowRight size={16} strokeWidth={3} /></>)}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
