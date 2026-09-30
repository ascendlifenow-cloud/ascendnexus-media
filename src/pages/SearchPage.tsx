import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ArtistDirectoryCard } from "../components/artists";
import { PublicEmptyState, PublicLoadingErrorState } from "../components/fallback";
import { GalleryItemCard } from "../components/gallery";
import { SearchResultsSkeleton } from "../components/loading";
import { PublicSearchInput } from "../components/PublicSearchInput";
import { RouteMetadata } from "../components/RouteMetadata";
import { SongGridCard } from "../components/songs";
import { Badge } from "../components/ui/Badge";
import { useAnalytics } from "../hooks/useAnalytics";
import { usePublicSearch } from "../hooks/usePublicSearch";
import type { PublicGalleryItem } from "../models/gallery";

const searchTypeOptions = [
  { label: "All", value: "" },
  { label: "Artists", value: "artist" },
  { label: "Songs", value: "release" },
  { label: "Gallery", value: "gallery_item" },
];

const sortOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Newest", value: "newest" },
  { label: "Featured", value: "featured" },
  { label: "Title", value: "title_asc" },
];

const getResultSummary = (hasQuery: boolean, query: string, totalArtists: number, totalSongs: number, totalGallery: number) => {
  if (!hasQuery) return "Search the Ascend Nexus Media catalog.";
  const artistLabel = `${totalArtists} artist${totalArtists === 1 ? "" : "s"}`;
  const songLabel = `${totalSongs} song${totalSongs === 1 ? "" : "s"}`;
  const galleryLabel = `${totalGallery} visual${totalGallery === 1 ? "" : "s"}`;
  return `Showing ${artistLabel}, ${songLabel}, and ${galleryLabel} for "${query}"`;
};

export function SearchPage() {
  const analytics = useAnalytics();
  const trackedSearchKey = useRef<string | undefined>(undefined);
  const {
    query,
    normalizedQuery,
    searchedQuery,
    setQuery,
    clearSearch,
    artists,
    songs,
    gallery,
    totalArtists,
    totalSongs,
    totalGallery,
    hasQuery,
    hasResults,
    isNoResults,
    isLoading,
    isError,
  } = usePublicSearch();

  const summary = getResultSummary(hasQuery, normalizedQuery, totalArtists, totalSongs, totalGallery);

  useEffect(() => {
    if (isLoading || isError || !hasQuery) return;
    if (searchedQuery !== normalizedQuery) return;
    const searchKey = `${searchedQuery}:${totalArtists}:${totalSongs}:${totalGallery}`;
    if (trackedSearchKey.current === searchKey) return;
    trackedSearchKey.current = searchKey;
    void analytics.trackSearch(searchedQuery, {
      totalResults: totalArtists + totalSongs,
      visualResults: totalGallery,
      artistResults: totalArtists,
      songResults: totalSongs,
    });
  }, [analytics, hasQuery, isError, isLoading, normalizedQuery, searchedQuery, totalArtists, totalGallery, totalSongs]);

  return (
    <main className="min-h-screen bg-anm-page-gradient">
      <RouteMetadata route="search" />
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-32 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <Badge variant="sunrise" className="uppercase tracking-[0.18em]">
            Public Search
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-6xl">Search Ascend Nexus Media</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 sm:text-lg">
            Find AI Persona Artists, songs, genres, and styles across the Ascend Nexus Media catalog.
          </p>
        </div>

        <div className="mt-10">
          <PublicSearchInput value={query} onChange={setQuery} onClear={clearSearch} isLoading={isLoading} />
        </div>

        <div id="public-search-status" className="mt-5 rounded-md border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white/68" aria-live="polite">
          {summary}
        </div>

        <div className="mt-6 grid gap-4 rounded-md border border-white/10 bg-black/14 p-4 text-sm text-white/68 md:grid-cols-2">
          <div>
            <p className="font-semibold text-white/78">Search type</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {searchTypeOptions.map((option) => (
                <Link key={option.value || "all"} to={`/search?q=${encodeURIComponent(query)}${option.value ? `&type=${option.value}` : ""}`} className="anm-focus rounded-md border border-white/12 px-3 py-2 font-semibold text-white/72 transition hover:border-cyanGlow/50 hover:text-white">
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-white/78">Sort</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <Link key={option.value} to={`/search?q=${encodeURIComponent(query)}&sort=${option.value}`} className="anm-focus rounded-md border border-white/12 px-3 py-2 font-semibold text-white/72 transition hover:border-amberGlow/50 hover:text-white">
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <SearchResultsSkeleton />
        </section>
      ) : null}

      {isError ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <PublicLoadingErrorState />
        </section>
      ) : null}

      {!isLoading && !isError && !hasQuery ? (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <PublicEmptyState
            title="Start with an artist, song, genre, or style"
            message="Try searches like cosmic, folk, Nova Rea, cinematic, or lanterns."
          />
        </section>
      ) : null}

      {!isLoading && !isError && isNoResults ? (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <PublicEmptyState
            title={`No results found for "${normalizedQuery}"`}
            message="Clear the search or explore the active artist roster."
            action={{ label: "Clear Search", onClick: clearSearch, variant: "glass" }}
            secondaryAction={{ label: "Explore Artists", to: "/artists", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" />, variant: "primary" }}
          />
        </section>
      ) : null}

      {!isLoading && !isError && hasQuery && hasResults ? (
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          {artists.length > 0 ? (
            <div>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Artist Results</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Matching artists</h2>
                </div>
                <Link to="/artists" className="anm-focus hidden rounded-md text-sm font-bold text-white/70 transition hover:text-white sm:inline-flex">
                  View roster
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {artists.map((artist) => (
                  <ArtistDirectoryCard key={artist.artistId} artist={artist} />
                ))}
              </div>
            </div>
          ) : null}

          {songs.length > 0 ? (
            <div className={artists.length > 0 ? "mt-16" : undefined}>
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Song Results</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Matching songs</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {songs.map(({ release, artist }) => (
                  <SongGridCard key={release.releaseId} release={release} artist={artist} />
                ))}
              </div>
            </div>
          ) : null}

          {gallery.length > 0 ? (
            <div className={artists.length > 0 || songs.length > 0 ? "mt-16" : undefined}>
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Gallery Results</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Matching visuals</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {(gallery as PublicGalleryItem[]).map((item) => (
                  <GalleryItemCard key={item.galleryItemId ?? item.slug} item={item} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
