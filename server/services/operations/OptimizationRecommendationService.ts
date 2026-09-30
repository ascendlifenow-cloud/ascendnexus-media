import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { galleryRepository } from "../../repositories/GalleryRepository";
import { mediaAssetRepository } from "../../repositories/MediaAssetRepository";
import { optimizationRecommendationRepository } from "../../repositories/operations/OperationsRepository";
import type { OptimizationRecommendationRecord } from "../../models/operations/OperationsModels";
import { id, nowIso } from "./operationsShared";

export class OptimizationRecommendationService {
  async generateRecommendations() {
    const [artists, releases, gallery, mediaAssets] = await Promise.all([
      artistRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
      galleryRepository.list({ includeArchived: true }),
      mediaAssetRepository.list({ includeArchived: true }),
    ]);
    const createdAt = nowIso();
    const candidates: Array<Omit<OptimizationRecommendationRecord, "recommendationId" | "createdAt" | "updatedAt" | "metadata" | "schemaVersion">> = [];
    for (const artist of artists.filter((item) => item.status !== "archived")) {
      if (!artist.profileImageUrl && !artist.characterArtUrl) candidates.push({ category: "missing_artwork", severity: "medium", status: "open", title: `Add artwork for ${artist.name}`, description: "Artist has no profile or character image assigned.", entityType: "artist", entityId: artist.artistId, detectedAt: createdAt });
      if (!artist.bio || artist.bio.length < 80) candidates.push({ category: "weak_description", severity: "low", status: "open", title: `Strengthen artist bio for ${artist.name}`, description: "Artist biography is short or missing, which weakens public pages and metadata inheritance.", entityType: "artist", entityId: artist.artistId, detectedAt: createdAt });
    }
    for (const release of releases.filter((item) => item.status !== "archived")) {
      if (!release.coverArtUrl) candidates.push({ category: "missing_artwork", severity: "high", status: "open", title: `Add cover art for ${release.title}`, description: "Release has no public cover-art URL.", entityType: "release", entityId: release.releaseId, detectedAt: createdAt });
      if (!release.description || release.description.length < 80) candidates.push({ category: "weak_description", severity: "medium", status: "open", title: `Improve release description for ${release.title}`, description: "Release description is short or missing.", entityType: "release", entityId: release.releaseId, detectedAt: createdAt });
      if (!release.audioPreviewUrl && release.status === "published") candidates.push({ category: "missing_metadata", severity: "high", status: "open", title: `Add public preview for ${release.title}`, description: "Published release has no public audio preview.", entityType: "release", entityId: release.releaseId, detectedAt: createdAt });
    }
    for (const item of gallery.filter((entry) => entry.status !== "archived")) {
      if (!item.imageUrl) candidates.push({ category: "missing_artwork", severity: "medium", status: "open", title: `Assign image for gallery item ${item.title}`, description: "Gallery item is missing a public image URL.", entityType: "gallery_item", entityId: item.galleryItemId, detectedAt: createdAt });
    }
    for (const asset of mediaAssets.filter((item) => item.assignmentStatus === "unassigned" && item.status !== "archived")) {
      candidates.push({ category: "orphaned_media", severity: "low", status: "open", title: `Review unassigned media asset`, description: "Media asset is uploaded but not actively assigned to public or admin content.", entityType: "media_asset", entityId: asset.assetId, detectedAt: createdAt });
    }
    const existing = await optimizationRecommendationRepository.list({ includeArchived: true });
    const seen = new Set(existing.map((item) => `${item.category}:${item.entityType}:${item.entityId}:${item.title}`));
    const created: OptimizationRecommendationRecord[] = [];
    for (const candidate of candidates) {
      const key = `${candidate.category}:${candidate.entityType}:${candidate.entityId}:${candidate.title}`;
      if (seen.has(key)) continue;
      created.push(await optimizationRecommendationRepository.create({
        ...candidate,
        recommendationId: id("optimization"),
        createdAt,
        updatedAt: createdAt,
        metadata: { source: "post_launch_operations" },
        schemaVersion: 1,
      }));
    }
    return { status: candidates.some((item) => item.severity === "critical" || item.severity === "high") ? "warnings" : "healthy", created, totalOpen: (await optimizationRecommendationRepository.list()).filter((item) => item.status === "open").length, checkedAt: nowIso() };
  }

  listRecommendations() {
    return optimizationRecommendationRepository.list({ sort: "detectedAt", direction: "desc", includeArchived: true });
  }
}

export const optimizationRecommendationService = new OptimizationRecommendationService();
