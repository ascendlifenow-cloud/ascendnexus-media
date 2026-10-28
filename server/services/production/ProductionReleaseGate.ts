import { createHash } from "node:crypto";
import { jsonDatabase } from "../media/JsonDatabase";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { validateSongProductionPackage, type SongProductionPackage } from "./SongProductionContract";

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
  const approved = events.some((event) => event.action === "production_bundle_approved" && event.entityId === releaseId && event.actorId === process.env.ANMX_PRODUCTION_OWNER_USER_ID && event.metadata?.bundleHash === snapshot.bundleHash);
  if (!approved || snapshot.approval.blockers.some((issue) => issue !== "Owner release approval has not been granted.")) throw new MediaApiError("PRODUCTION_APPROVAL_REQUIRED", "This production draft is awaiting owner review and final-audio approval. Public actions are disabled.", 403, "validation");
  // Review approval is not execution authority until a transactional executor owns
  // the revision check and public side effects together.
  throw new MediaApiError("PRODUCTION_EXECUTION_LOCKED", "The production bundle is reviewed, but public execution is locked pending transactional release verification.", 403, "validation");
}

export async function productionReviewSnapshot(releaseId: string) {
  const release = await jsonDatabase.findCollectionRecord("releaseRecords", { releaseId });
  if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
  const [mediaAssetLinks, mediaAssets, mediaStorageObjects, adminAuditEvents, artist] = await Promise.all([
    jsonDatabase.listCollection("mediaAssetLinks"),
    jsonDatabase.listCollection("mediaAssets"),
    jsonDatabase.listCollection("mediaStorageObjects"),
    jsonDatabase.listCollection("adminAuditEvents"),
    jsonDatabase.findCollectionRecord("artistRecords", { artistId: release.artistId }),
  ]);
  const data = { mediaAssetLinks, mediaAssets, mediaStorageObjects, adminAuditEvents };
  const links = data.mediaAssetLinks.filter((link) => link.entityId === releaseId && link.status === "active");
  const assets = links.map((link) => {
    const asset = data.mediaAssets.find((item) => item.assetId === link.assetId);
    const storage = data.mediaStorageObjects.find((item) => item.assetId === link.assetId);
    return { assetId: link.assetId, role: link.fieldKey, updatedAt: asset?.updatedAt, checksum: storage?.checksum, accessLevel: storage?.accessLevel };
  });
  const { status: _status, publicationState: _publication, updatedAt: _updated, ...content } = release;
  const bundle = { release: content, assets, artist: artist && { artistId: artist.artistId, name: artist.name, bio: artist.bio, metadata: artist.metadata } };
  const bundleHash = createHash("sha256").update(JSON.stringify(bundle)).digest("hex");
  const audio = links.find((link) => link.fieldKey === "fullSongAssetId");
  const audioAsset = data.mediaAssets.find((asset) => asset.assetId === audio?.assetId && asset.assetType === "full_song" && !["deleted", "archived"].includes(asset.status));
  const audioStorage = data.mediaStorageObjects.find((object) => object.assetId === audioAsset?.assetId && object.accessLevel !== "public" && object.checksum && ["ready", "uploaded"].includes(object.status));
  const blockers: string[] = [];
  if (!audioAsset || !audioStorage) blockers.push("Final audio has not been produced or ingested.");
  try {
    const saved = release.metadata?.productionPackage as SongProductionPackage;
    const validation = validateSongProductionPackage({ ...saved, title: release.title, lyrics: release.lyrics ?? "", artistId: release.artistId });
    if (!validation.valid) blockers.push("Production package validation failed.");
    for (const manifest of saved.assets) {
      if (manifest.role === "production_document") continue;
      const linked = assets.find((asset) => asset.assetId === manifest.assetId);
      if (!linked || linked.checksum !== manifest.sha256) blockers.push("Asset manifest does not match the linked media.");
    }
    if (audioAsset && !saved.assets.some((asset) => asset.role === "final_audio" && asset.assetId === audioAsset.assetId && asset.sha256 === audioStorage?.checksum)) blockers.push("Final audio must match the production manifest.");
  } catch { blockers.push("Production package is missing or invalid."); }
  const approved = data.adminAuditEvents.some((event) => event.action === "production_bundle_approved" && event.entityId === releaseId && event.actorId === process.env.ANMX_PRODUCTION_OWNER_USER_ID && event.metadata?.bundleHash === bundleHash);
  if (!approved) blockers.unshift("Owner release approval has not been granted.");
  return { release, assets, bundleHash, approval: { status: approved && !blockers.length ? "review_approved" : "pending", publicActionsAllowed: false, executionStatus: "locked_pending_transactional_executor", blockers } };
}

export async function approveProductionRelease(releaseId: string, actorId: string, expectedBundleHash: unknown) {
  if (!process.env.ANMX_PRODUCTION_OWNER_USER_ID || actorId !== process.env.ANMX_PRODUCTION_OWNER_USER_ID) throw new MediaApiError("PRODUCTION_OWNER_REQUIRED", "Only the configured production owner may approve this bundle.", 403, "auth");
  const snapshot = await productionReviewSnapshot(releaseId);
  if (snapshot.bundleHash !== expectedBundleHash) throw new MediaApiError("PRODUCTION_REVISION_CHANGED", "The release changed. Review the current bundle before approving.", 409, "validation");
  if (snapshot.approval.blockers.some((issue) => issue !== "Owner release approval has not been granted.")) throw new MediaApiError("PRODUCTION_BUNDLE_INCOMPLETE", "Final audio and a valid package must be ingested and reviewed before approval.", 409, "validation");
  return mediaAuditPersistenceService.record("production_bundle_approved", "Owner approved exact production release bundle.", { entityType: "release", entityId: releaseId, actorId, metadata: { bundleHash: snapshot.bundleHash } });
}
