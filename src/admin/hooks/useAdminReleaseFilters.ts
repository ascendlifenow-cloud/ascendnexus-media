import { useMemo, useState } from "react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../models/admin";
import {
  filterAdminReleases,
  getAvailableAdminReleaseGenres,
  searchAdminReleases,
  sortAdminReleases,
  type AdminReleaseFeaturedFilter,
  type AdminReleaseSortMode,
  type AdminReleaseStatusFilter,
} from "../utils/adminReleaseUtils";

export function useAdminReleaseFilters(
  releases: readonly SongReleaseAdminRecord[],
  artists: readonly ArtistAdminRecord[],
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminReleaseStatusFilter>("all");
  const [artistFilter, setArtistFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState<AdminReleaseFeaturedFilter>("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortMode, setSortMode] = useState<AdminReleaseSortMode>("releaseDateNewest");

  const availableGenres = useMemo(() => getAvailableAdminReleaseGenres(releases), [releases]);

  const filteredReleases = useMemo(() => {
    const searched = searchAdminReleases(releases, artists, searchQuery);
    const filtered = filterAdminReleases(searched, {
      statusFilter,
      artistFilter,
      featuredFilter,
      genreFilter,
    });
    return sortAdminReleases(filtered, artists, sortMode);
  }, [artistFilter, artists, featuredFilter, genreFilter, releases, searchQuery, sortMode, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setArtistFilter("all");
    setFeaturedFilter("all");
    setGenreFilter("all");
    setSortMode("releaseDateNewest");
  };

  return {
    searchQuery,
    statusFilter,
    artistFilter,
    featuredFilter,
    genreFilter,
    sortMode,
    availableGenres,
    filteredReleases,
    hasFilters: Boolean(
      searchQuery.trim() ||
        statusFilter !== "all" ||
        artistFilter !== "all" ||
        featuredFilter !== "all" ||
        genreFilter !== "all" ||
        sortMode !== "releaseDateNewest",
    ),
    setSearchQuery,
    setStatusFilter,
    setArtistFilter,
    setFeaturedFilter,
    setGenreFilter,
    setSortMode,
    clearFilters,
  };
}
