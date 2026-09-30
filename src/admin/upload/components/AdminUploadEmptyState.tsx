import { UploadCloud } from "lucide-react";

export function AdminUploadEmptyState({ helperText }: { helperText?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-anm-card border border-dashed border-white/14 bg-black/18 p-8 text-center">
      <UploadCloud className="h-10 w-10 text-anm-gold" aria-hidden />
      <p className="mt-3 text-base font-semibold text-white">No files selected</p>
      {helperText ? <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">{helperText}</p> : null}
    </div>
  );
}
