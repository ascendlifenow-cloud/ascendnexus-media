import { useMemo, useState } from "react";
import { Archive, Eye, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { useMediaAssignmentReviewQueue } from "../../hooks/media/useMediaAssignmentReviewQueue";
import { useMediaReviewFilters } from "../../hooks/media/useMediaReviewFilters";
import { useSelectedMediaReviewItem } from "../../hooks/media/useSelectedMediaReviewItem";
import { useAdminArtists, useAdminReleases } from "../../hooks/admin/useAdminContent";
import { AdminPageHeader, AdminSectionCard } from "../components";
import {
  MediaReviewItemList,
  MediaReviewPanel,
  MediaReviewQueueStats,
  MediaReviewQueueToolbar,
} from "../components/media-review";

const metadata = {
  title: "Media Assignment Review | Ascend Nexus Media",
  description: "Review uploaded media assets that still need assignment.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminMediaReviewQueuePage() {
  const queue = useMediaAssignmentReviewQueue();
  const artistsQuery = useAdminArtists();
  const releasesQuery = useAdminReleases();
  const filters = useMediaReviewFilters(queue.items);
  const selected = useSelectedMediaReviewItem();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeReviewItemId, setActiveReviewItemId] = useState<string | null>(null);
  const artists = artistsQuery.data?.ok ? artistsQuery.data.data : [];
  const releases = releasesQuery.data?.ok ? releasesQuery.data.data : [];

  const selectedItem = useMemo(() => {
    if (!selected.selectedItemId) return null;
    return queue.items.find((item) => item.reviewItemId === selected.selectedItemId) ?? null;
  }, [queue.items, selected.selectedItemId]);
  const activeItem = useMemo(() => {
    if (!activeReviewItemId) return null;
    return queue.items.find((item) => item.reviewItemId === activeReviewItemId) ?? null;
  }, [activeReviewItemId, queue.items]);

  const toggleSelected = (reviewItemId: string) => {
    setSelectedIds((ids) => ids.includes(reviewItemId) ? ids.filter((id) => id !== reviewItemId) : [...ids, reviewItemId]);
  };

  const handleKeep = async (reviewItemId: string) => {
    const result = await queue.keepUnassigned(reviewItemId);
    setSelectedIds((ids) => ids.filter((id) => id !== reviewItemId));
    if (activeReviewItemId === reviewItemId) setActiveReviewItemId(null);
    return result.ok;
  };

  const handleArchive = async (reviewItemId: string) => {
    const result = await queue.archiveItem(reviewItemId);
    setSelectedIds((ids) => ids.filter((id) => id !== reviewItemId));
    if (activeReviewItemId === reviewItemId) setActiveReviewItemId(null);
    return result.ok;
  };

  const handleDelete = async (reviewItemId: string) => {
    const item = queue.items.find((candidate) => candidate.reviewItemId === reviewItemId);
    const label = item?.asset.title || item?.assetId || "this media asset";
    const confirmed = window.confirm(`Hard delete "${label}" from Media Review and the Media Library? This removes the asset record, storage-object records, links, versions, and intake record references. This cannot be undone.`);
    if (!confirmed) return false;
    const result = await queue.deleteItem(reviewItemId);
    if (!result.ok) {
      window.alert(result.error.message);
      return false;
    }
    setSelectedIds((ids) => ids.filter((id) => id !== reviewItemId));
    if (activeReviewItemId === reviewItemId) setActiveReviewItemId(null);
    if (selected.selectedItemId === reviewItemId) selected.closeItem();
    return true;
  };

  const handleBulkArchive = async () => {
    await queue.bulkArchive(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={metadata} disableSocial />
      <AdminPageHeader
        title="Media Assignment Review"
        description="Review uploaded media assets that are not yet assigned to artists, releases, gallery items, homepage sections, SEO/social metadata, or site settings."
        status="mock"
      />

      {queue.loading ? <GridSkeleton itemCount={4} variant="block" columns="sm:grid-cols-2 xl:grid-cols-4" /> : null}
      {queue.error ? <PublicLoadingErrorState /> : null}

      {!queue.loading && !queue.error ? (
        <>
          <section
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/18 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
            aria-label="Media review summary and actions"
          >
            <MediaReviewQueueStats stats={queue.stats} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="primary" onClick={() => void queue.refreshQueue()}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Refresh Queue
              </Button>
              <Button type="button" variant="glass" disabled>
                <Sparkles className="h-4 w-4" aria-hidden />
                Bulk Assign
              </Button>
              <Button type="button" variant="glass" disabled={!selectedIds.length} onClick={handleBulkArchive}>
                <Archive className="h-4 w-4" aria-hidden />
                Archive Selected
              </Button>
            </div>
          </section>

          <MediaReviewQueueToolbar
            searchQuery={filters.searchQuery}
            assignmentState={filters.assignmentState}
            mediaCategory={filters.mediaCategory}
            assetType={filters.assetType}
            sortMode={filters.sortMode}
            resultCount={filters.filteredItems.length}
            totalCount={queue.items.length}
            onSearchChange={filters.setSearchQuery}
            onAssignmentStateChange={filters.setAssignmentState}
            onMediaCategoryChange={filters.setMediaCategory}
            onAssetTypeChange={filters.setAssetType}
            onSortModeChange={filters.setSortMode}
            onClearFilters={filters.clearFilters}
          />

          <div className="relative">
            <MediaReviewItemList
              items={filters.filteredItems}
              selectedItemId={activeReviewItemId ?? selectedItem?.reviewItemId}
              selectedIds={selectedIds}
              hasFilters={filters.hasFilters}
              onClearFilters={filters.clearFilters}
              onSelect={(item) => {
                setActiveReviewItemId(item.reviewItemId);
              }}
              onOpenReview={(item) => {
                setActiveReviewItemId(item.reviewItemId);
                selected.selectItem(item);
                void queue.markInReview(item.reviewItemId);
              }}
              onToggleSelected={toggleSelected}
            />
          </div>

          <MediaReviewPanel
            item={selectedItem}
            artists={artists}
            releases={releases}
            onClose={selected.closeItem}
            onAssign={async (reviewItemId, assignment) => {
              const result = await queue.assignItem(reviewItemId, assignment);
              return { ok: result.ok, message: result.ok ? undefined : result.error.message };
            }}
            onKeepUnassigned={async (reviewItemId) => handleKeep(reviewItemId)}
            onArchive={async (reviewItemId) => handleArchive(reviewItemId)}
            onRetry={async () => {
              await queue.refreshQueue();
              return true;
            }}
          />

          <AdminSectionCard
            title="Public Safety"
            description="Review actions do not publish media assets automatically. Public exposure still depends on assignment compatibility, entity readiness, and publishing workflow checks."
          >
            <div className="grid gap-3 text-sm leading-6 text-white/64 md:grid-cols-2">
              <p>Unassigned and kept-unassigned assets stay hidden from public pages.</p>
              <p>Assignment updates entity fields through the existing media linking service.</p>
              <p>Draft and admin-only assets remain controlled by visibility checks.</p>
              <p>Bulk assignment is prepared as a future workflow after single-item review.</p>
            </div>
          </AdminSectionCard>

          {activeItem ? (
            <aside
              className="fixed bottom-5 right-5 z-40 w-[min(42rem,calc(100vw-2.5rem))] rounded-md border border-anm-pink/25 bg-[#151019]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl"
              aria-label="Selected media review actions"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-anm-gold">Selected media review item</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{activeItem.asset.title || "Untitled Media Asset"}</p>
                  <p className="mt-1 truncate text-xs text-white/44">{activeItem.assetId}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setActiveReviewItemId(null)}>
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    selected.selectItem(activeItem);
                    void queue.markInReview(activeItem.reviewItemId);
                  }}
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  Open Review
                </Button>
                <Button type="button" variant="glass" size="sm" onClick={() => void handleKeep(activeItem.reviewItemId)}>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Ignore
                </Button>
                <Button type="button" variant="glass" size="sm" onClick={() => void handleArchive(activeItem.reviewItemId)}>
                  <Archive className="h-4 w-4" aria-hidden />
                  Archive
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete(activeItem.reviewItemId)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </Button>
              </div>
            </aside>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
