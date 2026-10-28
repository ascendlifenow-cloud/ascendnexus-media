import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

const root = await mkdtemp(join(tmpdir(), "anmx-final-audio-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_STORAGE_PROVIDER: "local", MEDIA_STORAGE_LOCAL_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { applyProductionFinalAudio } = await import("../server/services/production/ProductionFinalAudioService");
const { buildProductionReviewSnapshot, assertProductionReleaseAllowed, assertProductionAssetAllowed } = await import("../server/services/production/ProductionReleaseGate");
const { validateSongProductionPackage, productionValueHash } = await import("../server/services/production/SongProductionContract");
assert.notEqual(productionValueHash(new Date("2026-10-27T00:00:00Z")), productionValueHash(new Date("2026-10-28T00:00:00Z")));
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
const originalOwner = process.env.ANMX_PRODUCTION_OWNER_USER_ID;
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
  const hash = (data: typeof fixture) => buildProductionReviewSnapshot(data.releaseRecords[0], data, data.artistRecords.find((artist) => artist.artistId === data.releaseRecords[0].artistId)).bundleHash;
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
  const { authorizeProductionAudition, readProductionAudition, checkProductionAudition, acknowledgeProductionAudio } = await import("../server/services/production/ProductionAuditionService");
  const actor = { userId: "admin", sessionId: "test-audition-session" };
  const auditionInput = { expectedBundleHash: hash(await jsonDatabase.read()) };
  const authorization = await authorizeProductionAudition("release", auditionInput, actor);
  const ack = { ...auditionInput, reference: authorization.reference, confirmed: true };
  await assert.rejects(() => acknowledgeProductionAudio("release", ack, actor), /unavailable/);
  await assert.rejects(() => readProductionAudition("release", authorization.reference, { ...actor, sessionId: "other-session" }), /unavailable/);
  await assert.rejects(() => readProductionAudition("release", authorization.reference, { ...actor, userId: "other-admin" }), /unavailable/);
  const object = (await jsonDatabase.read()).mediaStorageObjects.find((item) => item.assetId === upload.mediaAsset!.assetId)!;
  await writeFile(join(root, object.storagePath), Buffer.alloc(wav.length));
  await assert.rejects(() => readProductionAudition("release", authorization.reference, actor), /unavailable/);
  await writeFile(join(root, object.storagePath), wav);
  const audioBytes = await readProductionAudition("release", authorization.reference, actor);
  assert.ok(audioBytes.bytes.equals(wav));
  assert.equal(audioBytes.mimeType, "audio/wav");
  await assert.rejects(() => readProductionAudition("release", authorization.reference, actor), /unavailable/);
  assert.deepEqual(await acknowledgeProductionAudio("release", ack, actor), { reviewed: true, reused: false });
  assert.equal((await acknowledgeProductionAudio("release", ack, actor)).reused, true);
  assert.equal((await checkProductionAudition("release", { ...auditionInput, reference: authorization.reference }, actor)).valid, true);
  assert.equal(buildProductionReviewSnapshot((await jsonDatabase.read()).releaseRecords[0], await jsonDatabase.read(), null).audioReview.reviewed, true);
  await assert.rejects(() => assertProductionReleaseAllowed("release"), /awaiting owner review/);
  // Full API path requires a real session context, serves only verified bytes and no storage URL.
  authenticationService.authenticateRequest = async () => ({ user: { userId: "admin" }, sessionId: actor.sessionId, permissions: ["releases.read", "media.read", "releases.update"] }) as never;
  const httpAuthorization = await (await fetch(`${base}/production-audition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(auditionInput) })).json() as { data: { reference: string } };
  const httpAudio = await fetch(`${base}/production-audition?reference=${httpAuthorization.data.reference}`);
  assert.equal(httpAudio.status, 200);
  assert.equal(httpAudio.headers.get("cache-control"), "private, no-store");
  assert.equal(httpAudio.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(httpAudio.headers.get("content-type"), "audio/wav");
  assert.ok(Buffer.from(await httpAudio.arrayBuffer()).equals(wav));
  let authChecks = 0;
  authenticationService.authenticateRequest = async () => ({ user: { userId: "admin" }, sessionId: actor.sessionId, permissions: ++authChecks === 1 ? ["releases.read", "media.read"] : ["admin.access"] }) as never;
  const lostPermission = await fetch(`${base}/production-audition?reference=${httpAuthorization.data.reference}`);
  assert.equal(lostPermission.status, 403, "Losing read permission during byte fetch must prevent delivery");
  assert.match(lostPermission.headers.get("content-type") ?? "", /json/);
  authenticationService.authenticateRequest = async () => ({ user: { userId: "admin" }, sessionId: actor.sessionId, permissions: ["releases.read", "media.read", "releases.update"] }) as never;
  await jsonDatabase.update((data) => {
    const event = data.adminAuditEvents.find((item) => item.auditEventId === httpAuthorization.data.reference)!;
    event.metadata!.expiresAt = "invalid-date";
  });
  await assert.rejects(() => checkProductionAudition("release", { ...auditionInput, reference: httpAuthorization.data.reference }, actor), /unavailable/);
  await jsonDatabase.update((data) => {
    const release = data.releaseRecords[0];
    const packet = release.metadata!.productionPackage as { revision: number };
    packet.revision++;
    release.metadata!.productionAudioReview = "auditioned";
  });
  const changed = await jsonDatabase.read();
  assert.equal(buildProductionReviewSnapshot(changed.releaseRecords[0], changed, null).audioReview.reviewed, false, "Mutable metadata cannot assert review of a different revision");
  await assert.rejects(() => checkProductionAudition("release", { ...auditionInput, reference: authorization.reference }, actor), /unavailable/);
  const { backendStorageProviderRegistry } = await import("../server/storage/StorageProviderRegistry");
  const originalProvider = backendStorageProviderRegistry.getActiveProvider;
  const originalFetch = globalThis.fetch;
  await jsonDatabase.insertCollectionRecord("artistRecords", { artistId: "fixture-artist", name: "Synthetic artist", status: "draft", metadata: { profileVersion: "fixture-only" } } as never);
  await jsonDatabase.insertCollectionRecord("adminAuditEvents", { auditEventId: "fixture-art-enrollment", entityType: "media_asset", entityId: "art", action: "production_asset_enrolled", summary: "Synthetic fixture only", createdAt: now });
  await jsonDatabase.patchCollectionRecord("mediaStorageObjects", { storageObjectId: object.storageObjectId }, { provider: "r2" });
  const remote = await authorizeProductionAudition("release", { expectedBundleHash: hash(await jsonDatabase.read()) }, actor);
  try {
    backendStorageProviderRegistry.getActiveProvider = () => ({ getProviderName: () => "r2", getSignedUrl: async () => "https://storage.example.invalid/private?signature=SYNTHETIC_ONLY" }) as never;
    globalThis.fetch = async () => new Response(wav, { status: 200 });
    assert.ok((await readProductionAudition("release", remote.reference, actor)).bytes.equals(wav));
    await acknowledgeProductionAudio("release", { expectedBundleHash: hash(await jsonDatabase.read()), reference: remote.reference, confirmed: true }, actor);
    globalThis.fetch = async () => { throw new Error("SYNTHETIC_ONLY signed origin failure"); };
    await assert.rejects(() => readProductionAudition("release", remote.reference, actor), (error: Error) => !error.message.includes("SYNTHETIC_ONLY") && /unavailable/.test(error.message));
  } finally { globalThis.fetch = originalFetch; backendStorageProviderRegistry.getActiveProvider = originalProvider; }
  const { approveProductionRelease, productionApprovalSummary, withdrawProductionApproval } = await import("../server/services/production/ProductionReleaseGate");
  delete process.env.ANMX_PRODUCTION_OWNER_USER_ID;
  assert.equal((await productionApprovalSummary("release", "admin")).canApprove, false);
  await assert.rejects(async () => approveProductionRelease("release", "admin", hash(await jsonDatabase.read()), true), /configured production owner/);
  process.env.ANMX_PRODUCTION_OWNER_USER_ID = "admin";
  const ready = await productionApprovalSummary("release", "admin");
  assert.deepEqual(ready.blockers, []);
  assert.equal(ready.canApprove, true);
  await assert.rejects(() => approveProductionRelease("release", "other-admin", ready.bundleHash, true), /configured production owner/);
  await assert.rejects(() => approveProductionRelease("release", "admin", ready.bundleHash, false), /Explicit confirmation/);
  await assert.rejects(() => approveProductionRelease("release", "admin", "0".repeat(64), true), /release changed/i);
  assert.deepEqual(await approveProductionRelease("release", "admin", ready.bundleHash, true), { approved: true, reused: false });
  assert.deepEqual(await approveProductionRelease("release", "admin", ready.bundleHash, true), { approved: true, reused: true });
  assert.equal((await productionApprovalSummary("release", "admin")).approved, true);
  await assert.rejects(() => assertProductionReleaseAllowed("release"), /execution is locked/);
  authenticationService.authenticateRequest = async () => ({ user: { userId: "admin" }, sessionId: actor.sessionId, permissions: ["releases.read", "media.read", "releases.publish"] }) as never;
  const summaryResponse = await fetch(`${base}/production-approval-summary`);
  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.headers.get("cache-control"), "private, no-store");
  const summaryText = await summaryResponse.text();
  assert.ok(!/storagePath|private\/|signedUrl|sessionHash/.test(summaryText));
  const confirmedApproval = await fetch(`${base}/production-approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bundleHash: ready.bundleHash, confirmed: true }) });
  assert.equal(confirmedApproval.status, 200);
  assert.equal((await confirmedApproval.json() as { data: { reused: boolean } }).data.reused, true);
  authenticationService.authenticateRequest = async () => ({ user: { userId: "admin" }, sessionId: actor.sessionId, permissions: ["releases.read", "media.read"] }) as never;
  assert.equal((await fetch(`${base}/production-approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bundleHash: ready.bundleHash, confirmed: true }) })).status, 403);
  authenticationService.authenticateRequest = async () => ({ user: { userId: "other-admin" }, sessionId: "other-session", permissions: ["releases.read", "media.read", "releases.publish"] }) as never;
  assert.equal((await fetch(`${base}/production-approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bundleHash: ready.bundleHash, confirmed: true }) })).status, 403);
  const orderOnly = structuredClone(await jsonDatabase.read());
  orderOnly.mediaAssets.reverse(); orderOnly.mediaStorageObjects.reverse();
  assert.equal(hash(orderOnly), ready.bundleHash, "Database enumeration order must not invalidate a bundle");
  const archived = structuredClone(orderOnly);
  archived.mediaStorageObjects.find((item) => item.assetId === upload.mediaAsset!.assetId)!.status = "archived";
  assert.notEqual(hash(archived), ready.bundleHash, "Storage status changes must invalidate approval even without a timestamp update");
  const extra = structuredClone(orderOnly);
  extra.mediaAssetLinks.push({ linkId: "unmanifested", assetId: "unmanifested-asset", entityType: "release", entityId: "release", fieldKey: "coverArt", status: "active", createdAt: now });
  const extraReview = buildProductionReviewSnapshot(extra.releaseRecords[0], extra, extra.artistRecords[0]);
  assert.ok(extraReview.approval.blockers.some((issue) => issue.includes("Every active media association")));
  assert.equal(extraReview.approval.status, "pending");
  for (const status of ["quarantined", "failed", "ignored", "superseded"] as const) {
    const quarantined = structuredClone(orderOnly);
    quarantined.mediaIntakeRecords.push({ intakeId: "fixture-intake", mediaAssetId: upload.mediaAsset!.assetId, status } as never);
    const blockedReview = buildProductionReviewSnapshot(quarantined.releaseRecords[0], quarantined, quarantined.artistRecords[0]);
    assert.notEqual(blockedReview.bundleHash, ready.bundleHash);
    assert.equal(blockedReview.approval.status, "pending");
    assert.ok(blockedReview.approval.blockers.some((issue) => issue.includes("quarantined or unavailable")));
  }
  const approvedSummary = await productionApprovalSummary("release", "admin");
  assert.equal((await fetch(`${base}/production-withdraw-approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approvalId: approvedSummary.approvalId, confirmed: true }) })).status, 403);
  await assert.rejects(() => withdrawProductionApproval("release", "other-admin", approvedSummary.approvalId, true), /configured production owner/);
  await assert.rejects(() => withdrawProductionApproval("release", "admin", approvedSummary.approvalId, false), /Explicit confirmation/);
  await jsonDatabase.patchCollectionRecord("releaseRecords", { releaseId: "release" }, { description: "Material metadata change" });
  authenticationService.authenticateRequest = async () => ({ user: { userId: "admin" }, sessionId: actor.sessionId, permissions: ["releases.read", "media.read", "releases.publish"] }) as never;
  const withdrawalResponse = await fetch(`${base}/production-withdraw-approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approvalId: approvedSummary.approvalId, confirmed: true }) });
  assert.equal(withdrawalResponse.status, 200);
  assert.equal(withdrawalResponse.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await withdrawalResponse.json() as { data: unknown }).data, { withdrawn: true, reused: false });
  assert.deepEqual(await withdrawProductionApproval("release", "admin", approvedSummary.approvalId, true), { withdrawn: true, reused: true });
  await assert.rejects(() => approveProductionRelease("release", "admin", ready.bundleHash, true), /Approval state changed/);
  await jsonDatabase.patchCollectionRecord("releaseRecords", { releaseId: "release" }, { description: orderOnly.releaseRecords[0].description });
  const withdrawn = await productionApprovalSummary("release", "admin");
  assert.equal(withdrawn.bundleHash, ready.bundleHash);
  assert.equal(withdrawn.approved, false, "Reverting content must not restore withdrawn approval");
  assert.equal(withdrawn.generation, 1);
  assert.deepEqual(await approveProductionRelease("release", "admin", ready.bundleHash, true, withdrawn.generation), { approved: true, reused: false });
  const reapproved = await productionApprovalSummary("release", "admin");
  assert.equal(reapproved.approved, true);
  assert.notEqual(reapproved.approvalId, approvedSummary.approvalId);
  await withdrawProductionApproval("release", "admin", approvedSummary.approvalId, true);
  assert.equal((await productionApprovalSummary("release", "admin")).approved, true, "An old withdrawal retry must not withdraw a later approval");
  await assert.rejects(() => assertProductionReleaseAllowed("release"), /execution is locked/);
  await jsonDatabase.patchCollectionRecord("releaseRecords", { releaseId: "release" }, { description: "Material metadata change" });
  assert.equal((await productionApprovalSummary("release", "admin")).approved, false);
  await assert.rejects(() => approveProductionRelease("release", "admin", ready.bundleHash, true, 1), /release changed/i);
  authenticationService.authenticateRequest = authenticate;
  assert.equal((await fetch(`${base}/production-audition?reference=${authorization.reference}`)).status, 401);
  assert.equal((await fetch(`${base}/production-approval-summary`)).status, 401);
  console.log("Private production review tests passed: upload, audition, session binding, owner-only explicit approval, safe retries, storage/metadata invalidation, safe summary and continuing execution lock. Synthetic fixtures only; no real song was auditioned or approved.");
} finally {
  authenticationService.authenticateRequest = authenticate;
  if (originalOwner === undefined) delete process.env.ANMX_PRODUCTION_OWNER_USER_ID;
  else process.env.ANMX_PRODUCTION_OWNER_USER_ID = originalOwner;
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
}
