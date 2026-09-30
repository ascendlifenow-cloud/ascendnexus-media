import type { MediaAssetVersion } from "../../../models/media";
import { MediaVersionListItem } from "./MediaVersionListItem";

export function MediaVersionList({
  versions,
  onRollback,
}: {
  versions: readonly MediaAssetVersion[];
  onRollback?: (versionId: string) => void;
}) {
  if (!versions.length) return <p className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-white/52">No version history recorded.</p>;
  return (
    <div className="grid gap-2">
      {versions.map((version) => <MediaVersionListItem key={version.versionId} version={version} onRollback={onRollback} />)}
    </div>
  );
}
