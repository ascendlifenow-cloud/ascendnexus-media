import type { MediaAssignmentReviewItem } from "../../../models/media";
import { formatSuggestedAssignment } from "../../../utils/media/mediaAssignmentReviewUtils";

export function MediaAssignmentSuggestionBadge({ item }: { item: MediaAssignmentReviewItem }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/62">
      <span className="font-semibold text-white">Suggestion:</span> {formatSuggestedAssignment(item)}
      {typeof item.confidence === "number" ? <span className="ml-2 text-anm-gold">{Math.round(item.confidence * 100)}%</span> : null}
    </div>
  );
}
