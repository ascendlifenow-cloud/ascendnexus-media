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
import { groupSongMixes } from "../models/songMixes";

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
          {hasPublishedReleases && !isNoResults ? groupSongMixes(filteredReleases, item => item.release.releaseId, item => item.release.playlistKey).map(mix => (
            <details key={mix.key} open className="mb-8 border-t border-white/15 pt-4">
              <summary className="cursor-pointer py-4 text-xl font-semibold text-white">{mix.name} <span className="text-sm font-normal text-white/60">{mix.items.length} songs</span></summary>
              {mix.items.length ? <ReleasesGrid releases={mix.items} /> : <p className="py-6 text-white/60">No songs match these filters in this mix.</p>}
            </details>
          )) : null}
        </section>
      ) : null}

      <ReleasesCatalogCTA />
    </main>
  );
}
