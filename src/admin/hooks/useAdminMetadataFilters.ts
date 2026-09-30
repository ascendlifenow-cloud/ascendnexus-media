import { useMemo, useState } from "react";
import type { AdminMetadataRecord } from "../../models/admin";
import {
  filterAdminMetadataRecords,
  searchAdminMetadataRecords,
  sortAdminMetadataRecords,
  type AdminMetadataEntityTypeFilter,
  type AdminMetadataSortMode,
  type AdminMetadataStatusFilter,
} from "../utils/adminMetadataUtils";

export function useAdminMetadataFilters(records: readonly AdminMetadataRecord[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<AdminMetadataEntityTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AdminMetadataStatusFilter>("all");
  const [sortMode, setSortMode] = useState<AdminMetadataSortMode>("needsReview");

  const filteredRecords = useMemo(() => {
    const searched = searchAdminMetadataRecords(records, searchQuery);
    const filtered = filterAdminMetadataRecords(searched, entityTypeFilter, statusFilter);
    return sortAdminMetadataRecords(filtered, sortMode);
  }, [entityTypeFilter, records, searchQuery, sortMode, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setEntityTypeFilter("all");
    setStatusFilter("all");
    setSortMode("needsReview");
  };

  return {
    searchQuery,
    entityTypeFilter,
    statusFilter,
    sortMode,
    filteredRecords,
    hasFilters: Boolean(searchQuery.trim() || entityTypeFilter !== "all" || statusFilter !== "all" || sortMode !== "needsReview"),
    setSearchQuery,
    setEntityTypeFilter,
    setStatusFilter,
    setSortMode,
    clearFilters,
  };
}
