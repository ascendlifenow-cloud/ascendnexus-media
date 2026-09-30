import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";
import { filterSongsByGenreAndTag, normalizeGenreValue, normalizeTagValue } from "../utils/browseFilters";

interface BrowseCatalogResponse {
  artists?: unknown[];
  releases?: unknown[];
  gallery?: unknown[];
  genres?: string[];
  styleTags?: string[];
  genreCounts?: Record<string, number>;
  styleTagCounts?: Record<string, number>;
  catalogs?: {
    genres?: Array<{ value: string; count: number }>;
    styleTags?: Array<{ value: string; count: number }>;
  };
}

export const useBrowseFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGenre = searchParams.get("genre") ?? "";
  const selectedTag = searchParams.get("tag") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const mode = searchParams.get("mode") ?? "releases";

  const query = useQuery({
    queryKey: ["public-browse-catalog", selectedGenre, selectedTag, sort, mode],
    queryFn: () => publicMediaApiClient.browse({ genre: selectedGenre || undefined, styleTag: selectedTag || undefined, sort, mode }),
  });

  const data = query.data as BrowseCatalogResponse | undefined;
  const genres = data?.genres ?? data?.catalogs?.genres?.map((genre) => genre.value) ?? [];
  const styleTags = data?.styleTags ?? data?.catalogs?.styleTags?.map((tag) => tag.value) ?? [];

  const resolvedGenre = useMemo(
    () => genres.find((genre) => normalizeGenreValue(genre) === normalizeGenreValue(selectedGenre)) ?? "",
    [genres, selectedGenre],
  );

  const resolvedTag = useMemo(
    () => styleTags.find((tag) => normalizeTagValue(tag) === normalizeTagValue(selectedTag)) ?? "",
    [styleTags, selectedTag],
  );

  const setFilterParam = useCallback(
    (key: "genre" | "tag", value: string) => {
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (value) nextParams.set(key, value);
        else nextParams.delete(key);
        return nextParams;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete("genre");
      nextParams.delete("tag");
      return nextParams;
    }, { replace: true });
  }, [setSearchParams]);

  const filteredSongs = useMemo(
    () =>
      filterSongsByGenreAndTag(
        data?.releases as never,
        { genre: resolvedGenre, tag: resolvedTag },
        data?.artists as never,
      ),
    [data?.artists, data?.releases, resolvedGenre, resolvedTag],
  );

  const hasPublishedReleases = (data?.releases?.length ?? 0) > 0;
  const hasActiveFilters = Boolean(resolvedGenre || resolvedTag);

  return {
    ...query,
    selectedGenre: resolvedGenre,
    selectedTag: resolvedTag,
    setGenre: (genre: string) => setFilterParam("genre", genre),
    setTag: (tag: string) => setFilterParam("tag", tag),
    removeGenre: () => setFilterParam("genre", ""),
    removeTag: () => setFilterParam("tag", ""),
    clearFilters,
    genres,
    styleTags,
    genreCounts: data?.genreCounts ?? {},
    styleTagCounts: data?.styleTagCounts ?? {},
    filteredSongs,
    hasActiveFilters,
    hasPublishedReleases,
    isNoResults: hasActiveFilters && !query.isLoading && !query.isError && filteredSongs.length === 0,
  };
};
