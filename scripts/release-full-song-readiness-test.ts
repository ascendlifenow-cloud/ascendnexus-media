import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SongReleaseRecord } from "../server/models/releases/SongReleaseModel";
import type { MediaStorageObject } from "../server/models/mediaModels";

const root = await mkdtemp(join(tmpdir(), "anmx-full-song-readiness-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root });
try {
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
  const { releaseValidationService: service } = await import("../server/services/releases/ReleaseValidationService");
  const empty = structuredClone(await jsonDatabase.read());
  empty.artistRecords.push({ artistId: "artist", status: "active", publicationState: "published", publicVisibility: true } as never);
  const release = { releaseId: "release", artistId: "artist", title: "Fixture", slug: "fixture", releaseDate: "2026-01-01", styleTags: [], externalLinks: {}, status: "draft", publicationState: "draft", metadata: {} } as unknown as SongReleaseRecord;
  const storage = (id: string, assetId = "full"): MediaStorageObject => ({ storageObjectId: id, assetId, provider: "mock", storagePath: `private/${id}.wav`, assetType: "custom_audio", accessLevel: "private", status: "ready" } as MediaStorageObject);
  const cases = ["public-only", "public-sibling", "storage-only-public", "path-alias", "copy-alias", "asset-pointer", "missing-storage", "pending", "archived", "deleted", "missing-asset", "mismatch", "explicit-missing", "explicit-pending"];
  for (const scenario of cases) {
    const data = structuredClone(empty);
    const source = storage("source");
    data.mediaStorageObjects.push(source);
    data.mediaAssets.push({ assetId: "full", assetType: "custom_audio", status: "draft" } as never);
    release.metadata = { fullSongAssetId: "full", fullSongStorageObjectId: "source" };
    if (scenario === "public-only" || scenario === "storage-only-public") source.accessLevel = "public";
    if (scenario === "storage-only-public") { delete release.metadata.fullSongAssetId; delete source.assetId; }
    if (["public-sibling", "path-alias", "copy-alias"].includes(scenario)) {
      const copy = storage("public", scenario === "public-sibling" ? "full" : "alias");
      copy.accessLevel = "public";
      if (scenario === "path-alias") copy.storagePath = source.storagePath;
      if (scenario === "copy-alias") copy.metadata = { sourceStorageObjectId: "source" };
      data.mediaStorageObjects.push(copy);
    }
    if (scenario === "asset-pointer") { source.assetId = "other"; source.accessLevel = "public"; data.mediaAssets[0].metadata = { storageObjectId: "source" }; }
    if (scenario === "missing-storage") data.mediaStorageObjects = [];
    if (["pending", "archived", "deleted"].includes(scenario)) source.status = scenario as MediaStorageObject["status"];
    if (scenario === "missing-asset") data.mediaAssets = [];
    if (scenario === "mismatch") source.assetId = "other";
    if (scenario === "explicit-missing") release.metadata.fullSongStorageObjectId = "absent";
    if (scenario === "explicit-pending") { const pending = storage("pending"); pending.status = "pending"; data.mediaStorageObjects.push(pending); release.metadata.fullSongStorageObjectId = "pending"; }
    await jsonDatabase.write(data);
    const before = JSON.stringify(await jsonDatabase.read());
    const strict = await service.buildValidationResult(release);
    assert.equal(strict.valid, false, scenario);
    assert.ok(strict.blockingIssues.some((issue) => issue.includes("full-song")), scenario);
    const draft = await service.buildValidationResult(release, { strictPublicMedia: false });
    assert.equal(draft.valid, true, `${scenario}: draft remains saveable`);
    assert.ok(draft.warnings.some((issue) => issue.includes("full-song")), scenario);
    assert.equal(JSON.stringify(await jsonDatabase.read()), before, `${scenario}: no writes or demotion`);
  }
  for (const accessLevel of ["private", "admin_only", "signed"] as const) {
    for (const selection of ["asset", "storage", "both", "none"]) {
      const data = structuredClone(empty);
      const source = storage("source"); source.accessLevel = accessLevel;
      const preview = storage("preview", "preview"); preview.accessLevel = "public";
      preview.metadata = { generatedFromFullSongAssetId: "full", generatedFromStorageObjectId: "source" };
      const retired = storage("retired"); retired.accessLevel = "public"; retired.status = "archived";
      data.mediaStorageObjects.push(source, preview, retired);
      data.mediaAssets.push({ assetId: "full", status: "draft", assetType: "custom_audio" } as never);
      release.metadata = { ...(selection === "asset" || selection === "both" ? { fullSongAssetId: "full" } : {}), ...(selection === "storage" || selection === "both" ? { fullSongStorageObjectId: "source" } : {}) };
      await jsonDatabase.write(data);
      assert.equal((await service.buildValidationResult(release)).valid, true, `${accessLevel}/${selection}`);
    }
  }
  console.log(`Passed ${cases.length} strict-denial/draft-warning scenarios and 12 private/preview/optional-selection cases; validation is read-only.`);
} finally {
  await rm(root, { recursive: true, force: true });
}
