import { ArrowDown, ArrowUp, Plus, RefreshCcw } from "lucide-react";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import { LinkButton } from "../../components/ui/LinkButton";
import { useAdminArtists, useAdminGalleryItems, useAdminReleases, useReorderAdminGalleryItems } from "../../hooks/admin/useAdminContent";
import {
  AdminGalleryEmptyState,
  AdminGalleryGrid,
  AdminGalleryItemPreview,
  AdminGalleryStats,
  AdminGalleryToolbar,
} from "../components/gallery";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useAdminGalleryFilters } from "../hooks/useAdminGalleryFilters";
import { useSelectedGalleryItem } from "../hooks/useSelectedGalleryItem";

const adminGalleryMetadata = {
  title: "Admin Gallery | Ascend Nexus Media",
  description: "Manage Ascend Nexus Media public gallery item records and publishing status.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminGalleryPage() {
  const galleryQuery = useAdminGalleryItems();
  const artistsQuery = useAdminArtists();
  const releasesQuery = useAdminReleases();
  const galleryItems = galleryQuery.data?.ok ? galleryQuery.data.data : [];
  const artists = artistsQuery.data?.ok ? artistsQuery.data.data : [];
  const releases = releasesQuery.data?.ok ? releasesQuery.data.data : [];
  const hasServiceError =
    galleryQuery.isError ||
    artistsQuery.isError ||
    releasesQuery.isError ||
    galleryQuery.data?.ok === false ||
    artistsQuery.data?.ok === false ||
    releasesQuery.data?.ok === false;
  const isLoading = galleryQuery.isLoading || artistsQuery.isLoading || releasesQuery.isLoading;
  const { selectedItem, selectItem, clearSelectedItem } = useSelectedGalleryItem();
  const reorderGalleryItems = useReorderAdminGalleryItems();

  const {
    searchQuery,
    mediaTypeFilter,
    sourceTypeFilter,
    statusFilter,
    sortMode,
    availableMediaTypes,
    availableSourceTypes,
    filteredItems,
    hasFilters,
    setSearchQuery,
    setMediaTypeFilter,
    setSourceTypeFilter,
    setStatusFilter,
    setSortMode,
    clearFilters,
  } = useAdminGalleryFilters(galleryItems);

  const saveCurrentOrder = () => {
    void reorderGalleryItems.mutateAsync(filteredItems.map((item, index) => ({ galleryItemId: item.galleryItemId, sortOrder: index + 1 })));
  };

  const moveSelectedItem = (direction: -1 | 1) => {
    if (!selectedItem) return;
    const index = filteredItems.findIndex((item) => item.galleryItemId === selectedItem.galleryItemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= filteredItems.length) return;
    const next = [...filteredItems];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    void reorderGalleryItems.mutateAsync(next.map((item, order) => ({ galleryItemId: item.galleryItemId, sortOrder: order + 1 })));
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminGalleryMetadata} disableSocial />
      <AdminPageHeader
        title="Gallery Management"
        description="Manage Ascend Nexus Media public gallery items, cover art displays, artist visuals, promo graphics, video thumbnails, custom media items, sorting, and visibility."
        status="ready"
      />

      {isLoading ? <GridSkeleton itemCount={9} variant="block" columns="sm:grid-cols-2 xl:grid-cols-3" /> : null}
      {hasServiceError ? <PublicLoadingErrorState /> : null}

      {!isLoading && !hasServiceError ? (
        <>
          <section
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/18 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
            aria-label="Gallery management summary and actions"
          >
            <AdminGalleryStats items={galleryItems} />
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton to="/admin/gallery/new" variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                Add Gallery Item
              </LinkButton>
              <Button type="button" variant="glass" disabled={galleryQuery.isFetching} onClick={() => void galleryQuery.refetch()}>
                <RefreshCcw className="h-4 w-4" aria-hidden />
                Sync From Media
              </Button>
              <Button
                type="button"
                variant="glass"
                disabled={reorderGalleryItems.isPending || filteredItems.length === 0}
                onClick={saveCurrentOrder}
              >
                <RefreshCcw className="h-4 w-4" aria-hidden />
                Save Current Order
              </Button>
              <Button
                type="button"
                variant="glass"
                disabled={reorderGalleryItems.isPending || !selectedItem}
                onClick={() => moveSelectedItem(-1)}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
                Move Selected Up
              </Button>
              <Button
                type="button"
                variant="glass"
                disabled={reorderGalleryItems.isPending || !selectedItem}
                onClick={() => moveSelectedItem(1)}
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
                Move Selected Down
              </Button>
            </div>
          </section>

          <AdminGalleryToolbar
            searchQuery={searchQuery}
            mediaTypeFilter={mediaTypeFilter}
            sourceTypeFilter={sourceTypeFilter}
            statusFilter={statusFilter}
            sortMode={sortMode}
            mediaTypes={availableMediaTypes}
            sourceTypes={availableSourceTypes}
            resultCount={filteredItems.length}
            totalCount={galleryItems.length}
            onSearchChange={setSearchQuery}
            onMediaTypeFilterChange={setMediaTypeFilter}
            onSourceTypeFilterChange={setSourceTypeFilter}
            onStatusFilterChange={setStatusFilter}
            onSortModeChange={setSortMode}
            onClearFilters={clearFilters}
          />

          {filteredItems.length > 0 ? (
            <>
              <AdminGalleryGrid
                items={filteredItems}
                artists={artists}
                releases={releases}
                selectedItemId={selectedItem?.galleryItemId}
                onViewItem={selectItem}
              />
            </>
          ) : (
            <AdminGalleryEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          )}

          <AdminGalleryItemPreview item={selectedItem} artists={artists} releases={releases} onClose={clearSelectedItem} />

          <AdminSectionCard title="Production Gallery Workflow" description="Gallery records now save through authenticated admin APIs with persisted lifecycle, ordering, source, and public-delivery state.">
            <div className="grid gap-3 text-sm text-white/64 md:grid-cols-2">
              <p>Create and edit curated gallery item records through the backend.</p>
              <p>Persist gallery order changes and source relationships.</p>
              <p>Publish, unpublish, archive, and restore records with backend authorization.</p>
              <p>Public gallery delivery filters draft, archived, and private media.</p>
            </div>
          </AdminSectionCard>
        </>
      ) : null}
    </div>
  );
}
