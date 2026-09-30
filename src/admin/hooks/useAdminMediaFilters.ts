import { useMemo, useState } from "react";
import type { MediaAssetRecord } from "../../models/admin";
import {
  filterAdminMediaAssets,
  getAvailableAdminMediaAssetTypes,
  getAvailableAdminMediaOwnerTypes,
  searchAdminMediaAssets,
  sortAdminMediaAssets,
  type AdminMediaAssetTypeFilter,
  type AdminMediaOwnerTypeFilter,
  type AdminMediaSortMode,
  type AdminMediaStatusFilter,
} from "../utils/adminMediaUtils";

export function useAdminMediaFilters(assets: readonly MediaAssetRecord[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<AdminMediaAssetTypeFilter>("all");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<AdminMediaOwnerTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AdminMediaStatusFilter>("all");
  const [sortMode, setSortMode] = useState<AdminMediaSortMode>("createdNewest");

  const availableAssetTypes = useMemo(() => getAvailableAdminMediaAssetTypes(assets), [assets]);
  const availableOwnerTypes = useMemo(() => getAvailableAdminMediaOwnerTypes(assets), [assets]);

  const filteredAssets = useMemo(() => {
    const searched = searchAdminMediaAssets(assets, searchQuery);
    const filtered = filterAdminMediaAssets(searched, {
      assetTypeFilter,
      ownerTypeFilter,
      statusFilter,
    });
    return sortAdminMediaAssets(filtered, sortMode);
  }, [assetTypeFilter, assets, ownerTypeFilter, searchQuery, sortMode, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setAssetTypeFilter("all");
    setOwnerTypeFilter("all");
    setStatusFilter("all");
    setSortMode("createdNewest");
  };

  return {
    searchQuery,
    assetTypeFilter,
    ownerTypeFilter,
    statusFilter,
    sortMode,
    availableAssetTypes,
    availableOwnerTypes,
    filteredAssets,
    hasFilters: Boolean(
      searchQuery.trim() ||
        assetTypeFilter !== "all" ||
        ownerTypeFilter !== "all" ||
        statusFilter !== "all" ||
        sortMode !== "createdNewest",
    ),
    setSearchQuery,
    setAssetTypeFilter,
    setOwnerTypeFilter,
    setStatusFilter,
    setSortMode,
    clearFilters,
  };
}
