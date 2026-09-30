import type { MediaAssetRecord } from "../../../models/admin";
import type { MediaAssetLink } from "../../../models/media";
import { formatMediaLinkFieldLabel } from "../../../utils/media/mediaAssetLinkUtils";
import { AdminMediaTypeBadge } from "../media/AdminMediaTypeBadge";

export function MediaAssetLinkedInfo({ asset, link }: { asset?: MediaAssetRecord | null; link?: MediaAssetLink | null }) {
  if (!asset && !link) return null;
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
      <div className="flex flex-wrap items-center gap-2">
        {asset ? <AdminMediaTypeBadge assetType={asset.assetType} /> : null}
        {link ? <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/44">{formatMediaLinkFieldLabel(link.fieldKey)}</span> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{asset?.title ?? link?.assetId}</p>
      <p className="mt-1 truncate text-xs text-white/48">{asset?.url ?? link?.linkId}</p>
    </div>
  );
}
