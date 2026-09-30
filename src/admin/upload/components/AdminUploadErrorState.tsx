import { AlertTriangle } from "lucide-react";

export function AdminUploadErrorState({ errors = [] }: { errors?: string[] }) {
  return (
    <div className="rounded-md border border-anm-pink/25 bg-anm-pink/10 p-3 text-sm text-white/72">
      <p className="flex items-center gap-2 font-semibold text-anm-pink">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        Upload needs attention
      </p>
      {errors.length ? <p className="mt-1">{errors.join(" ")}</p> : null}
    </div>
  );
}
