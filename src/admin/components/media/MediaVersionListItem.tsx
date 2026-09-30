import type { MediaAssetVersion } from "../../../models/media";
import { formatFileSize } from "../../upload/utils/uploadUiUtils";
import { MediaRollbackButton } from "./MediaRollbackButton";
import { MediaVersionBadge } from "./MediaVersionBadge";

export function MediaVersionListItem({
  version,
  onRollback,
}: {
  version: MediaAssetVersion;
  onRollback?: (versionId: string) => void;
}) {
  const canRollback = version.status !== "active" && version.status !== "deleted" && version.status !== "archived";
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.045] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MediaVersionBadge status={version.status} />
            <span className="text-sm font-semibold text-white">Version {version.versionNumber}</span>
          </div>
          <p className="mt-2 text-sm text-white/72">{version.originalFileName}</p>
          <p className="mt-1 text-xs text-white/44">{version.mimeType} · {formatFileSize(version.fileSizeBytes)} · {new Date(version.createdAt).toLocaleString()}</p>
          {version.changeReason ? <p className="mt-2 text-xs text-white/52">{version.changeReason}</p> : null}
        </div>
        {onRollback ? <MediaRollbackButton onRollback={() => onRollback(version.versionId)} disabled={!canRollback} /> : null}
      </div>
    </article>
  );
}
