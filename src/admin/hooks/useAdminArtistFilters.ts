import { useMemo, useState } from "react";
import type { ArtistAdminRecord } from "../../models/admin";
import {
  filterAdminArtists,
  searchAdminArtists,
  sortAdminArtists,
  type AdminArtistSortMode,
  type AdminArtistStatusFilter,
} from "../utils/adminArtistUtils";

export function useAdminArtistFilters(artists: readonly ArtistAdminRecord[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminArtistStatusFilter>("all");
  const [sortMode, setSortMode] = useState<AdminArtistSortMode>("sortOrder");

  const filteredArtists = useMemo(() => {
    const searched = searchAdminArtists(artists, searchQuery);
    const filtered = filterAdminArtists(searched, statusFilter);
    return sortAdminArtists(filtered, sortMode);
  }, [artists, searchQuery, sortMode, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortMode("sortOrder");
  };

  return {
    searchQuery,
    statusFilter,
    sortMode,
    filteredArtists,
    hasFilters: Boolean(searchQuery.trim() || statusFilter !== "all" || sortMode !== "sortOrder"),
    setSearchQuery,
    setStatusFilter,
    setSortMode,
    clearFilters,
  };
}
