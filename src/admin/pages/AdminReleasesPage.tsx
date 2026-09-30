import { useEffect, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import { LinkButton } from "../../components/ui/LinkButton";
import { useAdminArtists, useAdminReleases } from "../../hooks/admin/useAdminContent";
import type { SongReleaseAdminRecord } from "../../models/admin";
import {
  AdminReleaseEmptyState,
  AdminReleaseActions,
  AdminReleaseStats,
  AdminReleaseTable,
  AdminReleaseToolbar,
} from "../components/releases";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useAdminReleaseFilters } from "../hooks/useAdminReleaseFilters";
import { releaseRouteBuilder } from "../services/ReleaseRouteBuilder";

const adminReleasesMetadata = {
  title: "Admin Releases | Ascend Nexus Media",
  description: "Manage Ascend Nexus Media song release records and publishing status.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminReleasesPage() {
  const navigate = useNavigate();
  const [releaseOverrides, setReleaseOverrides] = useState<Record<string, SongReleaseAdminRecord>>({});
  const [deletedReleaseIds, setDeletedReleaseIds] = useState<Set<string>>(() => new Set());
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | undefined>();
  const releasesQuery = useAdminReleases();
  const artistsQuery = useAdminArtists();
  const queryReleases = releasesQuery.data?.ok ? releasesQuery.data.data : [];
  const releases = queryReleases
    .filter((release) => !deletedReleaseIds.has(release.releaseId))
    .map((release) => releaseOverrides[release.releaseId] ?? release);
  const artists = artistsQuery.data?.ok ? artistsQuery.data.data : [];
  const hasServiceError =
    releasesQuery.isError ||
    artistsQuery.isError ||
    releasesQuery.data?.ok === false ||
    artistsQuery.data?.ok === false;
  const isLoading = releasesQuery.isLoading || artistsQuery.isLoading;

  const {
    searchQuery,
    statusFilter,
    artistFilter,
    featuredFilter,
    genreFilter,
    sortMode,
    availableGenres,
    filteredReleases,
    hasFilters,
    setSearchQuery,
    setStatusFilter,
    setArtistFilter,
    setFeaturedFilter,
    setGenreFilter,
    setSortMode,
    clearFilters,
  } = useAdminReleaseFilters(releases, artists);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );
  const selectedArtist = selectedRelease ? artists.find((artist) => artist.artistId === selectedRelease.artistId) ?? null : null;

  useEffect(() => {
    if (!selectedReleaseId) return;
    if (!releases.some((release) => release.releaseId === selectedReleaseId)) setSelectedReleaseId(undefined);
  }, [releases, selectedReleaseId]);

  const handleReleaseUpdated = (release: SongReleaseAdminRecord) => {
    setReleaseOverrides((current) => ({ ...current, [release.releaseId]: release }));
    setSelectedReleaseId(release.releaseId);
  };

  const handleReleaseDeleted = (releaseId: string) => {
    setDeletedReleaseIds((current) => new Set([...current, releaseId]));
    if (selectedReleaseId === releaseId) setSelectedReleaseId(undefined);
  };

  const handleOpenReleaseDetails = (release: SongReleaseAdminRecord) => {
    navigate(releaseRouteBuilder.getAdminEditPath(release));
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminReleasesMetadata} disableSocial />
      <AdminPageHeader
        title="Release Management"
        description="Manage Ascend Nexus Media song releases, publishing status, cover art, audio previews, external links, featured placement, and public visibility."
        status="mock"
      />

      {isLoading ? <GridSkeleton itemCount={8} variant="block" columns="sm:grid-cols-2 xl:grid-cols-4" /> : null}
      {hasServiceError ? <PublicLoadingErrorState /> : null}

      {!isLoading && !hasServiceError ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-anm-surface-glass p-3 shadow-anm-card-glow" aria-label="Release management operations">
            <AdminReleaseStats releases={releases} />
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton to="/admin/releases/new" variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                Create Release
              </LinkButton>
              <Button type="button" variant="glass" disabled>
                <Download className="h-4 w-4" aria-hidden />
                Export Releases
              </Button>
            </div>
          </section>

          <AdminReleaseToolbar
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            artistFilter={artistFilter}
            featuredFilter={featuredFilter}
            genreFilter={genreFilter}
            sortMode={sortMode}
            artists={artists}
            genres={availableGenres}
            resultCount={filteredReleases.length}
            totalCount={releases.length}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onArtistFilterChange={setArtistFilter}
            onFeaturedFilterChange={setFeaturedFilter}
            onGenreFilterChange={setGenreFilter}
            onSortModeChange={setSortMode}
            onClearFilters={clearFilters}
          />

          {filteredReleases.length > 0 ? (
            <AdminReleaseTable
              releases={filteredReleases}
              artists={artists}
              selectedReleaseId={selectedReleaseId}
              onSelectRelease={(release) => setSelectedReleaseId(release.releaseId)}
              onOpenReleaseDetails={handleOpenReleaseDetails}
              onReleaseUpdated={handleReleaseUpdated}
              onReleaseDeleted={handleReleaseDeleted}
            />
          ) : (
            <AdminReleaseEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          )}

          <AdminSectionCard
            title="Future Release Workflows"
            description="The release management surface is wired to admin services and ready for editing, publishing, asset, metadata, and preview workflows."
          >
            <div className="grid gap-3 text-sm text-white/64 md:grid-cols-2">
              <p>Create and edit release records with lyrics and descriptions</p>
              <p>Upload cover art, audio previews, and promotional media</p>
              <p>Publish, archive, feature, unfeature, and delete with confirmations</p>
              <p>Connect external links, SEO metadata, social previews, and audit history</p>
            </div>
          </AdminSectionCard>

          {selectedRelease ? (
            <aside
              className="fixed bottom-5 right-5 z-40 w-[min(42rem,calc(100vw-2.5rem))] rounded-md border border-anm-pink/25 bg-[#151019]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl"
              aria-label="Selected release actions"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-anm-gold">Selected release</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{selectedRelease.title || "Untitled Release"}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedReleaseId(undefined)}>
                  Clear
                </Button>
              </div>
              <AdminReleaseActions
                release={selectedRelease}
                artist={selectedArtist}
                onReleaseUpdated={handleReleaseUpdated}
                onReleaseDeleted={handleReleaseDeleted}
              />
            </aside>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
