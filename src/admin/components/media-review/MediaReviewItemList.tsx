import type { MediaAssignmentReviewItem } from "../../../models/media";
import { MediaReviewEmptyState } from "./MediaReviewEmptyState";
import { MediaReviewItemCard } from "./MediaReviewItemCard";

interface MediaReviewItemListProps {
  items: readonly MediaAssignmentReviewItem[];
  selectedItemId?: string;
  selectedIds: string[];
  hasFilters?: boolean;
  onClearFilters: () => void;
  onSelect: (item: MediaAssignmentReviewItem) => void;
  onOpenReview: (item: MediaAssignmentReviewItem) => void;
  onToggleSelected: (reviewItemId: string) => void;
}

export function MediaReviewItemList({
  items,
  selectedItemId,
  selectedIds,
  hasFilters,
  onClearFilters,
  onSelect,
  onOpenReview,
  onToggleSelected,
}: MediaReviewItemListProps) {
  if (!items.length) return <MediaReviewEmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />;
  return (
    <section className="grid gap-4" aria-label="Media assignment review items">
      {items.map((item) => (
        <MediaReviewItemCard
          key={item.reviewItemId}
          item={item}
          selected={item.reviewItemId === selectedItemId}
          checked={selectedIds.includes(item.reviewItemId)}
          onSelect={onSelect}
          onOpenReview={onOpenReview}
          onToggleChecked={onToggleSelected}
        />
      ))}
    </section>
  );
}
