import type { MediaAssetVersion } from "../../../models/media";
import { MediaVersionBadge } from "./MediaVersionBadge";

export function MediaActiveVersionIndicator({ version }: { version?: MediaAssetVersion | null }) {
  if (!version) return <p className="text-sm text-white/52">No active version recorded.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-anm-gold/20 bg-anm-gold/10 p-3">
      <MediaVersionBadge status={version.status} />
      <span className="text-sm font-semibold text-white">Version {version.versionNumber}</span>
      <span className="text-sm text-white/54">{version.originalFileName}</span>
    </div>
  );
}
