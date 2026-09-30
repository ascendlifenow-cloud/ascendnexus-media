import { useMemo, useState } from "react";
import type { MediaAssignmentReviewItem } from "../../models/media";
import {
  filterMediaReviewItems,
  sortMediaReviewItems,
  type MediaReviewAssetTypeFilter,
  type MediaReviewCategoryFilter,
  type MediaReviewSortMode,
  type MediaReviewStateFilter,
} from "../../utils/media/mediaAssignmentReviewUtils";

export function useMediaReviewFilters(items: readonly MediaAssignmentReviewItem[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentState, setAssignmentState] = useState<MediaReviewStateFilter>("all");
  const [mediaCategory, setMediaCategory] = useState<MediaReviewCategoryFilter>("all");
  const [assetType, setAssetType] = useState<MediaReviewAssetTypeFilter>("all");
  const [sortMode, setSortMode] = useState<MediaReviewSortMode>("newest");

  const filteredItems = useMemo(() => sortMediaReviewItems(filterMediaReviewItems(items, {
    searchQuery,
    assignmentState,
    mediaCategory,
    assetType,
    sortMode,
  }), sortMode), [assetType, assignmentState, items, mediaCategory, searchQuery, sortMode]);

  const clearFilters = () => {
    setSearchQuery("");
    setAssignmentState("all");
    setMediaCategory("all");
    setAssetType("all");
    setSortMode("newest");
  };

  return {
    searchQuery,
    assignmentState,
    mediaCategory,
    assetType,
    sortMode,
    filteredItems,
    hasFilters: Boolean(searchQuery || assignmentState !== "all" || mediaCategory !== "all" || assetType !== "all" || sortMode !== "newest"),
    setSearchQuery,
    setAssignmentState,
    setMediaCategory,
    setAssetType,
    setSortMode,
    clearFilters,
  };
}
