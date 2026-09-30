import { useState, type DragEvent, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { cx } from "../../../utils/format";

interface AdminDropzoneProps {
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  description?: string;
  helperText?: string;
  children?: ReactNode;
  onFilesDropped: (files: File[]) => void;
}

export function AdminDropzone({
  disabled = false,
  multiple = false,
  maxFiles,
  label = "Drop files here",
  description = "Drag and drop media files into this upload zone.",
  helperText,
  children,
  onFilesDropped,
}: AdminDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragActive(event.type === "dragenter" || event.type === "dragover");
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    const selected = multiple ? (maxFiles ? files.slice(0, maxFiles) : files) : files.slice(0, 1);
    if (selected.length) onFilesDropped(selected);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={cx(
        "rounded-anm-panel border border-dashed p-6 transition duration-300",
        disabled ? "border-white/8 bg-white/[0.025] opacity-60" : "border-white/16 bg-anm-surface/76",
        dragActive ? "border-anm-pink bg-anm-pink/10 shadow-anm-card-glow" : undefined,
      )}
      aria-disabled={disabled}
    >
      <div className="grid gap-4 text-center">
        <UploadCloud className="mx-auto h-10 w-10 text-anm-gold" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold text-white">{label}</h2>
          <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
          {helperText ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/38">{helperText}</p> : null}
        </div>
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}
