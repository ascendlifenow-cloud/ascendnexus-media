import assert from "node:assert/strict";
import { assertProductionApproval, countProductionCharacters, productionBundleHash, validateSongProductionPackage, type SongProductionPackage } from "../server/services/production/SongProductionContract";

// Boundary fixtures are never ingested as creative material.
const bundle: SongProductionPackage = {
  songId: "contract-test", revision: 1, title: "Boundary fixture", artistId: "fixture",
  artistProfileVersion: "1", brief: "Test", creativeIntent: "Test", masterPrompt: "Test",
  lyrics: "x".repeat(4500), styles: ["Style one", "Style two"],
  references: [{ source: "fixture", version: "1", approval: "approved" }],
  assets: [{ assetId: "cover", revision: "1", sha256: "a".repeat(64), role: "artwork" }, { assetId: "audio", revision: "1", sha256: "b".repeat(64), role: "final_audio" }],
  catalogMetadata: {}, destinations: [], websiteVisibility: "private",
};
assert.equal(countProductionCharacters("😀\r\n[x]"), 6);
assert.equal(validateSongProductionPackage(bundle).valid, true);
for (const length of [4499, 5001]) assert.equal(validateSongProductionPackage({ ...bundle, lyrics: "x".repeat(length) }).valid, false);
assert.equal(validateSongProductionPackage({ ...bundle, lyrics: "x".repeat(5000) }).valid, true);
assert.equal(validateSongProductionPackage({ ...bundle, styles: ["x".repeat(1000), "ok"] }).valid, false);
const approval = { bundleHash: productionBundleHash(bundle), approvedBy: "owner", approvedAt: new Date().toISOString() };
assert.doesNotThrow(() => assertProductionApproval(bundle, approval));
assert.throws(() => assertProductionApproval(bundle, undefined), /APPROVAL_REQUIRED/);
for (const patch of [{ title: "Changed" }, { scheduledFor: "2030-01-01T00:00:00Z" }, { websiteVisibility: "public" as const }, { destinations: [{ platform: "youtube", copy: "Copy", assetIds: ["audio"] }] }, { assets: bundle.assets.map((asset) => ({ ...asset, revision: "2" })) }]) assert.throws(() => assertProductionApproval({ ...bundle, ...patch }, approval), /APPROVAL_REQUIRED/);
assert.throws(() => assertProductionApproval({ ...bundle, assets: bundle.assets.filter((asset) => asset.role !== "final_audio") }, approval), /INCOMPLETE/);
assert.throws(() => assertProductionApproval(bundle, { ...approval, revokedAt: new Date().toISOString() }), /APPROVAL_REQUIRED/);
console.log(JSON.stringify({ success: true, checks: ["Unicode counts", "lyrics boundaries", "style limits", "approval required", "revocation", "material changes", "audio required"] }));
