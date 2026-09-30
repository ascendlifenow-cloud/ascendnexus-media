import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GalleryFilter } from "../models/gallery";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";
import { filterGalleryItemsByMediaType, sortGalleryItems } from "../utils/galleryUtils";

export const galleryFilters: Array<{ label: string; value: GalleryFilter }> = [
  { label: "All", value: "all" },
  { label: "Cover Art", value: "cover_art" },
  { label: "Artists", value: "artist_profile" },
  { label: "Promotional", value: "promo_graphic" },
  { label: "Video", value: "video_thumbnail" },
];

export function usePublicGallery() {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>("all");
  const query = useQuery({
    queryKey: ["public-api", "gallery", "published"],
    queryFn: () => publicMediaApiClient.listGallery(),
    staleTime: 10 * 60 * 1000,
  });

  const galleryItems = query.data ?? [];
  const filteredGalleryItems = useMemo(
    () => sortGalleryItems(filterGalleryItemsByMediaType(galleryItems, activeFilter)),
    [activeFilter, galleryItems],
  );

  return {
    activeFilter,
    setActiveFilter,
    filters: galleryFilters,
    galleryItems,
    filteredGalleryItems,
    hasGalleryItems: galleryItems.length > 0,
    isFilterEmpty: galleryItems.length > 0 && filteredGalleryItems.length === 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
