import type { MediaAssignmentReviewItem } from "../../../models/media";
import { mediaAssetVisibilityService } from "../../../services/media/MediaAssetVisibilityService";
import { getMediaCategoryFromAssetType } from "../../../utils/media/mediaTypeUtils";
import { AdminMediaPreviewFrame } from "../media/AdminMediaPreviewFrame";
import { AdminMediaTypeBadge } from "../media/AdminMediaTypeBadge";
import { MediaAssetVisibilityBadge } from "../media/MediaAssetVisibilityBadge";
import { MediaAssignmentSuggestionBadge } from "./MediaAssignmentSuggestionBadge";
import { MediaReviewStateBadge } from "./MediaReviewStateBadge";

export function MediaReviewDetailPanel({ item, onClose, embedded = false }: { item: MediaAssignmentReviewItem | null; onClose: () => void; embedded?: boolean }) {
  if (!item) return null;
  const visibility = mediaAssetVisibilityService.getAssetVisibility(item.asset, { requireAssignment: false, allowAdminAssignment: true });
  const storage = item.asset.metadata?.storage;
  const versionHistory = item.asset.metadata?.versionHistory;
  const metadataEntries = Object.entries(item.asset.metadata ?? {}).filter(([, value]) => typeof value !== "object" || value === null).slice(0, 8);

  return (
    <aside className="grid gap-4 rounded-md border border-white/10 bg-black/24 p-4" aria-label="Selected review item details">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{item.asset.title}</h2>
          <p className="mt-1 text-sm text-white/50">{item.assetId}</p>
        </div>
        {embedded ? null : <button type="button" className="rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white" onClick={onClose}>Close</button>}
      </div>
      <AdminMediaPreviewFrame asset={item.asset} compact />
      <div className="flex flex-wrap gap-2">
        <AdminMediaTypeBadge assetType={item.asset.assetType} />
        <MediaReviewStateBadge state={item.assignmentState} />
        <MediaAssetVisibilityBadge visibility={visibility.visibility} />
      </div>
      <MediaAssignmentSuggestionBadge item={item} />
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-white/42">Media Category</dt><dd className="font-semibold text-white">{getMediaCategoryFromAssetType(item.asset.assetType)}</dd></div>
        <div><dt className="text-white/42">Status</dt><dd className="font-semibold text-white">{item.asset.status}</dd></div>
        <div><dt className="text-white/42">Owner</dt><dd className="font-semibold text-white">{item.asset.ownerType} / {item.asset.ownerId}</dd></div>
        <div><dt className="text-white/42">Created</dt><dd className="font-semibold text-white">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown"}</dd></div>
      </dl>
      {visibility.blockingIssues.length || visibility.warnings.length ? (
        <div className="rounded-md border border-anm-gold/20 bg-anm-gold/8 p-3 text-sm">
          {visibility.blockingIssues.map((issue) => <p key={issue} className="text-anm-pink">{issue}</p>)}
          {visibility.warnings.map((warning) => <p key={warning} className="text-anm-gold">{warning}</p>)}
        </div>
      ) : null}
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-white/62">
        <h3 className="font-semibold text-white">Upload Metadata</h3>
        <dl className="mt-2 grid gap-1">
          {metadataEntries.length ? metadataEntries.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
              <dt className="text-white/40">{key}</dt>
              <dd className="truncate">{String(value)}</dd>
            </div>
          )) : <p>No simple upload metadata available.</p>}
        </dl>
      </div>
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-white/62">
        <h3 className="font-semibold text-white">Storage & Version</h3>
        <p className="mt-2">Storage: {storage && typeof storage === "object" && !Array.isArray(storage) ? "available" : "not attached"}</p>
        <p>Version history: {versionHistory && typeof versionHistory === "object" ? "available" : "not started"}</p>
      </div>
    </aside>
  );
}
