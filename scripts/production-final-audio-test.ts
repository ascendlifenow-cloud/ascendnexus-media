import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

const root = await mkdtemp(join(tmpdir(), "anmx-final-audio-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_STORAGE_PROVIDER: "local", MEDIA_STORAGE_LOCAL_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { applyProductionFinalAudio } = await import("../server/services/production/ProductionFinalAudioService");
const { buildProductionReviewSnapshot, assertProductionReleaseAllowed, assertProductionAssetAllowed } = await import("../server/services/production/ProductionReleaseGate");
const { validateSongProductionPackage } = await import("../server/services/production/SongProductionContract");
const { authenticationService } = await import("../server/services/auth/AuthenticationService");
const { handleAdminReleaseRoute } = await import("../server/routes/adminReleaseRoutes");
const { sendSafeError } = await import("../server/middleware/mediaErrorMiddleware");
const { assertOriginAllowedForMutation } = await import("../server/utils/security/securityHeaderUtils");
const server = createServer(async (request, response) => {
  try {
    assertOriginAllowedForMutation(request);
    if (!await handleAdminReleaseRoute(request, response, new URL(request.url!, "http://localhost"))) { response.writeHead(404); response.end(); }
  } catch (error) { sendSafeError(response, error); }
});
const authenticate = authenticationService.authenticateRequest;
try {
  const fixture = structuredClone(await jsonDatabase.read());
  const now = "2026-10-27T12:00:00.000Z";
  const bundle = { songId: "fixture-song", revision: 1, title: "Test fixture", artistId: "fixture-artist", artistProfileVersion: "fixture-only", brief: "Synthetic test", creativeIntent: "Not a production song", masterPrompt: "Synthetic test", lyrics: "x".repeat(4600), styles: ["test style one", "test style two"] as [string, string], references: [{ source: "Synthetic fixture", version: "1", approval: "approved" as const }], assets: [{ assetId: "art", revision: "1", sha256: "a".repeat(64), role: "artwork" as const }], catalogMetadata: {}, destinations: [], websiteVisibility: "private" as const };
  fixture.releaseRecords.push({ releaseId: "release", songId: bundle.songId, artistId: bundle.artistId, title: bundle.title, slug: "fixture", lyrics: bundle.lyrics, releaseDate: "2026-10-27", genre: "Test", styleTags: [], featured: false, externalLinks: {}, status: "draft", publicationState: "draft", publicVisibility: false, createdAt: now, updatedAt: now, schemaVersion: 1, metadata: { productionPackage: bundle } });
  fixture.adminAuditEvents.push({ auditEventId: "enrolled", action: "production_draft_ingested", entityType: "release", entityId: "release", summary: "Fixture", createdAt: now });
  for (const [id, assetType, mimeType, checksum] of [["art", "cover_art", "image/png", "a"], ["audio", "full_song", "audio/wav", "b"], ["audio2", "full_song", "audio/mpeg", "c"]]) {
    fixture.mediaAssets.push({ assetId: id, ownerType: "release", title: `Fixture ${id}`, assetType, url: assetType === "full_song" ? `private/${id}` : undefined, status: "draft", assignmentStatus: "unassigned", createdAt: now, updatedAt: now });
    fixture.mediaStorageObjects.push({ storageObjectId: `storage-${id}`, assetId: id, provider: "local", storagePath: `private/${id}`, fileName: id, originalFileName: id, mimeType, fileExtension: "wav", fileSizeBytes: 100, mediaCategory: assetType === "full_song" ? "audio" : "image", assetType, accessLevel: "admin_only", status: "ready", checksum: checksum.repeat(64), uploadedAt: now });
  }
  fixture.mediaAssetLinks.push({ linkId: "art-link", assetId: "art", entityType: "release", entityId: "release", fieldKey: "coverArt", status: "active", createdAt: now });
  const hash = (data: typeof fixture) => buildProductionReviewSnapshot(data.releaseRecords[0], data, null).bundleHash;
  const input = { assetId: "audio", expectedBundleHash: hash(fixture), requestId: "request-001" };
  const selected = structuredClone(fixture);
  assert.deepEqual(applyProductionFinalAudio(selected, "release", input, "admin", now), { revision: 2, reused: false });
  const saved = selected.releaseRecords[0].metadata!.productionPackage as typeof bundle;
  assert.equal(saved.assets.filter((item) => String(item.role) === "final_audio").length, 1);
  assert.equal(validateSongProductionPackage(saved).valid, true);
  assert.equal(selected.releaseRecords[0].metadata!.fullSongAssetId, "audio");
  assert.equal(selected.releaseRecords[0].publicVisibility, false);
  assert.equal(selected.mediaStorageObjects[1].accessLevel, "admin_only");
  assert.equal(selected.mediaAssets[1].url, undefined);
  assert.notEqual(hash(selected), input.expectedBundleHash);
  assert.ok(buildProductionReviewSnapshot(selected.releaseRecords[0], selected, null).approval.blockers.includes("Final audio candidate requires audition and review."));
  const unchanged = JSON.stringify(selected);
  assert.equal(applyProductionFinalAudio(selected, "release", input, "admin", now).reused, true);
  assert.equal(JSON.stringify(selected), unchanged);
  assert.throws(() => applyProductionFinalAudio(selected, "release", { ...input, assetId: "audio2" }, "admin"), /release changed/i);
  assert.throws(() => applyProductionFinalAudio(selected, "release", { ...input, requestId: "new-request" }, "admin"), /release changed/i);
  const nextInput = { assetId: "audio2", expectedBundleHash: hash(selected), requestId: "request-002" };
  assert.equal(applyProductionFinalAudio(selected, "release", nextInput, "admin", now).revision, 3);
  assert.equal(selected.mediaAssetLinks.filter((link) => link.fieldKey === "fullSongUrl" && link.status === "active").length, 1);
  assert.equal(selected.mediaAssets.find((asset) => asset.assetId === "audio")!.assignmentStatus, "detached");
  for (const mutate of [
    (data: typeof fixture) => { data.mediaStorageObjects[1].accessLevel = "public"; },
    (data: typeof fixture) => { data.mediaStorageObjects[1].checksum = "bad"; },
    (data: typeof fixture) => { data.mediaStorageObjects[1].publicUrl = "https://example.invalid/audio"; },
    (data: typeof fixture) => { data.mediaAssets[1].url = "https://example.invalid/audio"; },
    (data: typeof fixture) => { data.mediaStorageObjects[1].mimeType = "text/plain"; },
    (data: typeof fixture) => { data.mediaStorageObjects[1].status = "failed"; },
    (data: typeof fixture) => { data.mediaAssets[1].status = "archived"; },
    (data: typeof fixture) => { data.mediaAssetLinks.push({ linkId: "other", assetId: "audio", entityType: "release", entityId: "other", fieldKey: "fullSongUrl", status: "active", createdAt: now }); },
    (data: typeof fixture) => { data.releaseRecords[0].publicVisibility = true; },
  ]) {
    const invalid = structuredClone(fixture); mutate(invalid);
    const original = JSON.stringify(invalid);
    assert.throws(() => applyProductionFinalAudio(invalid, "release", { ...input, expectedBundleHash: hash(invalid) }, "admin"));
    assert.equal(JSON.stringify(invalid), original);
  }
  assert.throws(() => applyProductionFinalAudio(structuredClone(fixture), "release", { ...input, storagePath: "injected" }, "admin"));
  await jsonDatabase.write(fixture);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/admin/releases/release`;
  assert.equal((await fetch(`${base}/production-audio-candidates`)).status, 401);
  authenticationService.authenticateRequest = async () => ({ user: { userId: "limited" }, permissions: ["releases.read"] }) as never;
  assert.equal((await fetch(`${base}/production-audio-candidates`)).status, 403);
  authenticationService.authenticateRequest = async () => ({ user: { userId: "admin" }, permissions: ["releases.read", "media.read", "releases.update", "media.update"] }) as never;
  const candidates = await fetch(`${base}/production-audio-candidates`);
  assert.equal(candidates.status, 200);
  assert.equal(candidates.headers.get("cache-control"), "private, no-store");
  assert.equal(candidates.headers.get("x-robots-tag"), "noindex, nofollow");
  const payload = await candidates.text();
  assert.ok(!/private\/|storagePath|signedUrl|publicUrl/.test(payload));
  const post = () => fetch(`${base}/production-final-audio`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  assert.equal((await post()).status, 200);
  assert.equal((await (await post()).json() as { data: { reused: boolean } }).data.reused, true);
  await assert.rejects(() => assertProductionAssetAllowed("audio"), /remains private/);
  await assert.rejects(() => assertProductionReleaseAllowed("release"), /awaiting owner review/);
  const denied = await fetch(`${base}/production-final-audio`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://untrusted.example.invalid" }, body: JSON.stringify(input) });
  assert.equal(denied.status, 403);
  // Exercise the actual upload producer, not just hand-built metadata fixtures.
  const { mediaUploadApiService } = await import("../server/services/media/MediaUploadApiService");
  const wav = Buffer.alloc(46);
  wav.write("RIFF", 0); wav.writeUInt32LE(38, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(2, 40);
  const upload = await mediaUploadApiService.uploadSingle({ fieldName: "file", fileName: "synthetic-fixture.wav", mimeType: "audio/wav", size: wav.length, buffer: wav }, { targetType: "media_library", assetType: "full_song", intendedUse: "fullSong", accessLevel: "admin_only" }, "admin");
  assert.equal(upload.success, true);
  assert.ok(upload.mediaAsset?.url?.startsWith("private/"));
  const listed = await (await fetch(`${base}/production-audio-candidates`)).json() as { data: { items: { assetId: string }[] } };
  assert.ok(listed.data.items.some((item) => item.assetId === upload.mediaAsset?.assetId));
  const uploadedData = await jsonDatabase.read();
  const uploadedInput = { assetId: upload.mediaAsset!.assetId, expectedBundleHash: hash(uploadedData), requestId: "actual-upload-fixture" };
  assert.equal((await fetch(`${base}/production-final-audio`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(uploadedInput) })).status, 200);
  console.log("Final-audio candidate tests passed: revision, manifest, replacement, retries, stale rejection, private storage, safe DTOs, RBAC, origin protection and publication lock. Synthetic fixtures only; no recording was generated or auditioned.");
} finally {
  authenticationService.authenticateRequest = authenticate;
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
}
