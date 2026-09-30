import type { GalleryMediaType, PublicGalleryItem } from "../models/gallery";
import {
  buildPublicGalleryItems,
  filterGalleryItemsByMediaType,
  filterPublishedGalleryItems,
  sortGalleryItems,
} from "../utils/galleryUtils";
import { ArtistService } from "./ArtistService";
import { ReleaseService } from "./ReleaseService";

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export class GalleryService {
  constructor(
    private readonly artistService = new ArtistService(),
    private readonly releaseService = new ReleaseService(),
  ) {}

  async getPublishedGalleryItems(): Promise<PublicGalleryItem[]> {
    await delay();
    const [artists, releases] = await Promise.all([
      this.artistService.getActiveArtists(),
      this.releaseService.getPublishedReleases(),
    ]);

    return filterPublishedGalleryItems(buildPublicGalleryItems(artists, releases));
  }

  async getGalleryItemsByType(mediaType: GalleryMediaType | "all"): Promise<PublicGalleryItem[]> {
    const items = await this.getPublishedGalleryItems();
    return sortGalleryItems(filterGalleryItemsByMediaType(items, mediaType));
  }

  async getGalleryItemsByArtist(artistId: string): Promise<PublicGalleryItem[]> {
    if (!artistId) return [];
    const items = await this.getPublishedGalleryItems();
    return sortGalleryItems(items.filter((item) => item.artistId === artistId));
  }

  async getGalleryItemsByRelease(releaseId: string): Promise<PublicGalleryItem[]> {
    if (!releaseId) return [];
    const items = await this.getPublishedGalleryItems();
    return sortGalleryItems(items.filter((item) => item.releaseId === releaseId));
  }
}
