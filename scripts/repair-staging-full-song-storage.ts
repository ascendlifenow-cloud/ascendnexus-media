import { MongoClient, BSON } from "mongodb";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const execute = process.argv.includes("--execute-approved-eight");
const { EJSON } = BSON;
if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "") || !process.env.MONGODB_URI) throw new Error("Explicit staging configuration required.");
process.env.NODE_ENV = "staging";
process.env.MEDIA_STORAGE_PROVIDER = "r2";
process.env.MEDIA_STORAGE_FORCE_PATH_STYLE = "true";
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const journalPath = "production/anmx-003/staging-full-song-repair.json";
let phase = "inventory";
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const releases = await db.collection("song_releases").find({ status: "published", publicationState: "published" }).toArray();
  const ids = releases.map(r => r.metadata?.fullSongAssetId).filter(Boolean);
  const candidates = await db.collection("media_storage_objects").find({ assetId: { $in: ids }, $or: [{ accessLevel: "public" }, { publicUrl: { $type: "string", $ne: "" } }] }).toArray();
  let journal: any;
  try { journal = EJSON.parse(await readFile(journalPath, "utf8")); } catch (error: any) { if (error.code !== "ENOENT") throw error; }
  if (!journal) {
    if (candidates.length !== 8) throw new Error("Expected exactly eight approved objects.");
    const entries = [];
    for (const storage of candidates) {
      const url = new URL(storage.publicUrl);
      const sourceObjectKey = storage.storagePath === storage.publicUrl ? decodeURIComponent(url.pathname.slice(1)) : storage.storagePath.replace(/^\/+/, "").replace(/^media\/(?=public\/|private\/)/, "");
      if (storage.provider !== "r2" || !/stag(?:ing|ging)/i.test(storage.bucket ?? "") || storage.mimeType !== "audio/wav" || !sourceObjectKey.startsWith("public/") || decodeURIComponent(url.pathname.slice(1)) !== sourceObjectKey || url.hostname !== "staging-media.ascendnexusmedia.com" || url.protocol !== "https:") throw new Error("Unexpected storage scope.");
      const linked = releases.filter(r => r.metadata?.fullSongAssetId === storage.assetId);
      const previewCollision = await db.collection("song_releases").countDocuments({ $or: [{ audioPreviewAssetId: storage.assetId }, { "metadata.audioPreviewAssetId": storage.assetId }, { audioPreviewUrl: storage.publicUrl }, { "metadata.previewAssetId": storage.assetId }] });
      const previewLinks = await db.collection("media_asset_links").find({ assetId: storage.assetId }).toArray();
      if (!linked.length || previewCollision || previewLinks.some(l => /preview/i.test(JSON.stringify(l)))) throw new Error("Preview collision requires review.");
      const assets = await db.collection("media_assets").find({ assetId: storage.assetId }).toArray();
      if (assets.length !== 1) throw new Error("Ambiguous asset.");
      entries.push({ storage, sourceObjectKey, assets, releases: linked, resources: await db.collection("protected_media_resources").find({ mediaAssetId: storage.assetId }).toArray(), destination: `private/full-song-repair/${createHash("sha256").update(storage.storageObjectId).digest("hex")}/audio.wav`, state: "planned" });
    }
    journal = { environment: "staging", database: process.env.MONGODB_DATABASE, createdAt: new Date().toISOString(), entries };
  }
  if (journal.environment !== "staging" || journal.database !== process.env.MONGODB_DATABASE || journal.entries.length !== 8) throw new Error("Journal scope mismatch.");
  if (!execute) {
    console.log(JSON.stringify({ environment: "staging", approvedObjects: journal.entries.length, previewCollisions: 0, mutated: false }));
  } else {
    await mkdir("production/anmx-003", { recursive: true, mode: 0o700 });
    const save = () => writeFile(journalPath, EJSON.stringify(journal, null, 2), { mode: 0o600 });
    await save();
    const { CloudflareR2StorageAdapter } = await import("../server/storage/adapters/CloudflareR2StorageAdapter");
    const { mediaBackendConfig } = await import("../server/config/mediaBackendConfig");
    if (journal.entries.some((entry: any) => entry.storage.bucket !== mediaBackendConfig.bucket)) throw new Error("Unexpected storage bucket configuration.");
    const adapter = new CloudflareR2StorageAdapter();
    for (const entry of journal.entries) {
      phase = "private_copy_verification";
      const source = entry.storage;
      if (entry.state === "planned") {
        const original = await adapter.fileExists(entry.sourceObjectKey);
        if (!original.exists || !original.metadata?.etag || Number(original.metadata.contentLength) !== source.fileSizeBytes) throw new Error("Source metadata mismatch.");
        await adapter.copyFile(entry.sourceObjectKey, entry.destination, { accessLevel: "private", assetType: "full_song", mimeType: source.mimeType });
        const copy = await adapter.fileExists(entry.destination);
        if (!copy.exists || copy.metadata?.etag !== original.metadata.etag || copy.metadata?.contentLength !== original.metadata.contentLength) throw new Error("Copy verification failed.");
        const privateProbe = await fetch(new URL(entry.destination, "https://staging-media.ascendnexusmedia.com/"), { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15000) });
        if (![403, 404].includes(privateProbe.status)) throw new Error("Private prefix publicly reachable.");
        entry.verifiedMetadata = copy.metadata;
        entry.state = "copied"; await save();
      }
      phase = "reference_transaction";
      if (entry.state === "copied") {
        const session = client.startSession();
        try { await session.withTransaction(async () => {
          const now = new Date().toISOString();
          const updated = await db.collection("media_storage_objects").updateOne({ _id: source._id, storagePath: source.storagePath, publicUrl: source.publicUrl }, { $set: { storagePath: entry.destination, accessLevel: "private", updatedAt: now }, $unset: { publicUrl: "", signedUrl: "" } }, { session });
          if (updated.modifiedCount !== 1) throw new Error("Concurrent storage change.");
          for (const asset of entry.assets) {
            const result = await db.collection("media_assets").updateOne({ _id: asset._id, updatedAt: asset.updatedAt }, { $unset: { url: "", largeUrl: "", thumbnailUrl: "" }, $set: { updatedAt: now } }, { session });
            if (result.matchedCount !== 1) throw new Error("Concurrent asset change.");
          }
          for (const release of entry.releases) {
            const result = await db.collection("song_releases").updateOne({ _id: release._id, "metadata.fullSongAssetId": source.assetId, updatedAt: release.updatedAt }, { $set: { "metadata.fullSongStorageObjectId": source.storageObjectId, "metadata.fullSongPublicPlaybackAllowed": false, updatedAt: now }, $unset: { "metadata.fullSongUrl": "", fullSongUrl: "" } }, { session });
            if (result.matchedCount !== 1) throw new Error("Concurrent release change.");
          }
          await db.collection("protected_media_resources").updateMany({ mediaAssetId: source.assetId }, { $set: { privateObjectKey: source.storageObjectId, storageProvider: "r2", updatedAt: now } }, { session });
          await db.collection("protected_media_authorizations").updateMany({ mediaAssetId: source.assetId, status: "active" }, { $set: { status: "revoked", revokedAt: now, revokedReason: "staging_storage_privacy_repair" } }, { session });
          await db.collection("protected_playback_sessions").updateMany({ mediaAssetId: source.assetId, status: { $in: ["authorized", "starting", "playing", "paused"] } }, { $set: { status: "revoked", endedAt: now } }, { session });
        }); } finally { await session.endSession(); }
        entry.state = "references_updated"; await save();
      }
      phase = "retire_public_copy";
      if (entry.state === "references_updated") {
        const current = await db.collection("media_storage_objects").findOne({ _id: source._id });
        const copy = await adapter.fileExists(entry.destination);
        if (current?.storagePath !== entry.destination || current.publicUrl || !copy.exists || copy.metadata?.etag !== entry.verifiedMetadata.etag) throw new Error("Retirement precondition failed.");
        await adapter.delete(entry.sourceObjectKey);
        if ((await adapter.fileExists(entry.sourceObjectKey)).exists) throw new Error("Public object still exists.");
        const response = await fetch(source.publicUrl, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15000) });
        if (![403, 404].includes(response.status)) throw new Error("Public delivery still reachable.");
        entry.state = "complete"; entry.completedAt = new Date().toISOString(); await save();
      }
    }
    await db.collection("admin_audit_events").updateOne({ auditEventId: "staging-eight-full-song-storage-repair-2026-10-28" }, { $setOnInsert: { auditEventId: "staging-eight-full-song-storage-repair-2026-10-28", action: "protected_media_storage_repaired", actorId: "approved-maintenance", entityType: "media_storage", summary: "Eight staging full-song objects moved to verified private storage; public copies retired with owner approval.", createdAt: new Date().toISOString(), metadata: { environment: "staging", count: 8, previewAssetsChanged: false } } }, { upsert: true });
    console.log(JSON.stringify({ environment: "staging", repaired: journal.entries.filter((e: any) => e.state === "complete").length, privateCopiesVerified: true, oldPublicCopiesUnavailable: true, previewAssetsChanged: false, recoveryJournal: journalPath }));
  }
} catch (error) { const safe = error instanceof Error && /^(Expected exactly|Unexpected storage|Preview collision|Ambiguous asset|Journal scope|Source metadata|Copy verification|Private prefix|Concurrent |Retirement precondition|Public object|Public delivery)/.test(error.message) ? error.message : "Staging repair stopped safely; inspect the private recovery journal before retrying."; console.error(JSON.stringify({ error: safe, phase })); process.exitCode = 1; }
finally { await client.close(); }
