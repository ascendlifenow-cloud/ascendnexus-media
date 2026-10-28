import { readFile, writeFile, mkdir, open } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { jsonDatabase } from "../server/services/media/JsonDatabase";
import { mediaUploadApiService } from "../server/services/media/MediaUploadApiService";
import { mediaLibraryService } from "../server/services/media/MediaLibraryService";
import { mediaBackendConfig } from "../server/config/mediaBackendConfig";
import { validateSongProductionPackage, type SongProductionPackage } from "../server/services/production/SongProductionContract";
import { assertProductionReleaseAllowed, productionReviewSnapshot } from "../server/services/production/ProductionReleaseGate";
import { adminReleaseService } from "../server/services/releases/AdminReleaseService";
import { mediaStoragePromotionService } from "../server/services/media/MediaStoragePromotionService";
import { releaseRepository } from "../server/repositories/ReleaseRepository";

// This local operator command has no public side effects and refuses remote storage/databases.
if (mediaBackendConfig.provider !== "local" || await jsonDatabase.getPersistenceMode() !== "local_json") throw new Error("Local private ingestion only; remote ingestion requires an authenticated API deployment.");
const root = path.resolve("production/anmx-002");
const lock = await open(path.join(root, ".ingestion.lock"), "wx");
const songId = "anmx-song-the-spare-key-choir";
const releaseId = "anmx-release-the-spare-key-choir";
const artistId = "anmx-artist-ascend-nexus-collective";
const actorId = "ANMX-AGENT-002";
const text = (file: string) => readFile(path.join(root, file), "utf8");
const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
try {
  const [lyrics, style1, style2, masterPrompt, details, cover] = await Promise.all([text("lyrics.txt"), text("style-1.txt"), text("style-2.txt"), text("master-prompt.txt"), text("details.txt"), readFile(path.join(root, "cover-v1.png"))]);
  const now = new Date().toISOString();
  await jsonDatabase.update((data) => {
    if (!data.artistRecords.some((artist) => artist.artistId === artistId)) data.artistRecords.push({ artistId, name: "Ascend Nexus Collective", displayName: "Ascend Nexus Collective", slug: "ascend-nexus-collective", bio: "", status: "draft", publicationState: "draft", publicVisibility: false, genres: [], styleTags: [], featured: false, sortOrder: 100, externalLinks: {}, createdAt: now, updatedAt: now, createdBy: actorId, metadata: { identitySource: "AscendNexus: SONG CREATION", profileVersion: "creative-context-2026-10-27", biographyUnspecified: true }, schemaVersion: 1 });
    if (!data.releaseRecords.some((release) => release.releaseId === releaseId)) data.releaseRecords.push({ releaseId, songId, artistId, title: "The Spare Key Choir", slug: "the-spare-key-choir", description: "A neighborhood learns belonging through practical acts of care.", lyrics, releaseDate: "2026-10-27", genre: "Country R&B / Hip-Hop", styleTags: ["ensemble", "808", "community"], status: "draft", publicationState: "draft", publicVisibility: false, featured: false, externalLinks: {}, createdAt: now, updatedAt: now, createdBy: actorId, metadata: { productionSongId: songId, audioStatus: "awaiting_generation", productionRevision: 1 }, schemaVersion: 1 });
    if (!data.adminAuditEvents.some((event) => event.action === "production_draft_ingested" && event.entityId === releaseId)) data.adminAuditEvents.push({ auditEventId: `audit-${songId}-enrollment`, action: "production_draft_ingested", entityType: "release", entityId: releaseId, actorId, summary: "Enrolled private production draft; public actions require owner release approval.", createdAt: now });
  });
  const data = await jsonDatabase.read();
  const existing = data.mediaAssets.find((asset) => asset.metadata?.productionSongId === songId && asset.metadata?.productionChecksum === hash(cover));
  const upload = existing ? null : await mediaUploadApiService.uploadSingle({ fieldName: "file", fileName: "the-spare-key-choir-cover-v1.png", mimeType: "image/png", size: cover.length, buffer: cover }, { targetType: "release", targetId: releaseId, ownerType: "release", ownerId: releaseId, assetType: "cover_art", intendedUse: "coverArt", accessLevel: "admin_only", title: "The Spare Key Choir cover", metadata: { productionSongId: songId, productionChecksum: hash(cover) } }, actorId);
  const asset = existing ?? upload?.mediaAsset;
  if (!asset) throw new Error("Cover upload failed.");
  const links = (await jsonDatabase.read()).mediaAssetLinks;
  if (!links.some((link) => link.entityId === releaseId && link.assetId === asset.assetId && link.status === "active")) await mediaLibraryService.linkAsset(asset.assetId, { entityType: "release", entityId: releaseId, fieldKey: "coverArt", updateEntityField: false, actorId });
  const destinations = [
    { platform: "youtube", copy: "The Spare Key Choir | Ascend Nexus Collective\nA song about the neighbors who make a place feel like home. AI-assisted original music. Full video and release link pending final audio and owner approval.", assetIds: [asset.assetId] },
    { platform: "facebook", copy: "A spare key. A borrowed chair. A neighborhood learning to sing together. The Spare Key Choir by Ascend Nexus Collective. Release pending review.", assetIds: [asset.assetId] },
    { platform: "instagram", copy: "Who holds a spare key to your world? The Spare Key Choir — Ascend Nexus Collective. #AscendNexusCollective #OriginalMusic #TheSpareKeyChoir", assetIds: [asset.assetId] },
  ];
  const bundle: SongProductionPackage = { songId, revision: 1, title: "The Spare Key Choir", artistId, artistProfileVersion: "creative-context-2026-10-27", brief: "Create the first private production about practical kindness and neighborhood belonging.", creativeIntent: details, masterPrompt, lyrics, styles: [style1, style2], references: [{ source: "AscendNexus: SONG CREATION, thread 01a094cd-b08f-7003-aca3-565a6ba48075; user-established artist and workflow", version: "retrieved-2026-10-27", approval: "approved" }], assets: [{ assetId: asset.assetId, revision: "1", sha256: hash(cover), role: "artwork" }], catalogMetadata: { genre: "Country R&B / Hip-Hop", audioStatus: "awaiting_generation", visualApproval: "pending", sourceApprovalScope: "artist identity and song workflow, not new output" }, destinations, websiteVisibility: "private" };
  const report = validateSongProductionPackage(bundle);
  assert.equal(report.valid, true, report.errors.join(" "));
  await jsonDatabase.update((db) => { const release = db.releaseRecords.find((item) => item.releaseId === releaseId)!; if (release.status !== "draft" || release.publicVisibility) throw new Error("Refusing to overwrite a nonprivate release."); release.lyrics = lyrics; release.metadata = { ...release.metadata, coverArtAssetId: asset.assetId, productionPackage: bundle, productionValidation: report }; });
  await assert.rejects(() => adminReleaseService.publishRelease(releaseId, actorId), /awaiting owner review/);
  const storage = (await jsonDatabase.read()).mediaStorageObjects.find((object) => object.assetId === asset.assetId)!;
  assert.notEqual(storage.accessLevel, "public");
  await assert.rejects(() => mediaStoragePromotionService.promoteStorageObjectToPublic(storage.storageObjectId), /awaiting owner review/);
  await assert.rejects(() => assertProductionReleaseAllowed(releaseId), /awaiting owner review/);
  assert.equal((await releaseRepository.listPublic()).some((item) => item.releaseId === releaseId), false);
  const snapshot = await productionReviewSnapshot(releaseId);
  await mkdir(root, { recursive: true });
  for (const [file, value] of Object.entries({ "package.json": bundle, "validation.json": report, "review.json": snapshot, "destinations.json": { status: "export_only_pending_approval", destinations, missing: ["final audio", "video renders", "owner approval", "provider OAuth integrations"] }, "ingestion-result.json": { releaseId, songId, artistId, coverAssetId: asset.assetId, reusedAsset: Boolean(existing), private: true, publishRejected: true, promotionRejected: true, publicCatalogExcluded: true, approvalStatus: "pending", audioStatus: "awaiting_generation", checkedAt: now } })) await writeFile(path.join(root, file), JSON.stringify(value, null, 2));
  console.log(JSON.stringify({ releaseId, songId, private: true, reusedAsset: Boolean(existing), counts: report.counts, previewEndpoint: `/api/admin/releases/${releaseId}/production-preview`, approvalStatus: "pending", audioStatus: "awaiting_generation" }));
} finally {
  await lock.close();
  const { unlink } = await import("node:fs/promises");
  await unlink(path.join(root, ".ingestion.lock"));
}
