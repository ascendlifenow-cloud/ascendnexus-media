import { PublicLoadingErrorState } from "../components/fallback";
import { GridSkeleton } from "../components/loading";
import {
  ReleasesCatalogCTA,
  ReleasesCatalogEmptyState,
  ReleasesCatalogFilters,
  ReleasesCatalogHero,
  ReleasesGrid,
  ReleasesSortControls,
} from "../components/releases";
import { RouteMetadata } from "../components/RouteMetadata";
import { useReleasesCatalog } from "../hooks/useReleasesCatalog";

export function ReleasesCatalogPage() {
  const {
    artists,
    genres,
    styleTags,
    artistCounts,
    genreCounts,
    styleTagCounts,
    query,
    selectedArtist,
    selectedGenre,
    selectedTag,
    sortMode,
    setQuery,
    setArtist,
    setGenre,
    setTag,
    setSortMode,
    clearFilters,
    filteredReleases,
    hasPublishedReleases,
    isNoResults,
    isLoading,
    isError,
  } = useReleasesCatalog();

  return (
    <main className="min-h-screen bg-anm-page-gradient">
      <RouteMetadata route="releases" />
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-32 sm:px-6 lg:px-8">
        <ReleasesCatalogHero />
        <div className="mt-10 grid gap-5">
          <ReleasesCatalogFilters
            query={query}
            artists={artists}
            genres={genres}
            styleTags={styleTags}
            artistCounts={artistCounts}
            genreCounts={genreCounts}
            styleTagCounts={styleTagCounts}
            selectedArtist={selectedArtist}
            selectedGenre={selectedGenre}
            selectedTag={selectedTag}
            isLoading={isLoading}
            onQueryChange={setQuery}
            onClearQuery={() => setQuery("")}
            onArtistChange={setArtist}
            onGenreChange={setGenre}
            onTagChange={setTag}
          />
          <ReleasesSortControls
            sortMode={sortMode}
            resultCount={filteredReleases.length}
            onSortChange={setSortMode}
          />
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
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          {!hasPublishedReleases ? <ReleasesCatalogEmptyState mode="empty" /> : null}
          {hasPublishedReleases && isNoResults ? (
            <ReleasesCatalogEmptyState mode="no-results" onClearFilters={clearFilters} />
          ) : null}
          {hasPublishedReleases && !isNoResults ? <ReleasesGrid releases={filteredReleases} /> : null}
        </section>
      ) : null}

      <ReleasesCatalogCTA />
    </main>
  );
}
