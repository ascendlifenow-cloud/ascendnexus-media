import { createHash } from "node:crypto";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";
import type { MediaAsset, MediaStorageObject } from "../../models/mediaModels";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { buildProductionReviewSnapshot } from "./ProductionReleaseGate";
import { validateSongProductionPackage, type SongProductionPackage } from "./SongProductionContract";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";

const invalid = () => new MediaApiError("PRODUCTION_AUDIO_INVALID", "Select an available private full-song audio candidate.", 409, "validation");
const conflict = () => new MediaApiError("PRODUCTION_REVISION_CHANGED", "The release changed. Refresh the review before selecting audio.", 409, "validation");
const audioTypes = new Set(["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/flac", "audio/x-flac", "audio/aac", "audio/mp4", "audio/ogg"]);

export function privateProductionAudio(asset: MediaAsset, objects: MediaStorageObject[], links: MediaDatabaseShape["mediaAssetLinks"], releaseId: string) {
  const storage = objects.filter((item) => item.assetId === asset.assetId && !["deleted", "archived"].includes(item.status));
  if (asset.assetType !== "full_song" || asset.status !== "draft" || asset.metadata?.deletedAt || asset.thumbnailUrl || asset.largeUrl) return null;
  if (storage.length !== 1) return null;
  const object = storage[0];
  // Existing uploads use the private object key as their internal asset locator.
  if (asset.url && asset.url !== object.storagePath) return null;
  const privatePrefix = `${mediaBackendConfig.privatePrefix.replace(/^\/+|\/+$/g, "")}/`;
  if (!["ready", "uploaded"].includes(object.status) || !["private", "admin_only", "signed"].includes(object.accessLevel) || object.publicUrl || object.signedUrl || !object.storagePath.startsWith(privatePrefix) || /(?:^|\/)\.\.(?:\/|$)|\\/.test(object.storagePath) || !audioTypes.has(object.mimeType) || !/^[a-f0-9]{64}$/.test(object.checksum ?? "") || !Number.isSafeInteger(object.fileSizeBytes) || object.fileSizeBytes <= 0) return null;
  if (links.some((link) => link.assetId === asset.assetId && link.status === "active" && !(link.entityType === "release" && link.entityId === releaseId && ["fullSongAssetId", "fullSongUrl"].includes(link.fieldKey)))) return null;
  return object;
}

function requireDraft(data: MediaDatabaseShape, releaseId: string) {
  const release = data.releaseRecords.find((item) => item.releaseId === releaseId);
  if (!release || release.status !== "draft" || release.publicationState !== "draft" || release.publicVisibility !== false || !data.adminAuditEvents.some((event) => event.action === "production_draft_ingested" && event.entityId === releaseId)) throw invalid();
  return release;
}

export function applyProductionFinalAudio(data: MediaDatabaseShape, releaseId: string, input: unknown, actorId: string, now = new Date().toISOString()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["assetId", "expectedBundleHash", "requestId"].includes(key)) || typeof body.assetId !== "string" || !/^[a-zA-Z0-9_-]{1,150}$/.test(body.assetId) || typeof body.expectedBundleHash !== "string" || !/^[a-f0-9]{64}$/.test(body.expectedBundleHash) || typeof body.requestId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.requestId)) throw invalid();
  const release = requireDraft(data, releaseId);
  const artist = data.artistRecords.find((item) => item.artistId === release.artistId);
  const snapshot = buildProductionReviewSnapshot(release, data, artist);
  const auditEventId = `production-audio-${createHash("sha256").update(JSON.stringify([releaseId, actorId, body.requestId])).digest("hex")}`;
  const receipt = data.adminAuditEvents.find((event) => event.auditEventId === auditEventId);
  if (receipt) {
    if (receipt.metadata?.assetId !== body.assetId || receipt.metadata?.beforeHash !== body.expectedBundleHash || receipt.metadata?.afterHash !== snapshot.bundleHash) throw conflict();
    return { revision: receipt.metadata?.revision as number, reused: true };
  }
  if (snapshot.bundleHash !== body.expectedBundleHash) throw conflict();
  const asset = data.mediaAssets.find((item) => item.assetId === body.assetId);
  const storage = asset && privateProductionAudio(asset, data.mediaStorageObjects, data.mediaAssetLinks, releaseId);
  if (!asset || !storage) throw invalid();
  if (data.mediaIntakeRecords.some((item) => item.mediaAssetId === asset.assetId && ["quarantined", "failed", "ignored", "superseded"].includes(item.status))) throw invalid();
  const saved = release.metadata?.productionPackage as SongProductionPackage | undefined;
  if (!saved || !validateSongProductionPackage(saved).valid || saved.songId !== release.songId || saved.artistId !== release.artistId || saved.title !== release.title || saved.lyrics !== release.lyrics) throw invalid();
  const existingAudio = saved.assets.filter((item) => item.role === "final_audio");
  if (existingAudio.length === 1 && existingAudio[0].assetId === asset.assetId && existingAudio[0].sha256 === storage.checksum && data.mediaAssetLinks.some((link) => link.assetId === asset.assetId && link.entityId === releaseId && link.entityType === "release" && ["fullSongAssetId", "fullSongUrl"].includes(link.fieldKey) && link.status === "active")) return { revision: saved.revision, reused: true };
  const revision = saved.revision + 1;
  const bundle: SongProductionPackage = { ...saved, revision, assets: [...saved.assets.filter((item) => item.role !== "final_audio"), { assetId: asset.assetId, revision: asset.activeVersionId ?? storage.storageObjectId, sha256: storage.checksum!, role: "final_audio" }], catalogMetadata: { ...saved.catalogMetadata, audioStatus: "candidate_awaiting_audition" } };
  const validation = validateSongProductionPackage(bundle);
  if (!validation.valid) throw invalid();
  for (const link of data.mediaAssetLinks) {
    if (link.entityType === "release" && link.entityId === releaseId && ["fullSongAssetId", "fullSongUrl"].includes(link.fieldKey) && link.status === "active") link.status = "replaced";
  }
  data.mediaAssetLinks.push({ linkId: `${auditEventId}-link`, assetId: asset.assetId, entityType: "release", entityId: releaseId, fieldKey: "fullSongUrl", status: "active", createdAt: now, metadata: { productionRevision: revision } });
  for (const old of existingAudio) {
    const previous = data.mediaAssets.find((item) => item.assetId === old.assetId);
    if (previous && previous.assetId !== asset.assetId) {
      const active = data.mediaAssetLinks.filter((link) => link.assetId === previous.assetId && link.status === "active").length;
      previous.assignmentStatus = active > 1 ? "multi_assigned" : active ? "assigned" : "detached";
      previous.updatedAt = now;
    }
  }
  asset.assignmentStatus = "assigned";
  delete asset.url;
  asset.updatedAt = now;
  asset.updatedBy = actorId;
  asset.metadata = { ...asset.metadata, productionAudioRevision: revision };
  // Touch the validated storage record so the legacy delta writer checks it for races.
  storage.updatedAt = now;
  storage.metadata = { ...storage.metadata, productionAudioRevision: revision };
  release.updatedAt = now;
  release.updatedBy = actorId;
  release.metadata = { ...release.metadata, fullSongAssetId: asset.assetId, fullSongStorageObjectId: storage.storageObjectId, fullSongMimeType: storage.mimeType, fullSongFileSizeBytes: storage.fileSizeBytes, fullSongOriginalFileName: storage.originalFileName ?? storage.fileName, fullSongPublicPlaybackAllowed: false, pendingFullSongAssignment: false, productionPackage: bundle, productionValidation: validation, productionRevision: revision, audioStatus: "candidate_awaiting_audition", productionAudioReview: "pending" };
  for (const intake of data.mediaIntakeRecords) {
    if (intake.mediaAssetId === asset.assetId && !["quarantined", "ignored", "failed", "superseded"].includes(intake.status)) Object.assign(intake, { status: "assigned", assignedEntityType: "release", assignedEntityId: releaseId, assignedAssetRole: "fullSongUrl", assignedAt: now, reviewedAt: now, updatedAt: now });
  }
  if (!data.adminAuditEvents.some((event) => event.action === "production_asset_enrolled" && event.entityId === asset.assetId)) data.adminAuditEvents.push({ auditEventId: `${auditEventId}-enrollment`, action: "production_asset_enrolled", actorId, entityType: "media_asset", entityId: asset.assetId, summary: "Private production audio candidate enrolled; public promotion remains locked.", createdAt: now, metadata: { releaseId } });
  const afterHash = buildProductionReviewSnapshot(release, data, artist).bundleHash;
  data.adminAuditEvents.push({ auditEventId, action: "production_final_audio_selected", actorId, entityType: "release", entityId: releaseId, summary: "Private final-audio candidate associated; audition and owner approval remain pending.", createdAt: now, metadata: { assetId: asset.assetId, revision, beforeHash: body.expectedBundleHash, afterHash } });
  return { revision, reused: false };
}

export async function selectProductionFinalAudio(releaseId: string, input: unknown, actorId: string) {
  let result!: { revision: number; reused: boolean };
  await jsonDatabase.update((data) => { result = applyProductionFinalAudio(data, releaseId, input, actorId); });
  return result;
}

export async function listProductionAudioCandidates(releaseId: string) {
  const [releaseRecords, adminAuditEvents, mediaAssets, mediaStorageObjects, mediaAssetLinks, mediaIntakeRecords] = await Promise.all([jsonDatabase.listCollection("releaseRecords"), jsonDatabase.listCollection("adminAuditEvents"), jsonDatabase.listCollection("mediaAssets"), jsonDatabase.listCollection("mediaStorageObjects"), jsonDatabase.listCollection("mediaAssetLinks"), jsonDatabase.listCollection("mediaIntakeRecords")]);
  requireDraft({ releaseRecords, adminAuditEvents } as MediaDatabaseShape, releaseId);
  const items = [...mediaAssets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).flatMap((asset) => {
    if (mediaIntakeRecords.some((item) => item.mediaAssetId === asset.assetId && ["quarantined", "failed", "ignored", "superseded"].includes(item.status))) return [];
    const object = privateProductionAudio(asset, mediaStorageObjects, mediaAssetLinks, releaseId);
    return object ? [{ assetId: asset.assetId, title: asset.title, mimeType: object.mimeType, fileSizeBytes: object.fileSizeBytes }] : [];
  }).slice(0, 100);
  return { items, limit: 100 };
}
