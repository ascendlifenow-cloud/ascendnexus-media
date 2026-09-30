import { mediaAssetPersistenceService } from "../server/services/media/MediaAssetPersistenceService.ts";
import { mediaStoragePersistenceService } from "../server/services/media/MediaStoragePersistenceService.ts";
import { mediaPublicationOrchestrationService } from "../server/services/publication/MediaPublicationOrchestrationService.ts";
import { mediaPublicationReadinessService } from "../server/services/publication/MediaPublicationReadinessService.ts";

const now = new Date().toISOString();
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const assetId = `publication-asset-${suffix}`;

await mediaStoragePersistenceService.create({
  storageObjectId: `publication-storage-${suffix}`,
  assetId,
  provider: "local",
  bucket: "smoke",
  storagePath: `private/media-library/unassigned/cover_art/${suffix}/cover.png`,
  fileName: "cover.png",
  originalFileName: "cover.png",
  mimeType: "image/png",
  fileExtension: "png",
  fileSizeBytes: 2048,
  mediaCategory: "image",
  assetType: "cover_art",
  accessLevel: "admin_only",
  status: "ready",
  uploadedAt: now,
  updatedAt: now,
});

await mediaAssetPersistenceService.create({
  assetId,
  ownerType: "media_asset",
  ownerId: assetId,
  assetType: "cover_art",
  title: "Publication Smoke Cover",
  url: `private/media-library/unassigned/cover_art/${suffix}/cover.png`,
  status: "draft",
  assignmentStatus: "assigned",
  createdAt: now,
  updatedAt: now,
  metadata: { publicationState: "ready_to_publish" },
});

const readiness = await mediaPublicationReadinessService.validatePublicationReadiness("media_asset", assetId);
if (!readiness.ready) throw new Error(`Expected publication readiness, got ${JSON.stringify(readiness.blockingIssues)}`);

const operation = await mediaPublicationOrchestrationService.publishEntityMedia("media_asset", assetId, {}, "smoke");
const result = await mediaPublicationOrchestrationService.buildPublicationResult(operation.publicationOperationId);
const publishedAsset = await mediaAssetPersistenceService.get(assetId);
const publicStorageObjects = (await mediaStoragePersistenceService.list()).filter((storage) => storage.assetId === assetId && storage.accessLevel === "public");

if (!result.success) throw new Error(`Publication result failed: ${JSON.stringify(result.errors)}`);
if (publishedAsset?.status !== "published") throw new Error("Published asset status was not updated.");
if (!publishedAsset?.url || publishedAsset.url.includes("private")) throw new Error("Published asset URL is not public-safe.");
if (!publicStorageObjects.length) throw new Error("Public storage object was not persisted.");

const fullSongAssetId = `publication-full-song-${suffix}`;
await mediaStoragePersistenceService.create({
  storageObjectId: `publication-full-song-storage-${suffix}`,
  assetId: fullSongAssetId,
  provider: "local",
  bucket: "smoke",
  storagePath: `private/releases/${suffix}/full-song.wav`,
  fileName: "full-song.wav",
  originalFileName: "full-song.wav",
  mimeType: "audio/wav",
  fileExtension: "wav",
  fileSizeBytes: 4096,
  mediaCategory: "audio",
  assetType: "full_song",
  accessLevel: "admin_only",
  status: "ready",
  uploadedAt: now,
  updatedAt: now,
});
await mediaAssetPersistenceService.create({
  assetId: fullSongAssetId,
  ownerType: "media_asset",
  ownerId: fullSongAssetId,
  assetType: "full_song",
  title: "Private Full Song",
  url: `private/releases/${suffix}/full-song.wav`,
  status: "draft",
  assignmentStatus: "assigned",
  createdAt: now,
  updatedAt: now,
});
const fullSongReadiness = await mediaPublicationReadinessService.validatePublicationReadiness("media_asset", fullSongAssetId);
if (!fullSongReadiness.privateOnlyAssets.length) throw new Error("Full-song asset was not classified private-only.");

const unpublish = await mediaPublicationOrchestrationService.unpublishEntityMedia("media_asset", assetId, {}, "smoke");
const hiddenAsset = await mediaAssetPersistenceService.get(assetId);
if (hiddenAsset?.status !== "draft" || hiddenAsset.metadata?.publicationState !== "not_public") throw new Error("Unpublish did not hide asset immediately.");

console.log(JSON.stringify({
  success: true,
  readiness: readiness.ready,
  publicationOperationId: operation.publicationOperationId,
  publicStorageObjects: publicStorageObjects.length,
  fullSongPrivateOnly: fullSongReadiness.privateOnlyAssets.length,
  unpublishStatus: unpublish.status,
}, null, 2));
