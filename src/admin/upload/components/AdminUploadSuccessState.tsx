import { CheckCircle2 } from "lucide-react";
import type { MediaUploadResult } from "../../../models/media";

export function AdminUploadSuccessState({ result }: { result?: MediaUploadResult }) {
  return (
    <div className="rounded-md border border-anm-success/25 bg-anm-success/10 p-3 text-sm text-white/72">
      <p className="flex items-center gap-2 font-semibold text-anm-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Upload completed
      </p>
      {result?.mediaAsset ? <p className="mt-1">Prepared asset record: {result.mediaAsset.title}</p> : null}
    </div>
  );
}
