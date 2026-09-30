import { useMemo, useState } from "react";
import { ArtistDirectoryEmptyState } from "../components/ArtistDirectoryEmptyState";
import { ArtistDirectoryHero } from "../components/ArtistDirectoryHero";
import { ArtistGrid } from "../components/ArtistGrid";
import { ArtistSearchBar } from "../components/ArtistSearchBar";
import { ExploreReleasesCTA } from "../components/ExploreReleasesCTA";
import { GridSkeleton } from "../components/loading";
import { RouteMetadata } from "../components/RouteMetadata";
import { usePublicArtists } from "../hooks/useArtists";
import { searchArtists } from "../utils/artistDirectory";

export function ArtistDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: artists = [], isLoading, isError } = usePublicArtists();
  const filteredArtists = useMemo(() => searchArtists(artists, searchQuery), [artists, searchQuery]);
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <main className="min-h-screen bg-ink">
      <RouteMetadata route="artists" />
      <ArtistDirectoryHero />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <ArtistSearchBar
          value={searchQuery}
          resultCount={filteredArtists.length}
          totalCount={artists.length}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
        <div className="mt-8">
          {isLoading ? <GridSkeleton variant="artist" artistVariant="directory" itemCount={6} /> : null}
          {isError ? <ArtistDirectoryEmptyState mode="error" /> : null}
          {!isLoading && !isError && artists.length === 0 ? <ArtistDirectoryEmptyState mode="no-artists" /> : null}
          {!isLoading && !isError && artists.length > 0 && filteredArtists.length === 0 ? (
            <ArtistDirectoryEmptyState mode="no-results" onClearSearch={() => setSearchQuery("")} />
          ) : null}
          {!isLoading && !isError && filteredArtists.length > 0 ? <ArtistGrid artists={filteredArtists} /> : null}
        </div>
      </section>
      <ExploreReleasesCTA />
    </main>
  );
}
