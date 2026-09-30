import { artistRepository } from "../ArtistRepository";

export class PublicArtistRepository {
  listPublishedArtists() {
    return artistRepository.listPublic();
  }

  async getPublishedArtistBySlug(slug: string) {
    return (await artistRepository.listPublic()).find((artist) => artist.slug === slug) ?? null;
  }

  async getPublishedArtistById(artistId: string) {
    return (await artistRepository.listPublic()).find((artist) => artist.artistId === artistId) ?? null;
  }

  async getFeaturedArtists(limit = 6) {
    return (await artistRepository.listPublic()).filter((artist) => artist.featured).slice(0, limit);
  }

  async existsPublicArtist(artistId: string) {
    return Boolean(await this.getPublishedArtistById(artistId));
  }
}

export const publicArtistRepository = new PublicArtistRepository();
