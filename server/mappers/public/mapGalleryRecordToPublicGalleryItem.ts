import type { PublicGalleryItem } from "../../../src/models/gallery";
import { publicSafeUrl } from "./publicUrlMapper";

export const mapGalleryRecordToPublicGalleryItem = (item: PublicGalleryItem): PublicGalleryItem | null => {
  if (item.status !== "published") return null;
  const imageUrl = publicSafeUrl(item.imageUrl);
  if (!imageUrl) return null;
  return {
    galleryItemId: item.galleryItemId,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    title: item.title,
    slug: item.slug,
    description: item.description,
    imageUrl,
    thumbnailUrl: publicSafeUrl(item.thumbnailUrl),
    altText: item.altText,
    artistId: item.artistId,
    releaseId: item.releaseId,
    mediaType: item.mediaType,
    status: "published",
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};
