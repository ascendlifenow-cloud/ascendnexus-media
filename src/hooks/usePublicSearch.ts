import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";
import { normalizeSearchQuery } from "../utils/publicSearch";
import { useDebouncedValue } from "./useDebouncedValue";

export const usePublicSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";
  const sort = searchParams.get("sort") ?? "relevance";
  const genre = searchParams.get("genre") ?? "";
  const styleTag = searchParams.get("tag") ?? searchParams.get("styleTag") ?? "";
  const [query, setQueryState] = useState(initialQuery);
  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);
  const debouncedQuery = useDebouncedValue(normalizedQuery, 250);

  const queryResult = useQuery({
    queryKey: ["public-search", debouncedQuery, type, sort, genre, styleTag],
    queryFn: () => publicMediaApiClient.searchCatalog(debouncedQuery, { type: type || undefined, sort, genre: genre || undefined, styleTag: styleTag || undefined }),
    staleTime: 30 * 1000,
  });

  const setQuery = useCallback(
    (nextQuery: string) => {
      setQueryState(nextQuery);
      const normalizedNextQuery = normalizeSearchQuery(nextQuery);
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (normalizedNextQuery) {
          nextParams.set("q", nextQuery);
        } else {
          nextParams.delete("q");
        }
        return nextParams;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const clearSearch = useCallback(() => setQuery(""), [setQuery]);
  const hasQuery = normalizedQuery.length > 0;
  const totalArtists = queryResult.data?.totalArtists ?? 0;
  const totalSongs = queryResult.data?.totalSongs ?? 0;
  const totalGallery = queryResult.data?.totalGallery ?? 0;
  const totalResults = queryResult.data?.totalResults ?? 0;

  return {
    ...queryResult,
    query,
    normalizedQuery,
    searchedQuery: debouncedQuery,
    setQuery,
    clearSearch,
    artists: queryResult.data?.artists ?? [],
    songs: queryResult.data?.songs ?? [],
    gallery: queryResult.data?.gallery ?? [],
    groups: queryResult.data?.groups,
    availableFilters: queryResult.data?.availableFilters,
    sort,
    type,
    totalArtists,
    totalSongs,
    totalGallery,
    totalResults,
    hasQuery,
    hasResults: totalResults > 0,
    isEmptyQuery: !hasQuery,
    isNoResults: hasQuery && debouncedQuery === normalizedQuery && !queryResult.isLoading && !queryResult.isError && totalResults === 0,
  };
};
