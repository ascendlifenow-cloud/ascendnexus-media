import type { MediaAssignmentReviewItem } from "../../../models/media";
import { getMediaCategoryFromAssetType } from "../../../utils/media/mediaTypeUtils";
import { mediaAssetVisibilityService } from "../../../services/media/MediaAssetVisibilityService";
import { AdminMediaPreviewFrame } from "../media/AdminMediaPreviewFrame";
import { AdminMediaTypeBadge } from "../media/AdminMediaTypeBadge";
import { MediaAssetVisibilityBadge } from "../media/MediaAssetVisibilityBadge";
import { MediaAssignmentSuggestionBadge } from "./MediaAssignmentSuggestionBadge";
import { MediaReviewStateBadge } from "./MediaReviewStateBadge";

interface MediaReviewItemCardProps {
  item: MediaAssignmentReviewItem;
  selected?: boolean;
  checked?: boolean;
  onSelect: (item: MediaAssignmentReviewItem) => void;
  onOpenReview: (item: MediaAssignmentReviewItem) => void;
  onToggleChecked: (reviewItemId: string) => void;
}

export function MediaReviewItemCard({
  item,
  selected = false,
  checked = false,
  onSelect,
  onOpenReview,
  onToggleChecked,
}: MediaReviewItemCardProps) {
  const visibility = mediaAssetVisibilityService.getAssetVisibility(item.asset, { requireAssignment: false, allowAdminAssignment: true }).visibility;
  const originalFileName = typeof item.asset.metadata?.originalFileName === "string" ? item.asset.metadata.originalFileName : item.asset.title;
  return (
    <article
      role="button"
      tabIndex={0}
      aria-selected={selected}
      className={`group rounded-md border p-4 text-left transition duration-200 ease-anm-out ${
        selected
          ? "translate-x-1 border-anm-pink/70 bg-anm-pink/10 shadow-[0_18px_46px_rgba(234,89,139,0.18)] ring-1 ring-anm-pink/30"
          : "border-white/10 bg-black/18 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.045]"
      }`}
      onClick={() => onSelect(item)}
      onDoubleClick={() => onOpenReview(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect(item);
        if (event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[112px_minmax(0,1fr)]">
        <div className="min-w-0">
          <AdminMediaPreviewFrame asset={item.asset} compact />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/44">
                <input
                  type="checkbox"
                  checked={checked}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => onToggleChecked(item.reviewItemId)}
                />
                Select
              </label>
              <h3 className="truncate text-lg font-semibold text-white">{item.asset.title}</h3>
              <p className="mt-1 text-sm text-white/50">{originalFileName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/36">{getMediaCategoryFromAssetType(item.asset.assetType)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminMediaTypeBadge assetType={item.asset.assetType} />
              <MediaReviewStateBadge state={item.assignmentState} />
              <MediaAssetVisibilityBadge visibility={visibility} />
            </div>
          </div>
          <div className="mt-3">
            <MediaAssignmentSuggestionBadge item={item} />
          </div>
          <p className="mt-3 text-sm leading-6 text-white/58">{item.reason}</p>
          <p className="mt-2 text-xs text-white/36">Uploaded {new Date(item.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </article>
  );
}
