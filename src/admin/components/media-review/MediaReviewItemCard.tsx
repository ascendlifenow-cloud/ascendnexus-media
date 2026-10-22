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
  const fileSize = typeof item.asset.metadata?.fileSize === "number" ? `${(item.asset.metadata.fileSize / 1024 / 1024).toFixed(1)} MB` : null;
  const intakeStatus = typeof item.asset.metadata?.intakeStatus === "string" ? item.asset.metadata.intakeStatus.replace(/_/g, " ") : null;
  return (
    <article
      role="button"
      tabIndex={0}
      aria-selected={selected}
      className={`group relative isolate overflow-hidden rounded-md border text-left transition duration-200 ease-anm-out ${
        selected
          ? "-translate-y-1 border-anm-pink/70 bg-anm-pink/10 shadow-[0_20px_50px_rgba(234,89,139,0.22)] ring-2 ring-anm-pink/35"
          : "border-white/10 bg-black/18 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_18px_42px_rgba(0,0,0,0.3)]"
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
      <AdminMediaPreviewFrame asset={item.asset} gallery />
      <label className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-black/72 shadow-lg backdrop-blur" title="Add to bulk selection">
        <input
          type="checkbox"
          checked={checked}
          aria-label={`Select ${item.asset.title}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleChecked(item.reviewItemId)}
          className="h-4 w-4"
        />
      </label>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-16">
        <h3 className="line-clamp-2 text-base font-semibold text-white">{item.asset.title}</h3>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/52">{getMediaCategoryFromAssetType(item.asset.assetType)}</p>
      </div>
      <div className="absolute inset-0 z-10 flex translate-y-3 flex-col justify-end bg-black/88 p-4 opacity-0 backdrop-blur-sm transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <AdminMediaTypeBadge assetType={item.asset.assetType} />
          <MediaReviewStateBadge state={item.assignmentState} />
          <MediaAssetVisibilityBadge visibility={visibility} />
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-white">{item.asset.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-white/56">{originalFileName}</p>
        <div className="mt-3"><MediaAssignmentSuggestionBadge item={item} /></div>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/66">{item.reason}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] uppercase tracking-[0.1em] text-white/42">
          {intakeStatus ? <span>{intakeStatus}</span> : null}
          {fileSize ? <span>{fileSize}</span> : null}
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </article>
  );
}
