import type { PublicGalleryItem } from "../../../src/models/gallery";
import { sortGalleryItems } from "../../../src/utils/galleryUtils";
import { galleryRepository } from "../../repositories/GalleryRepository";
import { adminGalleryService } from "../gallery/AdminGalleryService";
import { publicArtistService } from "./PublicArtistService";
import { publicReleaseService } from "./PublicReleaseService";

export class PublicGalleryDeliveryService {
  async listPublishedGalleryItems(filters: { mediaType?: string; artistId?: string; releaseId?: string } = {}): Promise<PublicGalleryItem[]> {
    const [artists, releases] = await Promise.all([publicArtistService.listActivePublishedArtists(), publicReleaseService.listPublishedReleases()]);
    const artistIds = new Set(artists.map((artist) => artist.artistId));
    const releaseIds = new Set(releases.map((release) => release.releaseId));
    return sortGalleryItems((await galleryRepository.listPublic())
      .map((item) => adminGalleryService.sanitizeGalleryForPublic(item))
      .filter((item): item is PublicGalleryItem => Boolean(item))
      .filter((item) => item.sourceType !== "artist" || artistIds.has(item.artistId ?? item.sourceId))
      .filter((item) => item.sourceType !== "release" || releaseIds.has(item.releaseId ?? item.sourceId))
      .filter((item) => !filters.mediaType || item.mediaType === filters.mediaType)
      .filter((item) => !filters.artistId || item.artistId === filters.artistId)
      .filter((item) => !filters.releaseId || item.releaseId === filters.releaseId));
  }

  async getPublishedGalleryItemBySlug(slug: string): Promise<PublicGalleryItem | undefined> {
    return (await this.listPublishedGalleryItems()).find((item) => item.slug === slug);
  }
}

export const publicGalleryDeliveryService = new PublicGalleryDeliveryService();
