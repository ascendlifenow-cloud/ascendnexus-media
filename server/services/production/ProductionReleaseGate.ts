import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";
import type { SongReleaseRecord } from "../../models/releases/SongReleaseModel";
import type { ArtistRecord } from "../../models/artists/ArtistModel";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { productionValueHash, validateSongProductionPackage, type SongProductionPackage } from "./SongProductionContract";
import { productionAudioIdentity } from "./ProductionAudioIdentity";
import { privateProductionMedia } from "./ProductionMediaValidation";

const ownerBlocker = "Owner release approval has not been granted.";

export async function assertProductionAssetAllowed(assetId: string) {
  const enrollment = await jsonDatabase.findCollectionRecord("adminAuditEvents", { action: "production_asset_enrolled", entityId: assetId });
  if (enrollment) throw new MediaApiError("PRODUCTION_ASSET_EXECUTION_LOCKED", "This managed production asset remains private pending owner review and verified release execution.", 403, "validation");
}

// Enrollment is append-only audit evidence, not editable release metadata.
export async function assertProductionReleaseAllowed(releaseId: string) {
  const events = await jsonDatabase.listCollection("adminAuditEvents");
  const enrolled = events.some((event) => event.action === "production_draft_ingested" && event.entityId === releaseId);
  if (!enrolled) return;
  const snapshot = await productionReviewSnapshot(releaseId);
  if (snapshot.approval.status !== "review_approved") throw new MediaApiError("PRODUCTION_APPROVAL_REQUIRED", "This production draft is awaiting owner review and final-audio approval. Public actions are disabled.", 403, "validation");
  // Review approval is not execution authority until a transactional executor owns
  // the revision check and public side effects together.
  throw new MediaApiError("PRODUCTION_EXECUTION_LOCKED", "The production bundle is reviewed, but public execution is locked pending transactional release verification.", 403, "validation");
}

export async function productionReviewSnapshot(releaseId: string) {
  const release = await jsonDatabase.findCollectionRecord("releaseRecords", { releaseId });
  if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
  const [mediaAssetLinks, mediaAssets, mediaStorageObjects, adminAuditEvents, mediaIntakeRecords, artist] = await Promise.all([
    jsonDatabase.listCollection("mediaAssetLinks"),
    jsonDatabase.listCollection("mediaAssets"),
    jsonDatabase.listCollection("mediaStorageObjects"),
    jsonDatabase.listCollection("adminAuditEvents"),
    jsonDatabase.listCollection("mediaIntakeRecords"),
    jsonDatabase.findCollectionRecord("artistRecords", { artistId: release.artistId }),
  ]);
  return buildProductionReviewSnapshot(release, { mediaAssetLinks, mediaAssets, mediaStorageObjects, adminAuditEvents, mediaIntakeRecords }, artist);
}

export function buildProductionReviewSnapshot(release: SongReleaseRecord, data: Pick<MediaDatabaseShape, "mediaAssetLinks" | "mediaAssets" | "mediaStorageObjects" | "adminAuditEvents" | "mediaIntakeRecords">, artist: ArtistRecord | null | undefined) {
  const releaseId = release.releaseId;
  const links = data.mediaAssetLinks.filter((link) => link.entityType === "release" && link.entityId === releaseId && link.status === "active").sort((a, b) => a.linkId.localeCompare(b.linkId));
  const assets = links.map((link) => {
    const asset = data.mediaAssets.find((item) => item.assetId === link.assetId);
    const storage = data.mediaStorageObjects.find((item) => item.assetId === link.assetId);
    return { assetId: link.assetId, role: link.fieldKey, updatedAt: asset?.updatedAt, checksum: storage?.checksum, accessLevel: storage?.accessLevel };
  });
  const { status: _status, publicationState: _publication, updatedAt: _updated, ...content } = release;
  const selectedIds = new Set(links.map((link) => link.assetId));
  const intake = data.mediaIntakeRecords.filter((item) => item.mediaAssetId && selectedIds.has(item.mediaAssetId)).map((item) => ({ intakeId: item.intakeId, mediaAssetId: item.mediaAssetId, status: item.status, checksum: item.checksum, assignedEntityType: item.assignedEntityType, assignedEntityId: item.assignedEntityId, assignedAssetRole: item.assignedAssetRole })).sort((a, b) => a.intakeId.localeCompare(b.intakeId));
  // Version 2 fingerprints all selected media state, not only its checksum and timestamp.
  const bundleHash = productionValueHash({ hashVersion: 2, release: content, links, artist: artist ?? null,
    media: data.mediaAssets.filter((asset) => selectedIds.has(asset.assetId)).sort((a, b) => a.assetId.localeCompare(b.assetId)),
    storage: data.mediaStorageObjects.filter((object) => object.assetId && selectedIds.has(object.assetId)).sort((a, b) => a.storageObjectId.localeCompare(b.storageObjectId)),
    intake,
  });
  const audio = links.find((link) => ["fullSongAssetId", "fullSongUrl"].includes(link.fieldKey));
  const audioAsset = data.mediaAssets.find((asset) => asset.assetId === audio?.assetId && asset.assetType === "full_song" && !["deleted", "archived"].includes(asset.status));
  const audioStorage = data.mediaStorageObjects.find((object) => object.assetId === audioAsset?.assetId && object.accessLevel !== "public" && object.checksum && ["ready", "uploaded"].includes(object.status));
  const blockers: string[] = [];
  if (intake.some((item) => ["quarantined", "failed", "ignored", "superseded"].includes(item.status))) blockers.push("A linked production asset is quarantined or unavailable.");
  if (release.status !== "draft" || release.publicationState !== "draft" || release.publicVisibility !== false || !data.adminAuditEvents.some((event) => event.action === "production_draft_ingested" && event.entityId === releaseId)) blockers.push("An enrolled private production draft is required.");
  const savedPackage = release.metadata?.productionPackage as SongProductionPackage | undefined;
  let audioIdentity: string | null = null;
  try { if (savedPackage && audioStorage) audioIdentity = productionAudioIdentity(savedPackage, audioStorage.storageObjectId); } catch { /* Invalid packages fail validation below. */ }
  const audioReviewed = Boolean(audioIdentity && data.adminAuditEvents.some((event) => event.action === "production_audio_reviewed" && event.entityId === releaseId && event.metadata?.audioIdentity === audioIdentity));
  if (!audioAsset || !audioStorage) blockers.push("Final audio has not been produced or ingested.");
  else if (!audioReviewed) blockers.push("Final audio candidate requires audition and review.");
  try {
    const saved = release.metadata?.productionPackage as SongProductionPackage;
    const validation = validateSongProductionPackage(saved);
    if (!validation.valid) blockers.push("Production package validation failed.");
    if (saved.title !== release.title || saved.lyrics !== release.lyrics || saved.artistId !== release.artistId || saved.songId !== release.songId) blockers.push("Production package does not match the current release.");
    if (!artist || ["archived", "deleted"].includes(artist.status) || artist.deletedAt || artist.metadata?.profileVersion !== saved.artistProfileVersion) blockers.push("A matching versioned artist profile must be recorded before approval.");
    if (saved.assets.filter((asset) => asset.role === "artwork").length !== 1 || saved.assets.filter((asset) => asset.role === "final_audio").length !== 1) blockers.push("Exactly one artwork and one final-audio revision are required.");
    if (saved.assets.some((item) => item.role === "production_document")) blockers.push("Separate production-document asset approval requires supported artifact validation.");
    if (links.some((link) => !saved.assets.some((item) => item.assetId === link.assetId && ((item.role === "artwork" && ["coverArt", "coverArtUrl"].includes(link.fieldKey)) || (item.role === "final_audio" && ["fullSongUrl", "fullSongAssetId"].includes(link.fieldKey)))))) blockers.push("Every active media association must match the displayed manifest and role.");
    for (const manifest of saved.assets) {
      if (manifest.role === "production_document") continue;
      const expectedFields = manifest.role === "artwork" ? ["coverArt", "coverArtUrl"] : ["fullSongUrl", "fullSongAssetId"];
      const linked = links.filter((link) => link.assetId === manifest.assetId && expectedFields.includes(link.fieldKey));
      const asset = data.mediaAssets.find((item) => item.assetId === manifest.assetId);
      const storage = asset && ["artwork", "final_audio"].includes(manifest.role) && privateProductionMedia(asset, data.mediaStorageObjects, data.mediaAssetLinks, releaseId, manifest.role === "artwork" ? "artwork" : "audio");
      if (linked.length !== 1 || !storage || storage.checksum !== manifest.sha256) blockers.push("Asset manifest does not match ready private media.");
      if (!data.adminAuditEvents.some((event) => event.action === "production_asset_enrolled" && event.entityId === manifest.assetId)) blockers.push("Every release asset must be enrolled for private production protection.");
    }
    if (audioAsset && !saved.assets.some((asset) => asset.role === "final_audio" && asset.assetId === audioAsset.assetId && asset.sha256 === audioStorage?.checksum)) blockers.push("Final audio must match the production manifest.");
  } catch { blockers.push("Production package is missing or invalid."); }
  const owner = process.env.ANMX_PRODUCTION_OWNER_USER_ID;
  const approval = owner ? data.adminAuditEvents.find((event) => event.action === "production_bundle_approved" && event.entityId === releaseId && event.actorId === owner && event.metadata?.bundleHash === bundleHash && event.metadata?.hashVersion === 2) : undefined;
  const approved = Boolean(approval && !blockers.length);
  if (!approved) blockers.unshift(ownerBlocker);
  return { release, assets, bundleHash, artistSummary: { name: artist?.name ?? "Unavailable", profileVersion: String(artist?.metadata?.profileVersion ?? "Unrecorded") }, audioReview: { available: Boolean(audioAsset && audioStorage && audioIdentity), reviewed: audioReviewed }, approval: { status: approved ? "review_approved" : "pending", approvedAt: approved ? approval!.createdAt : null, publicActionsAllowed: false, executionStatus: "locked_pending_transactional_executor", blockers: [...new Set(blockers)] } };
}

export async function approveProductionRelease(releaseId: string, actorId: string, expectedBundleHash: unknown, confirmed = false) {
  if (!process.env.ANMX_PRODUCTION_OWNER_USER_ID || actorId !== process.env.ANMX_PRODUCTION_OWNER_USER_ID) throw new MediaApiError("PRODUCTION_OWNER_REQUIRED", "Only the configured production owner may approve this bundle.", 403, "auth");
  if (confirmed !== true || typeof expectedBundleHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedBundleHash)) throw new MediaApiError("PRODUCTION_CONFIRMATION_REQUIRED", "Explicit confirmation of the displayed bundle is required.", 400, "validation");
  let reused = false;
  await jsonDatabase.update((data) => {
    const release = data.releaseRecords.find((item) => item.releaseId === releaseId);
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    const snapshot = buildProductionReviewSnapshot(release, data, data.artistRecords.find((item) => item.artistId === release.artistId));
    if (snapshot.bundleHash !== expectedBundleHash) throw new MediaApiError("PRODUCTION_REVISION_CHANGED", "The release changed. Review the current bundle before approving.", 409, "validation");
    if (snapshot.approval.blockers.some((issue) => issue !== ownerBlocker)) throw new MediaApiError("PRODUCTION_BUNDLE_INCOMPLETE", "Resolve all bundle readiness issues before approval.", 409, "validation");
    const auditEventId = `production-approval-${productionValueHash([releaseId, actorId, expectedBundleHash])}`;
    if (data.adminAuditEvents.some((event) => event.auditEventId === auditEventId)) { reused = true; return; }
    const now = new Date().toISOString();
    // A nonmaterial touch makes concurrent release edits participate in conflict checks.
    release.updatedAt = new Date(Math.max(Date.now(), (Date.parse(release.updatedAt) || 0) + 1)).toISOString();
    data.adminAuditEvents.push({ auditEventId, action: "production_bundle_approved", entityType: "release", entityId: releaseId, actorId, summary: "Owner explicitly approved the exact review bundle; public execution remains locked.", createdAt: now, metadata: { bundleHash: expectedBundleHash, hashVersion: 2 } });
  });
  return { approved: true, reused };
}

export async function productionApprovalSummary(releaseId: string, actorId: string) {
  const snapshot = await productionReviewSnapshot(releaseId);
  const saved = snapshot.release.metadata?.productionPackage as SongProductionPackage | undefined;
  const ownerConfigured = Boolean(process.env.ANMX_PRODUCTION_OWNER_USER_ID);
  const isOwner = ownerConfigured && process.env.ANMX_PRODUCTION_OWNER_USER_ID === actorId;
  const approved = snapshot.approval.status === "review_approved";
  return { bundleHash: snapshot.bundleHash, revision: Number.isSafeInteger(saved?.revision) ? saved!.revision : null, title: snapshot.release.title, songId: snapshot.release.songId,
    artist: { ...snapshot.artistSummary, expectedProfileVersion: saved?.artistProfileVersion ?? "Unrecorded" },
    assets: Array.isArray(saved?.assets) ? saved.assets.map((item) => ({ assetId: item.assetId, role: item.role, revision: item.revision, sha256: item.sha256 })) : [],
    websiteVisibility: saved?.websiteVisibility ?? "unrecorded", scheduledFor: saved?.scheduledFor ?? null,
    destinations: Array.isArray(saved?.destinations) ? saved.destinations.map((item) => ({ platform: item.platform, copy: item.copy, assetIds: item.assetIds, readiness: "export_only" as const })) : [],
    references: Array.isArray(saved?.references) ? saved.references.map((item) => ({ source: item.source, version: item.version, approval: item.approval })) : [],
    metadata: { description: snapshot.release.description ?? "", releaseDate: snapshot.release.releaseDate, genre: snapshot.release.genre, styleTags: snapshot.release.styleTags, externalLinks: snapshot.release.externalLinks },
    blockers: snapshot.approval.blockers.filter((issue) => issue !== ownerBlocker), ownerConfigured, isOwner, approved, approvedAt: snapshot.approval.approvedAt,
    canApprove: isOwner && !approved && snapshot.approval.blockers.every((issue) => issue === ownerBlocker), executionStatus: "locked_pending_transactional_executor" as const };
}
