import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MediaStorageObject } from "../server/models/mediaModels";

const root = await mkdtemp(join(tmpdir(), "anmx-promotion-safety-"));
process.env.NODE_ENV = "test";
process.env.APP_ENV = "test";
process.env.MEDIA_DATA_ROOT = root;
process.env.MONGODB_URI = "";
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { mediaStoragePromotionService: service } = await import("../server/services/media/MediaStoragePromotionService");
const { backendStorageProviderRegistry: registry } = await import("../server/storage/StorageProviderRegistry");
const originalProvider = registry.getActiveProvider;
let copies = 0;
registry.getActiveProvider = () => ({
  copyFile: async () => { copies++; return { publicUrl: "https://example.invalid/preview.wav" }; },
  getPublicUrl: () => "https://example.invalid/preview.wav",
}) as never;
const empty = structuredClone(await jsonDatabase.read());
const object = (id: string, assetId: string): MediaStorageObject => ({
  storageObjectId: id, assetId, provider: "mock", storagePath: `private/${id}.wav`,
  fileName: `${id}.wav`, originalFileName: `${id}.wav`, mimeType: "audio/wav", fileExtension: "wav",
  fileSizeBytes: 100, mediaCategory: "audio", assetType: "custom_audio", accessLevel: "private", status: "ready", uploadedAt: "2026-01-01",
});
try {
  const cases = ["release-asset", "release-storage", "link", "link-asset", "requirement", "resource", "resource-path", "storage-type", "asset-type", "alias", "copy", "same-asset-preview", "asset-storage-alias", "already-public"];
  for (const scenario of cases) {
    const data = structuredClone(empty);
    const source = object("source", "full");
    data.mediaStorageObjects.push(source);
    data.mediaAssets.push({ assetId: "full", assetType: "custom_audio", metadata: {} } as never);
    if (["release-asset", "alias", "copy", "asset-storage-alias", "already-public"].includes(scenario)) data.releaseRecords.push({ releaseId: "release", status: "published", metadata: { fullSongAssetId: "full", fullSongPublicPlaybackAllowed: true } } as never);
    if (scenario === "release-storage") { delete source.assetId; data.releaseRecords.push({ metadata: { fullSongStorageObjectId: "source" } } as never); }
    if (scenario === "link") data.mediaAssetLinks.push({ assetId: "full", fieldKey: "fullSongUrl", status: "active" } as never);
    if (scenario === "link-asset") data.mediaAssetLinks.push({ assetId: "full", fieldKey: "fullSongAssetId", status: "active" } as never);
    if (scenario === "requirement") data.contentEntitlementRequirements.push({ streamAssetId: "full", status: "active" } as never);
    if (scenario === "resource") data.protectedMediaResources.push({ mediaAssetId: "full" } as never);
    if (scenario === "resource-path") data.protectedMediaResources.push({ mediaAssetId: "other", storageProvider: source.provider, privateObjectKey: source.storagePath } as never);
    if (scenario === "same-asset-preview") {
      source.assetType = "audio_preview";
      data.releaseRecords.push({ metadata: { fullSongAssetId: "full", audioPreviewAssetId: "full" } } as never);
    }
    if (scenario === "storage-type") source.assetType = "full_song";
    if (scenario === "asset-type") data.mediaAssets[0].assetType = "full_song";
    let target = source;
    if (["alias", "copy", "asset-storage-alias"].includes(scenario)) {
      target = object("preview", "preview");
      target.assetType = "audio_preview";
      if (scenario === "alias") target.storagePath = source.storagePath;
      if (scenario === "copy") target.metadata = { sourceStorageObjectId: source.storageObjectId };
      if (scenario === "asset-storage-alias") data.mediaAssets[0].metadata = { storageObjectId: target.storageObjectId };
      data.mediaStorageObjects.push(target);
      data.mediaAssets.push({ assetId: "preview", assetType: "audio_preview" } as never);
    }
    if (scenario === "already-public") { source.accessLevel = "public"; source.metadata = { sourceStorageObjectId: "source" }; }
    await jsonDatabase.write(data);
    const before = JSON.stringify(await jsonDatabase.read());
    for (const forceFullSongPublic of [false, true]) {
      await assert.rejects(() => service.promoteStorageObjectToPublic(target.storageObjectId, { forceFullSongPublic }), /cannot be promoted/);
    }
    assert.equal((await service.validatePromotionReadiness(target.assetId ?? "full")).ready, false, scenario);
    assert.equal(JSON.stringify(await jsonDatabase.read()), before, `${scenario}: no persistence side effects`);
    assert.equal(copies, 0, `${scenario}: no provider copy`);
  }
  const data = structuredClone(empty);
  data.mediaStorageObjects.push(object("full", "full"), object("preview", "preview"));
  data.mediaAssets.push({ assetId: "full", assetType: "custom_audio" } as never,
    { assetId: "preview", assetType: "audio_preview", metadata: { sourceAssetId: "full", generatedFromFullSongAssetId: "full", generatedFromStorageObjectId: "full" } } as never);
  data.releaseRecords.push({ metadata: { fullSongAssetId: "full", fullSongStorageObjectId: "full", audioPreviewAssetId: "preview" } } as never);
  data.contentEntitlementRequirements.push({ streamAssetId: "full", previewAssetId: "preview", status: "active" } as never);
  await jsonDatabase.write(data);
  assert.equal((await service.validatePromotionReadiness("preview")).ready, true);
  assert.equal((await service.promoteAsset("preview")).accessLevel, "public");
  assert.equal(copies, 1);
  console.log(`Passed ${cases.length} protected-reference scenarios, force override denial, side-effect safety, and dedicated preview promotion.`);
} finally {
  registry.getActiveProvider = originalProvider;
  await rm(root, { recursive: true, force: true });
}
