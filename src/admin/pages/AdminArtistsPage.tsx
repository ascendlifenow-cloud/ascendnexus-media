import { useEffect, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import { LinkButton } from "../../components/ui/LinkButton";
import { useAdminArtists, useAdminReleases } from "../../hooks/admin/useAdminContent";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../models/admin";
import { buildArtistPublishReadiness } from "../../utils/admin/artistPublishingUtils";
import {
  AdminArtistActions,
  AdminArtistEmptyState,
  AdminArtistStats,
  AdminArtistTable,
  AdminArtistToolbar,
} from "../components/artists";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useAdminArtistFilters } from "../hooks/useAdminArtistFilters";

const adminArtistsMetadata = {
  title: "Admin Artists | Ascend Nexus Media",
  description: "Manage Ascend Nexus Media artist records and publishing status.",
  type: "custom" as const,
  noIndex: true,
};

interface ArtistOperationalSection {
  key: string;
  title: string;
  description: string;
  emptyMessage: string;
  artists: ArtistAdminRecord[];
}

const hasPublishedRelease = (artist: ArtistAdminRecord, releases: readonly SongReleaseAdminRecord[]): boolean =>
  releases.some((release) => release.artistId === artist.artistId && release.status === "published");

const buildArtistOperationalSections = (
  artists: readonly ArtistAdminRecord[],
  releases: readonly SongReleaseAdminRecord[],
): ArtistOperationalSection[] => {
  const roster = artists.filter((artist) => artist.status === "active");
  const retired = artists.filter((artist) => artist.status === "archived");
  const draftArtists = artists.filter((artist) => artist.status === "draft");
  const upcoming = draftArtists.filter((artist) => buildArtistPublishReadiness(artist, []).ready && !hasPublishedRelease(artist, releases));
  const dreamedUp = draftArtists.filter((artist) => !upcoming.some((upcomingArtist) => upcomingArtist.artistId === artist.artistId));

  return [
    {
      key: "roster",
      title: "Currently Published Artists on the Roster",
      description: "Active public artist profiles currently available on the site.",
      emptyMessage: "No published roster artists match the current filters.",
      artists: roster,
    },
    {
      key: "upcoming",
      title: "Upcoming Artists Awaiting a Debut Song",
      description: "Draft artists whose profiles are ready enough to activate, but who do not yet have a published debut release.",
      emptyMessage: "No upcoming debut-ready artists match the current filters.",
      artists: upcoming,
    },
    {
      key: "dreamed-up",
      title: "Dreamed Up Artists",
      description: "Created artist concepts still being formed with profile, artwork, metadata, or readiness work remaining.",
      emptyMessage: "No in-formation artist concepts match the current filters.",
      artists: dreamedUp,
    },
    {
      key: "retired",
      title: "Retired Artists",
      description: "Archived artists preserved for operational history and possible restoration.",
      emptyMessage: "No retired artists match the current filters.",
      artists: retired,
    },
  ];
};

export function AdminArtistsPage() {
  const navigate = useNavigate();
  const [selectedArtistId, setSelectedArtistId] = useState<string | undefined>();
  const artistsQuery = useAdminArtists();
  const releasesQuery = useAdminReleases();
  const artists = artistsQuery.data?.ok ? artistsQuery.data.data : [];
  const releases = releasesQuery.data?.ok ? releasesQuery.data.data : [];
  const hasServiceError = artistsQuery.isError || artistsQuery.data?.ok === false || releasesQuery.isError || releasesQuery.data?.ok === false;
  const {
    searchQuery,
    statusFilter,
    sortMode,
    filteredArtists,
    hasFilters,
    setSearchQuery,
    setStatusFilter,
    setSortMode,
    clearFilters,
  } = useAdminArtistFilters(artists);
  const artistSections = useMemo(() => buildArtistOperationalSections(filteredArtists, releases), [filteredArtists, releases]);
  const hasSectionArtists = artistSections.some((section) => section.artists.length > 0);
  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.artistId === selectedArtistId) ?? null,
    [artists, selectedArtistId],
  );

  useEffect(() => {
    if (!selectedArtistId) return;
    if (!artists.some((artist) => artist.artistId === selectedArtistId)) setSelectedArtistId(undefined);
  }, [artists, selectedArtistId]);

  const handleOpenArtistDetails = (artist: ArtistAdminRecord) => {
    navigate(`/admin/artists/${artist.artistId}/edit`);
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminArtistsMetadata} disableSocial />
      <AdminPageHeader
        title="Artist Management"
        description="Manage Ascend Nexus Media AI Persona Artist profiles, publishing status, images, metadata, and public visibility."
        status="mock"
      />

      {artistsQuery.isLoading || releasesQuery.isLoading ? <GridSkeleton itemCount={6} variant="block" columns="sm:grid-cols-2 xl:grid-cols-6" /> : null}
      {hasServiceError ? <PublicLoadingErrorState /> : null}

      {!artistsQuery.isLoading && !releasesQuery.isLoading && !hasServiceError ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-anm-surface-glass p-3 shadow-anm-card-glow" aria-label="Artist management operations">
            <AdminArtistStats artists={artists} />
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton to="/admin/artists/new" variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                Create Artist
              </LinkButton>
              <Button type="button" variant="glass" disabled>
                <Download className="h-4 w-4" aria-hidden />
                Export Artists
              </Button>
            </div>
          </section>

          <AdminArtistToolbar
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortMode={sortMode}
            resultCount={filteredArtists.length}
            totalCount={artists.length}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onSortModeChange={setSortMode}
            onClearFilters={clearFilters}
          />

          {hasSectionArtists ? (
            <div className="grid gap-5">
              {artistSections.map((section) => (
                <AdminArtistTable
                  key={section.key}
                  title={section.title}
                  description={section.description}
                  emptyMessage={section.emptyMessage}
                  artists={section.artists}
                  selectedArtistId={selectedArtistId}
                  onSelectArtist={(artist) => setSelectedArtistId(artist.artistId)}
                  onOpenArtistDetails={handleOpenArtistDetails}
                />
              ))}
            </div>
          ) : (
            <AdminArtistEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          )}

          <AdminSectionCard
            title="Future Artist Workflows"
            description="The management surface is wired to admin services and ready for future CRUD screens."
          >
            <div className="grid gap-3 text-sm text-white/64 md:grid-cols-2">
              <p>Create and edit artist profile records</p>
              <p>Upload profile images and banners</p>
              <p>Publish, archive, restore, and delete with confirmations</p>
              <p>Connect artist SEO, social preview, and audit history tools</p>
            </div>
          </AdminSectionCard>

          {selectedArtist ? (
            <aside
              className="fixed bottom-5 right-5 z-40 w-[min(42rem,calc(100vw-2.5rem))] rounded-md border border-anm-pink/25 bg-[#151019]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl"
              aria-label="Selected artist actions"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-anm-gold">Selected artist</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{selectedArtist.displayName || selectedArtist.name || "Untitled Artist"}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedArtistId(undefined)}>
                  Clear
                </Button>
              </div>
              <AdminArtistActions artist={selectedArtist} />
            </aside>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
