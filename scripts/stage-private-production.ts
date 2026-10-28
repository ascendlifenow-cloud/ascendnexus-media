import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MongoClient } from "mongodb";

// Transfer only the explicitly named private demo. Never run the full catalog migration here.
const execute = process.argv.includes("--execute");
if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE)) throw new Error("An explicitly staging-named database is required.");
const source = JSON.parse(await readFile("server/data/media-db.json", "utf8"));
const releaseId = "anmx-release-the-spare-key-choir";
const release = source.releaseRecords.find((item: any) => item.releaseId === releaseId);
if (!release || release.publicVisibility || release.status !== "draft") throw new Error("Expected private source draft is unavailable.");
const sourceArtist = source.artistRecords.find((item: any) => item.artistId === release.artistId);
const links = source.mediaAssetLinks.filter((item: any) => item.entityId === releaseId && item.status === "active");
if (links.length !== 1 || links[0].fieldKey !== "coverArt") throw new Error("Expected one cover association only.");
const asset = source.mediaAssets.find((item: any) => item.assetId === links[0].assetId);
const object = source.mediaStorageObjects.find((item: any) => item.assetId === asset.assetId);
const bytes = await readFile("production/anmx-002/cover-v1.png");
const checksum = createHash("sha256").update(bytes).digest("hex");
if (object.accessLevel === "public" || checksum !== object.checksum) throw new Error("Private cover verification failed.");
const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
try {
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DATABASE);
  const existing = await db.collection("song_releases").findOne({ releaseId });
  if (existing && (existing.songId !== release.songId || existing.status !== "draft" || existing.publicVisibility)) throw new Error("Conflicting remote release; no overwrite allowed.");
  const remoteArtist = await db.collection("artists").findOne({ slug: "ascend-nexus-collective", status: { $nin: ["deleted", "archived"] } });
  const artistId = remoteArtist?.artistId ?? sourceArtist.artistId;
  const bundle = { ...release.metadata.productionPackage, artistId };
  const remoteRelease = { ...release, artistId, metadata: { ...release.metadata, productionPackage: bundle } };
  console.log(JSON.stringify({ environment: "staging", mode: execute ? "execute" : "plan", releaseId, existingDraft: Boolean(existing), artist: remoteArtist ? "reuse existing" : "insert private identity", assets: 1, publicActions: false }));
  if (!execute) process.exitCode = 0;
  else {
    process.env.NODE_ENV = "staging";
    process.env.MEDIA_STORAGE_PROVIDER = "r2";
    process.env.MEDIA_STORAGE_FORCE_PATH_STYLE = "true";
    const { CloudflareR2StorageAdapter } = await import("../server/storage/adapters/CloudflareR2StorageAdapter");
    const adapter = new CloudflareR2StorageAdapter();
    const storagePath = "private/production/anmx-002/cover-v1.png";
    const uploaded = await adapter.upload({ file: { fieldName: "file", fileName: "cover-v1.png", mimeType: "image/png", size: bytes.length, buffer: bytes }, target: { targetType: "release", targetId: releaseId, assetType: "cover_art", intendedUse: "coverArt", accessLevel: "admin_only" }, storagePath, checksum, uploadedBy: "ANMX-AGENT-002-staging" });
    if (!(await adapter.fileExists(storagePath)).exists) throw new Error("Private R2 upload verification failed.");
    const put = async (collection: string, field: string, row: any) => { await db.collection(collection).updateOne({ [field]: row[field] }, { $setOnInsert: row }, { upsert: true }); };
    if (!remoteArtist) await put("artists", "artistId", sourceArtist);
    // Enroll the ID before its catalog/asset records can become reachable.
    await put("admin_audit_events", "auditEventId", { auditEventId: "audit-anmx-song-the-spare-key-choir-enrollment", action: "production_draft_ingested", entityType: "release", entityId: releaseId, actorId: "ANMX-AGENT-002-staging", summary: "Private production draft enrolled; no public actions authorized.", createdAt: new Date().toISOString() });
    await put("media_storage_objects", "storageObjectId", { ...object, ...uploaded, storageObjectId: object.storageObjectId, assetId: asset.assetId, provider: "r2", storagePath, accessLevel: "admin_only", publicUrl: undefined });
    await put("media_assets", "assetId", { ...asset, url: undefined, thumbnailUrl: undefined, largeUrl: undefined });
    for (const version of source.mediaAssetVersions.filter((item: any) => item.assetId === asset.assetId)) await put("media_asset_versions", "versionId", { ...version, storagePath, provider: "r2", publicUrl: undefined });
    for (const link of links) await put("media_asset_links", "linkId", link);
    await put("song_releases", "releaseId", remoteRelease);
    const stored = await db.collection("song_releases").findOne({ releaseId });
    const count = await db.collection("song_releases").countDocuments({ releaseId });
    if (count !== 1 || stored?.publicVisibility || stored?.status !== "draft") throw new Error("Remote private draft verification failed.");
    await writeFile("production/anmx-002/staging-transfer.json", JSON.stringify({ environment: "staging", releaseId, private: true, releaseCount: count, assetCount: 1, checkedAt: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ transferred: true, private: true, releaseCount: count, publicActions: false }));
  }
} finally { await mongo.close(); }
