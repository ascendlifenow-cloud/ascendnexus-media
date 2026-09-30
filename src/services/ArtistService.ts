import { publicArtistsSeed } from "../data";
import type { ArtistPublicProfile } from "../models/artist";
import { getActiveArtistsSorted, getArtistById, getPublicArtistBySlug } from "../utils/publicDataSelectors";

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export class ArtistService {
  async getPublicArtists(): Promise<ArtistPublicProfile[]> {
    await delay();
    return getActiveArtistsSorted(publicArtistsSeed);
  }

  async getActiveArtists(): Promise<ArtistPublicProfile[]> {
    return this.getPublicArtists();
  }

  async getFeaturedArtists(): Promise<ArtistPublicProfile[]> {
    const artists = await this.getActiveArtists();
    return artists.filter((artist) => artist.featured);
  }

  async getArtistBySlug(slug: string): Promise<ArtistPublicProfile | undefined> {
    await delay();
    return getPublicArtistBySlug(publicArtistsSeed, slug);
  }

  async getActiveArtistBySlug(slug: string): Promise<ArtistPublicProfile | undefined> {
    return this.getArtistBySlug(slug);
  }

  async getArtistById(artistId: string): Promise<ArtistPublicProfile | undefined> {
    await delay();
    return getArtistById(publicArtistsSeed, artistId);
  }

  async getActiveArtistById(artistId: string): Promise<ArtistPublicProfile | undefined> {
    const artists = await this.getActiveArtists();
    return artists.find((artist) => artist.artistId === artistId);
  }
}
