import { galleryRepository } from "../GalleryRepository";

export class PublicGalleryRepository {
  listPublishedGalleryItems() {
    return galleryRepository.listPublic();
  }

  async getPublishedGalleryItemBySlug(slug: string) {
    return (await galleryRepository.listPublic()).find((item) => item.slug === slug) ?? null;
  }

  async getGalleryItemsByArtist(artistId: string) {
    return (await galleryRepository.listPublic()).filter((item) => item.artistId === artistId || item.sourceId === artistId);
  }

  async getGalleryItemsByRelease(releaseId: string) {
    return (await galleryRepository.listPublic()).filter((item) => item.releaseId === releaseId || item.sourceId === releaseId);
  }

  async getFeaturedGalleryItems(limit = 12) {
    return (await galleryRepository.listPublic()).filter((item) => item.featured).slice(0, limit);
  }
}

export const publicGalleryRepository = new PublicGalleryRepository();
