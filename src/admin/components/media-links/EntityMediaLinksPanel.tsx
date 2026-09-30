import type { MediaAssetLink } from "../../../models/media";
import { formatMediaLinkFieldLabel } from "../../../utils/media/mediaAssetLinkUtils";
import { MediaAssetDetachButton } from "./MediaAssetDetachButton";

export function EntityMediaLinksPanel({
  links,
  onDetach,
}: {
  links: readonly MediaAssetLink[];
  onDetach?: (linkId: string) => void;
}) {
  if (!links.length) return <p className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-white/52">No linked media assets.</p>;
  return (
    <div className="grid gap-2">
      {links.map((link) => (
        <div key={link.linkId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.045] p-3">
          <div>
            <p className="text-sm font-semibold text-white">{formatMediaLinkFieldLabel(link.fieldKey)}</p>
            <p className="mt-1 text-xs text-white/46">{link.assetId} · {link.status}</p>
          </div>
          {link.status === "active" && onDetach ? <MediaAssetDetachButton onDetach={() => onDetach(link.linkId)} /> : null}
        </div>
      ))}
    </div>
  );
}
