import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = await mkdtemp(join(tmpdir(), "media-assignment-rollback-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
try {
  const { MediaLibraryService } = await import("../server/services/media/MediaLibraryService");
  const { mediaAssetPersistenceService: assets } = await import("../server/services/media/MediaAssetPersistenceService");
  const { mediaLinkRepository: links } = await import("../server/repositories/MediaLinkRepository");
  const { mediaAuditPersistenceService: audit } = await import("../server/services/media/MediaAuditPersistenceService");
  for (const sameAsset of [false, true]) {
    const service = new MediaLibraryService();
    const original = { assetId: "new", title: "Fixture", assetType: "cover_art", status: "draft", assignmentStatus: sameAsset ? "assigned" : "unassigned", ownerType: "release", ownerId: "original", metadata: { assignmentReviewStatus: "pending", preserved: true } } as never;
    let asset: any = structuredClone(original);
    const existing: any = { linkId: "old", assetId: sameAsset ? "new" : "previous", entityType: "release", entityId: "target", fieldKey: "coverArtUrl", status: "active" };
    const records: any[] = [existing];
    assets.get = async () => asset;
    assets.patch = async (_id, patch) => (asset = { ...asset, ...patch });
    links.findActiveEntityField = async () => existing;
    links.create = async (value) => { records.push(value); return value; };
    links.update = async (id, patch) => { const record = records.find(item => item.linkId === id); Object.assign(record, patch); return record; };
    audit.record = async () => undefined as never;
    Object.assign(service, { applyLinkedAssetToEntity: async () => { throw new Error("Synthetic apply failure"); } });
    await assert.rejects(service.linkAsset("new", { entityType: "release", entityId: "target", fieldKey: "coverArtUrl" }), /Synthetic apply failure/);
    assert.equal(existing.status, "active", "failed replacement must preserve the prior link");
    assert.equal(records[1].status, "detached");
    assert.equal(asset.assignmentStatus, (original as any).assignmentStatus);
    assert.equal(asset.ownerId, "original");
    assert.deepEqual(asset.metadata, (original as any).metadata, "failure must not resolve pending review metadata");
    Object.assign(service, { applyLinkedAssetToEntity: async () => ({ updatedMediaAsset: asset, updatedEntity: { releaseId: "target" } }) });
    const saved = await service.linkAsset("new", { entityType: "release", entityId: "target", fieldKey: "coverArtUrl" });
    assert.equal(saved.success, true);
    assert.equal(existing.status, "replaced");
    assert.equal(saved.link.status, "active");
    assert.equal(asset.assignmentStatus, "assigned");
    assert.equal(asset.metadata.assignmentReviewStatus, "resolved");
  }
  console.log("Media assignment rollback passed: previous link restored, failed link detached and original assignment/review state retained.");
} finally { await rm(root, { recursive: true, force: true }); }
