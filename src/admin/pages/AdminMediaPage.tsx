import { useEffect, useMemo, useState } from "react";
import { FilePlus2, ListChecks, RadioTower, Trash2, UploadCloud } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import { LinkButton } from "../../components/ui/LinkButton";
import { useAdminArtists, useAdminGalleryItems, useAdminMediaAssets, useAdminReleases, useDeleteAdminMediaAsset } from "../../hooks/admin/useAdminContent";
import type { ArtistAdminRecord, MediaAssetMetadataValue, MediaAssetRecord, SongReleaseAdminRecord } from "../../models/admin";
import type { MediaAssetAssignmentState } from "../../models/media";
import type { PublicGalleryItem } from "../../models/gallery";
import {
  AdminMediaAssetPreview,
  AdminMediaActions,
  AdminMediaEmptyState,
  AdminMediaGrid,
  AdminMediaStats,
  AdminMediaToolbar,
  AdminMediaUploadManager,
} from "../components/media";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useAdminMediaFilters } from "../hooks/useAdminMediaFilters";
import { mediaAssetLinkingService } from "../../services/media";
import { mediaAssignmentReviewService } from "../../services/media/MediaAssignmentReviewService";

const adminMediaMetadata = {
  title: "Admin Media Library | Ascend Nexus Media",
  description: "Manage Ascend Nexus Media media asset records and publishing status.",
  type: "custom" as const,
  noIndex: true,
};

type AssetAssignmentMap = Map<string, MediaAssetAssignmentState>;

const metadataString = (metadata: Record<string, MediaAssetMetadataValue> | undefined, key: string): string | undefined => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const addAssignment = (map: AssetAssignmentMap, assetId: string | undefined): void => {
  if (!assetId) return;
  const current = map.get(assetId);
  map.set(assetId, current && current !== "unassigned" ? "multi_assigned" : "assigned");
};

const addPreviousAssignments = (map: AssetAssignmentMap, value: string | undefined): void => {
  if (!value) return;
  for (const assetId of value.split(",").map((item) => item.trim()).filter(Boolean)) {
    if (!map.has(assetId)) map.set(assetId, "replaced");
  }
};

const buildMediaAssignmentStates = (
  assets: readonly MediaAssetRecord[],
  artists: readonly ArtistAdminRecord[],
  releases: readonly SongReleaseAdminRecord[],
  galleryItems: readonly PublicGalleryItem[],
): AssetAssignmentMap => {
  const map: AssetAssignmentMap = new Map();

  for (const asset of assets) {
    const assetWithStatus = asset as MediaAssetRecord & { assignmentStatus?: MediaAssetAssignmentState };
    if (assetWithStatus.assignmentStatus && assetWithStatus.assignmentStatus !== "unassigned") {
      map.set(asset.assetId, assetWithStatus.assignmentStatus);
    }
    const hasConcreteOwner = asset.ownerId?.trim() && asset.ownerId !== "unassigned" && !["media_library", "custom"].includes(asset.ownerType);
    if (hasConcreteOwner) addAssignment(map, asset.assetId);
    for (const link of mediaAssetLinkingService.getAssetLinks(asset.assetId)) {
      if (link.status === "active") addAssignment(map, asset.assetId);
      else if (!map.has(asset.assetId)) map.set(asset.assetId, link.status === "replaced" ? "replaced" : link.status === "detached" ? "detached" : link.status === "archived" ? "archived" : "unassigned");
    }
  }

  for (const artist of artists) {
    addAssignment(map, metadataString(artist.metadata, "profileImageAssetId"));
    addAssignment(map, metadataString(artist.metadata, "profileThumbnailAssetId"));
    addAssignment(map, metadataString(artist.metadata, "profileBannerAssetId"));
    addAssignment(map, metadataString(artist.metadata, "characterArtAssetId"));
    addPreviousAssignments(map, metadataString(artist.metadata, "previousArtistImageAssetIds"));
  }

  for (const release of releases) {
    addAssignment(map, metadataString(release.metadata, "coverArtAssetId"));
    addAssignment(map, metadataString(release.metadata, "coverArtThumbnailAssetId"));
    addAssignment(map, metadataString(release.metadata, "coverArtLargeAssetId"));
    addAssignment(map, metadataString(release.metadata, "audioPreviewAssetId"));
    addAssignment(map, metadataString(release.metadata, "fullSongAssetId"));
    addPreviousAssignments(map, metadataString(release.metadata, "previousCoverArtAssetIds"));
    addPreviousAssignments(map, metadataString(release.metadata, "previousAudioPreviewAssetIds"));
    addPreviousAssignments(map, metadataString(release.metadata, "previousFullSongAssetIds"));
  }

  for (const galleryItem of galleryItems) {
    addAssignment(map, metadataString(galleryItem.metadata, "mediaAssetId"));
    addPreviousAssignments(map, metadataString(galleryItem.metadata, "previousGalleryAssetIds"));
  }

  return map;
};

export function AdminMediaPage() {
  const [searchParams] = useSearchParams();
  const [uploadManagerOpen, setUploadManagerOpen] = useState(false);
  const [assetOverrides, setAssetOverrides] = useState<Record<string, MediaAssetRecord>>({});
  const mediaQuery = useAdminMediaAssets();
  const deleteMediaAsset = useDeleteAdminMediaAsset();
  const artistsQuery = useAdminArtists();
  const releasesQuery = useAdminReleases();
  const galleryQuery = useAdminGalleryItems();
  const [deletedAssetIds, setDeletedAssetIds] = useState<Set<string>>(() => new Set());
  const queryAssets = mediaQuery.data?.ok ? mediaQuery.data.data.filter((asset) => !deletedAssetIds.has(asset.assetId)) : [];
  const assets = queryAssets.map((asset) => assetOverrides[asset.assetId] ?? asset);
  const artists = artistsQuery.data?.ok ? artistsQuery.data.data : [];
  const releases = releasesQuery.data?.ok ? releasesQuery.data.data : [];
  const galleryItems = galleryQuery.data?.ok ? galleryQuery.data.data : [];
  const assignmentStates = useMemo(
    () => buildMediaAssignmentStates(assets, artists, releases, galleryItems),
    [assets, artists, releases, galleryItems],
  );
  const hasServiceError = mediaQuery.isError || mediaQuery.data?.ok === false;
  const [activeAsset, setActiveAsset] = useState<MediaAssetRecord | null>(null);
  const [detailAsset, setDetailAsset] = useState<MediaAssetRecord | null>(null);
  const handleAssetUpdated = (asset: MediaAssetRecord) => {
    setDeletedAssetIds((current) => {
      if (!current.has(asset.assetId)) return current;
      const next = new Set(current);
      next.delete(asset.assetId);
      return next;
    });
    setAssetOverrides((current) => ({ ...current, [asset.assetId]: asset }));
    setActiveAsset(asset);
    setDetailAsset((current) => (current?.assetId === asset.assetId ? asset : current));
  };
  const handleHardDeleteAsset = async (asset: MediaAssetRecord) => {
    const label = asset.title || asset.assetId || "this media asset";
    const confirmed = window.confirm(`Hard delete "${label}" from the Media Library and system records? This removes the asset record, storage-object records, links, versions, processing jobs, and intake references. This cannot be undone.`);
    if (!confirmed) return;
    const result = await deleteMediaAsset.mutateAsync(asset.assetId);
    if (!result.ok) {
      window.alert(result.error.message);
      return;
    }
    mediaAssignmentReviewService.removeAssetFromReviewQueue(asset.assetId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("anm:media-asset-hard-deleted", { detail: { assetId: asset.assetId } }));
    }
    setDeletedAssetIds((current) => {
      const next = new Set(current);
      next.add(asset.assetId);
      return next;
    });
    setAssetOverrides((current) => {
      const next = { ...current };
      delete next[asset.assetId];
      return next;
    });
    setActiveAsset((current) => (current?.assetId === asset.assetId ? null : current));
    setDetailAsset((current) => (current?.assetId === asset.assetId ? null : current));
    window.alert(`Hard deleted "${label}" from the Media Library.`);
    void mediaQuery.refetch();
  };

  const {
    searchQuery,
    assetTypeFilter,
    ownerTypeFilter,
    statusFilter,
    sortMode,
    availableAssetTypes,
    availableOwnerTypes,
    filteredAssets,
    hasFilters,
    setSearchQuery,
    setAssetTypeFilter,
    setOwnerTypeFilter,
    setStatusFilter,
    setSortMode,
    clearFilters,
  } = useAdminMediaFilters(assets);

  useEffect(() => {
    const assetId = searchParams.get("assetId");
    if (!assetId || activeAsset?.assetId === assetId) return;
    const asset = assets.find((item) => item.assetId === assetId);
    if (asset) setActiveAsset(asset);
  }, [activeAsset?.assetId, assets, searchParams]);

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminMediaMetadata} disableSocial />
      <AdminPageHeader
        title="Media Library"
        description="Manage Ascend Nexus Media cover art, artist images, banners, audio previews, promo graphics, video thumbnails, social images, logos, and public media assets."
        status="mock"
      />

      {mediaQuery.isLoading ? <GridSkeleton itemCount={8} variant="block" columns="sm:grid-cols-2 xl:grid-cols-4" /> : null}
      {hasServiceError ? <PublicLoadingErrorState /> : null}

      {!mediaQuery.isLoading && !hasServiceError ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-anm-surface-glass p-3 shadow-anm-card-glow" aria-label="Media library operations">
            <AdminMediaStats assets={assets} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="primary" onClick={() => setUploadManagerOpen(true)}>
                <UploadCloud className="h-4 w-4" aria-hidden />
                Upload Manager
              </Button>
              <LinkButton to="/admin/media/new" variant="glass">
                <FilePlus2 className="h-4 w-4" aria-hidden />
                Create Asset Record
              </LinkButton>
              <LinkButton to="/admin/media/review" variant="glass">
                <ListChecks className="h-4 w-4" aria-hidden />
                Review Assignments
              </LinkButton>
              <LinkButton to="/admin/media/processing" variant="glass">
                <RadioTower className="h-4 w-4" aria-hidden />
                Processing
              </LinkButton>
            </div>
          </section>

          <AdminMediaToolbar
            searchQuery={searchQuery}
            assetTypeFilter={assetTypeFilter}
            ownerTypeFilter={ownerTypeFilter}
            statusFilter={statusFilter}
            sortMode={sortMode}
            assetTypes={availableAssetTypes}
            ownerTypes={availableOwnerTypes}
            resultCount={filteredAssets.length}
            totalCount={assets.length}
            onSearchChange={setSearchQuery}
            onAssetTypeFilterChange={setAssetTypeFilter}
            onOwnerTypeFilterChange={setOwnerTypeFilter}
            onStatusFilterChange={setStatusFilter}
            onSortModeChange={setSortMode}
            onClearFilters={clearFilters}
          />

          {filteredAssets.length > 0 ? (
            <AdminMediaGrid
              assets={filteredAssets}
              assignmentStates={assignmentStates}
              selectedAssetId={activeAsset?.assetId}
              onSelectAsset={setActiveAsset}
              onOpenAssetDetails={setDetailAsset}
            />
          ) : (
            <AdminMediaEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          )}

          <AdminMediaAssetPreview asset={detailAsset} onClose={() => setDetailAsset(null)} onAssetUpdated={handleAssetUpdated} />
          <AdminMediaUploadManager
            open={uploadManagerOpen}
            onOpenChange={setUploadManagerOpen}
            onAssetUploaded={(asset) => {
              setDeletedAssetIds((current) => {
                if (!current.has(asset.assetId)) return current;
                const next = new Set(current);
                next.delete(asset.assetId);
                return next;
              });
              setActiveAsset(asset);
            }}
          />

          <AdminSectionCard
            title="Future Media Workflows"
            description="The media library is wired to admin services and ready for upload, editing, replacement, ownership, and CDN workflows."
          >
            <div className="grid gap-3 text-sm text-white/64 md:grid-cols-2">
              <p>Upload cover art, artist images, audio previews, and social graphics</p>
              <p>Edit alt text, credits, owner assignments, and media metadata</p>
              <p>Archive, restore, replace, delete, and bulk-manage media records</p>
              <p>Connect image optimization, CDN publishing, audit logs, and preview tooling</p>
            </div>
          </AdminSectionCard>

          {activeAsset ? (
            <aside
              className="fixed bottom-5 right-5 z-40 w-[min(42rem,calc(100vw-2.5rem))] rounded-md border border-anm-pink/25 bg-[#151019]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl"
              aria-label="Selected media asset actions"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-anm-gold">Selected media asset</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{activeAsset.title || "Untitled Media Asset"}</p>
                  <p className="mt-1 truncate text-xs text-white/44">{activeAsset.assetId}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setActiveAsset(null)}>
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminMediaActions asset={activeAsset} onView={setDetailAsset} onAssetUpdated={handleAssetUpdated} />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  isLoading={deleteMediaAsset.isPending}
                  onClick={() => void handleHardDeleteAsset(activeAsset)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Hard Delete
                </Button>
              </div>
            </aside>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
