import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ReleaseCatalogService, type ReleaseCatalogSortMode } from "../services/ReleaseCatalogService";

const releaseCatalogService = new ReleaseCatalogService();
const sortModes: ReleaseCatalogSortMode[] = ["newest", "oldest", "title", "artist"];

const normalize = (value: string | null | undefined): string => (value ?? "").trim().toLowerCase();
const getSortMode = (value: string | null): ReleaseCatalogSortMode =>
  sortModes.includes(value as ReleaseCatalogSortMode) ? (value as ReleaseCatalogSortMode) : "newest";

export function useReleasesCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const artistParam = searchParams.get("artist") ?? "";
  const genreParam = searchParams.get("genre") ?? "";
  const tagParam = searchParams.get("tag") ?? "";
  const sortMode = getSortMode(searchParams.get("sort"));

  const query = useQuery({
    queryKey: ["release-catalog"],
    queryFn: () => releaseCatalogService.getCatalogData(),
  });

  const artists = query.data?.artists ?? [];
  const genres = query.data?.genres ?? [];
  const styleTags = query.data?.styleTags ?? [];

  const selectedArtist = useMemo(
    () =>
      artists.find(
        (artist) => normalize(artist.slug) === normalize(artistParam) || normalize(artist.artistId) === normalize(artistParam),
      )?.slug ?? "",
    [artistParam, artists],
  );
  const selectedGenre = useMemo(
    () => genres.find((genre) => normalize(genre) === normalize(genreParam)) ?? "",
    [genreParam, genres],
  );
  const selectedTag = useMemo(
    () => styleTags.find((tag) => normalize(tag) === normalize(tagParam)) ?? "",
    [styleTags, tagParam],
  );

  const setParam = useCallback(
    (key: "q" | "artist" | "genre" | "tag" | "sort", value: string) => {
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (value && !(key === "sort" && value === "newest")) nextParams.set(key, value);
        else nextParams.delete(key);
        return nextParams;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const filteredReleases = useMemo(() => {
    const releases = query.data?.releases ?? [];
    const filtered = releaseCatalogService.filterCatalogReleases(releases, {
      query: queryParam,
      artist: selectedArtist,
      genre: selectedGenre,
      tag: selectedTag,
      sort: sortMode,
    });
    return releaseCatalogService.sortCatalogReleases(filtered, sortMode);
  }, [query.data?.releases, queryParam, selectedArtist, selectedGenre, selectedTag, sortMode]);

  const hasFilters = Boolean(queryParam.trim() || selectedArtist || selectedGenre || selectedTag || sortMode !== "newest");
  const hasPublishedReleases = (query.data?.releases.length ?? 0) > 0;

  return {
    ...query,
    artists,
    genres,
    styleTags,
    artistCounts: query.data?.artistCounts ?? {},
    genreCounts: query.data?.genreCounts ?? {},
    styleTagCounts: query.data?.styleTagCounts ?? {},
    query: queryParam,
    selectedArtist,
    selectedGenre,
    selectedTag,
    sortMode,
    setQuery: (value: string) => setParam("q", value),
    setArtist: (value: string) => setParam("artist", value),
    setGenre: (value: string) => setParam("genre", value),
    setTag: (value: string) => setParam("tag", value),
    setSortMode: (value: ReleaseCatalogSortMode) => setParam("sort", value),
    clearFilters,
    filteredReleases,
    hasFilters,
    hasPublishedReleases,
    isNoResults: hasPublishedReleases && hasFilters && !query.isLoading && !query.isError && filteredReleases.length === 0,
  };
}
