import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { intelligenceInsightRepository } from "../../repositories/operations/OperationsRepository";
import { id, nowIso } from "./intelligenceShared";

export class RecommendationEngine {
  async generateRecommendations() {
    const [artists, releases] = await Promise.all([
      artistRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
    ]);
    const created = [];
    for (const artist of artists) {
      const artistReleases = releases.filter((release) => release.artistId === artist.artistId);
      const title = artistReleases.length ? `Increase posting frequency for ${artist.name}` : `Launch first release for ${artist.name}`;
      const summary = artistReleases.length
        ? "Create Shorts, Reels, and a homepage feature for the artist's strongest release."
        : "Artist has no release catalog yet; prepare a single with artwork, metadata, and social variants.";
      created.push(await intelligenceInsightRepository.create({
        insightId: id("insight"),
        scope: "artist",
        entityType: "artist",
        entityId: artist.artistId,
        insightType: "recommendation",
        severity: artistReleases.length ? "low" : "medium",
        title,
        summary,
        confidence: 0.72,
        status: "open",
        detectedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: { releaseCount: artistReleases.length },
        schemaVersion: 1,
      }));
    }
    return { status: "ok", created, checkedAt: nowIso() };
  }
}

export const recommendationEngine = new RecommendationEngine();
