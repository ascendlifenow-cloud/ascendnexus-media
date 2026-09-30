import { useMemo, useState } from "react";
import type { PublicGalleryItem } from "../../models/gallery";
import {
  filterAdminGalleryItems,
  getAvailableAdminGalleryMediaTypes,
  getAvailableAdminGallerySourceTypes,
  searchAdminGalleryItems,
  sortAdminGalleryItems,
  type AdminGalleryMediaTypeFilter,
  type AdminGallerySortMode,
  type AdminGallerySourceTypeFilter,
  type AdminGalleryStatusFilter,
} from "../utils/adminGalleryUtils";

export function useAdminGalleryFilters(items: readonly PublicGalleryItem[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<AdminGalleryMediaTypeFilter>("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<AdminGallerySourceTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AdminGalleryStatusFilter>("all");
  const [sortMode, setSortMode] = useState<AdminGallerySortMode>("sortOrder");

  const availableMediaTypes = useMemo(() => getAvailableAdminGalleryMediaTypes(items), [items]);
  const availableSourceTypes = useMemo(() => getAvailableAdminGallerySourceTypes(items), [items]);

  const filteredItems = useMemo(() => {
    const searched = searchAdminGalleryItems(items, searchQuery);
    const filtered = filterAdminGalleryItems(searched, {
      mediaTypeFilter,
      sourceTypeFilter,
      statusFilter,
    });
    return sortAdminGalleryItems(filtered, sortMode);
  }, [items, mediaTypeFilter, searchQuery, sortMode, sourceTypeFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setMediaTypeFilter("all");
    setSourceTypeFilter("all");
    setStatusFilter("all");
    setSortMode("sortOrder");
  };

  return {
    searchQuery,
    mediaTypeFilter,
    sourceTypeFilter,
    statusFilter,
    sortMode,
    availableMediaTypes,
    availableSourceTypes,
    filteredItems,
    hasFilters: Boolean(
      searchQuery.trim() ||
        mediaTypeFilter !== "all" ||
        sourceTypeFilter !== "all" ||
        statusFilter !== "all" ||
        sortMode !== "sortOrder",
    ),
    setSearchQuery,
    setMediaTypeFilter,
    setSourceTypeFilter,
    setStatusFilter,
    setSortMode,
    clearFilters,
  };
}
