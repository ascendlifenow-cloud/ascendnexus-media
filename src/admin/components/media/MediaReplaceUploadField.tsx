import { useState } from "react";
import type { MediaAssetRecord } from "../../../models/admin";
import type { MediaAssetReplaceResult } from "../../../models/media";
import { Button } from "../../../components/ui/Button";
import { MediaReplaceWarningPanel } from "./MediaReplaceWarningPanel";

export function MediaReplaceUploadField({
  asset,
  dependencyCount = 0,
  publiclyReferenced = false,
  accept,
  onReplace,
}: {
  asset: MediaAssetRecord;
  dependencyCount?: number;
  publiclyReferenced?: boolean;
  accept?: string;
  onReplace: (file: File, changeReason?: string) => Promise<MediaAssetReplaceResult>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [result, setResult] = useState<MediaAssetReplaceResult | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-3 rounded-anm-card border border-white/10 bg-black/18 p-4">
      <div>
        <h3 className="text-base font-semibold text-white">Replace File</h3>
        <p className="mt-1 text-sm text-white/52">Upload a new file for {asset.title}. Previous versions are preserved.</p>
      </div>
      <MediaReplaceWarningPanel dependencyCount={dependencyCount} publiclyReferenced={publiclyReferenced} warnings={result?.warnings} />
      <input
        type="file"
        accept={accept}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="anm-focus rounded-md border border-white/12 bg-white/[0.055] p-3 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
      />
      <textarea
        value={changeReason}
        onChange={(event) => setChangeReason(event.target.value)}
        placeholder="Change reason"
        className="anm-focus min-h-20 rounded-md border border-white/12 bg-white/[0.055] p-3 text-sm text-white placeholder:text-white/36"
      />
      <Button
        type="button"
        variant="primary"
        isLoading={busy}
        disabled={!file}
        onClick={async () => {
          if (!file) return;
          setBusy(true);
          const next = await onReplace(file, changeReason.trim() || undefined);
          setResult(next);
          setBusy(false);
        }}
      >
        Replace Active Version
      </Button>
      {result ? (
        <p className={`text-sm ${result.success ? "text-anm-success" : "text-anm-error"}`}>
          {result.success ? "Replacement completed." : result.errors?.join(" ") || "Replacement failed."}
        </p>
      ) : null}
    </div>
  );
}
