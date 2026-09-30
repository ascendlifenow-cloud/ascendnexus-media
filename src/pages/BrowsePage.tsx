import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ActiveFiltersBar } from "../components/browse/ActiveFiltersBar";
import { BrowseEmptyState } from "../components/browse/BrowseEmptyState";
import { BrowseHero } from "../components/browse/BrowseHero";
import { FilteredSongResults } from "../components/browse/FilteredSongResults";
import { GenreFilterChips } from "../components/browse/GenreFilterChips";
import { StyleTagFilterChips } from "../components/browse/StyleTagFilterChips";
import { PublicLoadingErrorState } from "../components/fallback";
import { GridSkeleton } from "../components/loading";
import { RouteMetadata } from "../components/RouteMetadata";
import { useAnalytics } from "../hooks/useAnalytics";
import { useBrowseFilters } from "../hooks/useBrowseFilters";

export function BrowsePage() {
  const analytics = useAnalytics();
  const trackedFilterKey = useRef<string | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const {
    genres,
    styleTags,
    genreCounts,
    styleTagCounts,
    selectedGenre,
    selectedTag,
    setGenre,
    setTag,
    removeGenre,
    removeTag,
    clearFilters,
    filteredSongs,
    hasPublishedReleases,
    isNoResults,
    isLoading,
    isError,
  } = useBrowseFilters();
  const selectedSort = searchParams.get("sort") ?? "newest";
  const buildSortLink = (sort: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", sort);
    return `/browse?${next.toString()}`;
  };

  useEffect(() => {
    if (isLoading || isError || (!selectedGenre && !selectedTag)) return;
    const filterKey = `${selectedGenre}:${selectedTag}:${filteredSongs.length}`;
    if (trackedFilterKey.current === filterKey) return;
    trackedFilterKey.current = filterKey;
    void analytics.trackBrowseFilter({ genre: selectedGenre, tag: selectedTag }, filteredSongs.length);
  }, [analytics, filteredSongs.length, isError, isLoading, selectedGenre, selectedTag]);

  return (
    <main className="min-h-screen bg-anm-page-gradient">
      <RouteMetadata route="browse" />
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-32 sm:px-6 lg:px-8">
        <BrowseHero />
        <div className="mt-10 grid gap-5">
          <GenreFilterChips genres={genres} counts={genreCounts} selectedGenre={selectedGenre} onSelect={setGenre} />
          <StyleTagFilterChips tags={styleTags} counts={styleTagCounts} selectedTag={selectedTag} onSelect={setTag} />
          <ActiveFiltersBar
            selectedGenre={selectedGenre}
            selectedTag={selectedTag}
            onRemoveGenre={removeGenre}
            onRemoveTag={removeTag}
            onClear={clearFilters}
          />
          <div className="rounded-md border border-white/10 bg-black/14 p-4 text-sm text-white/68">
            <p className="font-semibold text-white/78">Sort releases</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["newest", "Newest"],
                ["oldest", "Oldest"],
                ["featured", "Featured"],
                ["title_asc", "Title"],
              ].map(([value, label]) => (
                <Link
                  key={value}
                  to={buildSortLink(value)}
                  aria-current={selectedSort === value ? "true" : undefined}
                  className={`anm-focus rounded-md border px-3 py-2 font-semibold transition ${selectedSort === value ? "border-cyanGlow/60 bg-cyanGlow/12 text-white" : "border-white/12 text-white/72 hover:border-cyanGlow/50 hover:text-white"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <GridSkeleton variant="song" itemCount={6} />
        </section>
      ) : null}

      {isError ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <PublicLoadingErrorState />
        </section>
      ) : null}

      {!isLoading && !isError ? (
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          {!hasPublishedReleases ? <BrowseEmptyState mode="no-releases" /> : null}
          {hasPublishedReleases && isNoResults ? <BrowseEmptyState mode="no-results" onClearFilters={clearFilters} /> : null}
          {hasPublishedReleases && !isNoResults ? (
            <>
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Filtered Releases</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{filteredSongs.length} matching release{filteredSongs.length === 1 ? "" : "s"}</h2>
              </div>
              <FilteredSongResults songs={filteredSongs} />
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
