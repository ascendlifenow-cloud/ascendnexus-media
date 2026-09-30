import { getBackendConfig } from "../server/config/backendConfig";
import { publicArtistsSeed, publicSongReleasesSeed } from "../src/data";
import { jsonDatabase } from "../server/services/media/JsonDatabase";

const config = getBackendConfig();
if (config.app.isProduction || config.app.isStaging) {
  console.error("Development seed is blocked in staging and production.");
  process.exit(2);
}

await jsonDatabase.update((data) => {
  if (!data.artistRecords.length) {
    data.artistRecords = publicArtistsSeed.map((artist) => ({
      artistId: artist.artistId,
      name: artist.name,
      displayName: artist.displayName,
      slug: artist.slug,
      bio: artist.bio,
      status: "active",
      genres: [],
      styleTags: artist.musicStyle ? artist.musicStyle.split(",").map((item) => item.trim()).filter(Boolean) : [],
      profileImage: artist.profileImage,
      sortOrder: artist.sortOrder,
      featured: Boolean(artist.featured),
      externalLinks: artist.externalLinks ?? {},
      publicationState: "published",
      publicVisibility: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { source: "development_seed", publicationState: "legacy_public" },
      schemaVersion: 1,
    }));
  }
  if (!data.releaseRecords.length) {
    data.releaseRecords = publicSongReleasesSeed.map((release) => ({
      releaseId: release.releaseId,
      songId: release.songId,
      artistId: release.artistId,
      title: release.title,
      slug: release.slug,
      releaseDate: release.releaseDate,
      genre: release.genre,
      styleTags: release.styleTags,
      status: release.status === "published" ? "published" : "draft",
      publicationState: release.status === "published" ? "published" : "draft",
      publicVisibility: release.status === "published",
      featured: Boolean(release.featured),
      featuredPlacement: release.featuredPlacement,
      coverArtUrl: release.coverArtUrl,
      audioPreviewUrl: release.audioPreviewUrl,
      externalLinks: release.externalLinks ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { source: "development_seed", publicationState: release.status === "published" ? "legacy_public" : "draft" },
      schemaVersion: 1,
    }));
  }
});

console.log(JSON.stringify({ success: true, artistCount: publicArtistsSeed.length, releaseCount: publicSongReleasesSeed.length }, null, 2));
