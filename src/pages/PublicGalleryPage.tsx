import { useEffect, useMemo, useRef } from "react";
import { PublicLoadingErrorState } from "../components/fallback";
import { GalleryEmptyState, GalleryFilterBar, GalleryGrid, GalleryHero } from "../components/gallery";
import { GallerySkeleton } from "../components/loading";
import { RouteMetadata } from "../components/RouteMetadata";
import { type GalleryFilter, type PublicGalleryItem } from "../models/gallery";
import { useAnalytics } from "../hooks/useAnalytics";
import { galleryFilters, usePublicGallery } from "../hooks/usePublicGallery";

const getGalleryCounts = (items: PublicGalleryItem[]): Record<GalleryFilter, number> => {
  const counts: Record<GalleryFilter, number> = {
    all: items.length,
    cover_art: 0,
    artist_profile: 0,
    promo_graphic: 0,
    video_thumbnail: 0,
  };

  items.forEach((item) => {
    if (item.mediaType in counts) {
      counts[item.mediaType as GalleryFilter] += 1;
    }
  });

  return counts;
};

export function PublicGalleryPage() {
  const analytics = useAnalytics();
  const trackedFilterKey = useRef<string | undefined>(undefined);
  const {
    activeFilter,
    setActiveFilter,
    galleryItems,
    filteredGalleryItems,
    hasGalleryItems,
    isFilterEmpty,
    isLoading,
    isError,
  } = usePublicGallery();
  const counts = useMemo(() => getGalleryCounts(galleryItems), [galleryItems]);

  useEffect(() => {
    if (isLoading || isError) return;
    const filterKey = `${activeFilter}:${filteredGalleryItems.length}`;
    if (trackedFilterKey.current === filterKey) return;
    trackedFilterKey.current = filterKey;
    void analytics.trackGalleryFilter(activeFilter, filteredGalleryItems.length);
  }, [activeFilter, analytics, filteredGalleryItems.length, isError, isLoading]);

  return (
    <main className="min-h-screen bg-anm-page-gradient">
      <RouteMetadata route="gallery" />
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-32 sm:px-6 lg:px-8">
        <GalleryHero />
        <div className="mt-10">
          <GalleryFilterBar
            filters={galleryFilters}
            activeFilter={activeFilter}
            counts={counts}
            onChange={setActiveFilter}
          />
        </div>
      </section>

      {isLoading ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <GallerySkeleton />
        </section>
      ) : null}

      {isError ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <PublicLoadingErrorState />
        </section>
      ) : null}

      {!isLoading && !isError ? (
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          {!hasGalleryItems ? <GalleryEmptyState mode="empty" /> : null}
          {hasGalleryItems && isFilterEmpty ? (
            <GalleryEmptyState mode="filter" onViewAll={() => setActiveFilter("all")} />
          ) : null}
          {hasGalleryItems && !isFilterEmpty ? (
            <>
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Public Gallery</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  {filteredGalleryItems.length} visual{filteredGalleryItems.length === 1 ? "" : "s"}
                </h2>
              </div>
              <GalleryGrid items={filteredGalleryItems} />
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
