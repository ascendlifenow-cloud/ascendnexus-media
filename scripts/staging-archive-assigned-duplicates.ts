import { MongoClient } from "mongodb";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { catalogEntityId, hasLiveCatalogReference } from "../server/services/media/CatalogReferencePolicy";

const apply = process.argv.includes("--apply");
const includeAudio = process.argv.includes("--include-audio");
const reportPath = process.argv.find((arg) => arg.startsWith("--evidence="))?.slice(11);
const backupPath = process.argv.find((arg) => arg.startsWith("--backup="))?.slice(9);
if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "") || !reportPath?.startsWith("/private/tmp/")) throw new Error("Staging configuration and private evidence report required.");
if (apply && (!process.argv.includes("--confirm-archive-duplicates") || !backupPath?.startsWith("/private/tmp/"))) throw new Error("Archival requires explicit confirmation and private backup.");
const client = new MongoClient(process.env.MONGODB_URI ?? "", { serverSelectionTimeoutMS: 10000 });
const runId = randomUUID();
const verifiedUrls = new Map<string, string>();
const verifiedAudio = new Map<string, string>();
async function verifyCurrentImage(value: unknown, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(expected) || typeof value !== "string") return false;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "staging-media.ascendnexusmedia.com" || url.port || url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/public/")) return false;
  if (!verifiedUrls.has(value)) {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000), headers: { "Cache-Control": "no-cache" } });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/") || !response.body) { await response.body?.cancel(); return false; }
    const reader = response.body.getReader();
    const hash = createHash("sha256");
    let size = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 15 * 1024 * 1024) { await reader.cancel(); return false; }
        hash.update(part.value);
      }
    } finally { reader.releaseLock(); }
    if (!size) return false;
    verifiedUrls.set(value, hash.digest("hex"));
  }
  return verifiedUrls.get(value) === expected;
}

try {
  const evidence = JSON.parse(await readFile(reportPath, "utf8"));
  if (evidence.environment !== "staging" || !Array.isArray(evidence.items)) throw new Error("Invalid evidence.");
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const storage = includeAudio ? await db.collection("media_storage_objects").find({ provider: "r2", bucket: process.env.MEDIA_STORAGE_BUCKET, status: "ready" }).toArray() : [];
  let audioAdapter: import("../server/storage/S3CompatibleStorageAdapter").S3CompatibleStorageAdapter | undefined;
  if (includeAudio) {
    if (!/stag(?:ing|ging)/i.test(process.env.MEDIA_STORAGE_BUCKET ?? "")) throw new Error("Staging storage bucket required.");
    process.env.NODE_ENV = "staging";
    process.env.MEDIA_STORAGE_PROVIDER = "r2";
    process.env.MEDIA_STORAGE_FORCE_PATH_STYLE = "true";
    const { S3CompatibleStorageAdapter } = await import("../server/storage/S3CompatibleStorageAdapter");
    audioAdapter = new S3CompatibleStorageAdapter({ providerName: "r2" });
  }
  const verifyAudio = async (assetId: string, expected: string, publicPreviewUrl?: unknown) => {
    if (!audioAdapter || !/^[a-f0-9]{64}$/i.test(expected)) return false;
    if (!verifiedAudio.has(assetId)) {
      const objects = storage.filter((object) => object.assetId === assetId && String(object.mimeType).startsWith("audio/"));
      if (objects.length !== 1) return false;
      const object = objects[0];
      if (!/^(public|private)\//.test(object.storagePath) || object.storagePath.includes("\\") || object.storagePath.split("/").some((part: string) => !part || part === "." || part === "..") || !object.fileSizeBytes || object.fileSizeBytes > 100 * 1024 * 1024) return false;
      const exists = await audioAdapter.fileExists(object.storagePath);
      let delivery: string | undefined;
      if (exists.exists && Number(exists.metadata?.contentLength) === object.fileSizeBytes) delivery = await audioAdapter.getSignedUrl(object as unknown as import("../server/models/mediaModels").MediaStorageObject, 120, "verification");
      else if (typeof publicPreviewUrl === "string" && object.assetType === "audio_preview") {
        const url = new URL(publicPreviewUrl);
        if (url.protocol === "https:" && url.hostname === "staging-media.ascendnexusmedia.com" && !url.port && !url.username && !url.password && !url.search && !url.hash && url.pathname.startsWith("/public/")) delivery = url.href;
      }
      if (!delivery) return false;
      const response = await fetch(delivery, { redirect: "error", signal: AbortSignal.timeout(90000) });
      if (!response.ok || !response.body) { await response.body?.cancel(); return false; }
      const reader = response.body.getReader();
      const hash = createHash("sha256");
      let size = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > object.fileSizeBytes) { await reader.cancel(); return false; }
          hash.update(part.value);
        }
      } finally { reader.releaseLock(); }
      if (size !== object.fileSizeBytes) return false;
      verifiedAudio.set(assetId, hash.digest("hex"));
    }
    return verifiedAudio.get(assetId) === expected;
  };
  const permittedReferenceRepairs = new Map<string, { sourceId: string; canonicalId: string }>();
  const fingerprint = async () => {
    const hash = createHash("sha256");
    for (const name of ["artists", "song_releases", "gallery_items", "media_storage_objects"]) {
      const records = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
      for (const row of records) {
        const repair = permittedReferenceRepairs.get(`${name}:${row._id}`);
        if (repair && row.metadata?.mediaAssetId === repair.sourceId) row.metadata.mediaAssetId = repair.canonicalId;
      }
      hash.update(JSON.stringify(records));
    }
    return hash.digest("hex");
  };
  const allAssets = await db.collection("media_assets").find({}).toArray();
  const activeLinks = await db.collection("media_asset_links").find({ status: "active" }).toArray();
  const catalog = [];
  for (const name of ["artists", "song_releases", "gallery_items", "homepage_sections"]) {
    for (const row of await db.collection(name).find({}).toArray()) catalog.push({ name, row });
  }
  // Checksum identity can resolve older filenames after a catalog title was corrected.
  // Only a unique, current primary artwork reference is eligible for this expansion.
  for (const source of allAssets.filter((a) => ["unassigned", "detached"].includes(a.assignmentStatus) && !["archived", "deleted"].includes(a.status) && (/image|cover|profile|character/.test(a.assetType) || includeAudio && /audio|full_song/.test(a.assetType)))) {
    if (evidence.items.some((item: Record<string, unknown>) => item.assetId === source.assetId && item.recordedCandidateChecksumMatchesAssignedBytes === true)) continue;
    const matches = [];
    for (const canonical of allAssets.filter((a) => a.assetId !== source.assetId && a.assignmentStatus === "assigned" && !["archived", "deleted"].includes(a.status) && /^[a-f0-9]{64}$/i.test(source.metadata?.checksum ?? "") && a.metadata?.checksum === source.metadata.checksum)) {
      for (const entry of catalog.filter((entry) => ["artists", "song_releases"].includes(entry.name))) {
        for (const [field, key] of [["coverArtUrl", "coverArtAssetId"], ["profileImage", "profileImageAssetId"], ["profileThumbnailUrl", "profileThumbnailUrlAssetId"], ["profileBannerUrl", "profileBannerUrlAssetId"], ["characterArtUrl", "characterArtUrlAssetId"], ...(includeAudio ? [["audioPreviewUrl", "audioPreviewAssetId"], ["fullSongUrl", "fullSongAssetId"]] : [])]) {
          if (entry.row.metadata?.[key] === canonical.assetId) matches.push({ canonicalAssetId: canonical.assetId, target: { entityType: entry.name === "artists" ? "artist" : "release", entityId: catalogEntityId(entry.row, entry.name === "artists" ? "artist" : "release"), fieldKey: field } });
        }
      }
    }
    if (matches.length === 1) evidence.items.push({ assetId: source.assetId, ...matches[0], recordedCandidateChecksumMatchesAssignedBytes: true });
  }
  const planned = [];
  const skipped: { assetId: string; reason: string }[] = [];
  for (const item of evidence.items.filter((item: Record<string, unknown>) => item.recordedCandidateChecksumMatchesAssignedBytes === true && item.canonicalAssetId)) {
    const source = allAssets.find((asset) => asset.assetId === item.assetId);
    const canonical = allAssets.find((asset) => asset.assetId === item.canonicalAssetId);
    if (source?.status === "archived" && source.metadata?.duplicateOfAssetId === item.canonicalAssetId) continue;
    const target = item.target ?? source?.metadata?.libraryReconciliation?.target;
    const collection = target?.entityType === "artist" ? "artists" : "song_releases";
    const release = catalog.find((entry) => entry.name === collection && catalogEntityId(entry.row, entry.name === "artists" ? "artist" : "release") === target?.entityId)?.row;
    const key = target?.fieldKey === "coverArtUrl" ? "coverArtAssetId" : `${target?.fieldKey}AssetId`;
    const isAudio = includeAudio && ["audioPreviewUrl", "fullSongUrl"].includes(target?.fieldKey);
    const actualKey = target?.fieldKey === "audioPreviewUrl" ? "audioPreviewAssetId" : target?.fieldKey === "fullSongUrl" ? "fullSongAssetId" : key;
    if (!source || !canonical || !target || !(["coverArtUrl", "profileImage", "profileThumbnailUrl", "profileBannerUrl", "characterArtUrl"].includes(target.fieldKey) || isAudio) || !release || release.metadata?.[actualKey] !== canonical.assetId || canonical.assetId === source.assetId || !["draft", "published"].includes(source.status) || ["archived", "deleted"].includes(canonical.status) || !["unassigned", "detached"].includes(source.assignmentStatus)) { skipped.push({ assetId: item.assetId, reason: "Association changed or unsupported." }); continue; }
    const verified = isAudio ? await verifyAudio(canonical.assetId, source.metadata?.checksum ?? "", target.fieldKey === "audioPreviewUrl" ? release.audioPreviewUrl : undefined) : await verifyCurrentImage(release[target.fieldKey] ?? (target.fieldKey === "characterArtUrl" ? release.publicCharacterArtUrl : undefined), source.metadata?.checksum ?? "");
    if (!verified) { skipped.push({ assetId: item.assetId, reason: "Current assigned bytes do not match original upload checksum or delivery unavailable." }); continue; }
    const identifiers = new Set<string>([source.assetId]);
    const sourceLinks = activeLinks.filter((link) => link.assetId === source.assetId);
    let used = sourceLinks.some((link) => link.entityType !== target.entityType || link.entityId !== target.entityId || link.fieldKey !== target.fieldKey);
    const referenceRepair = release.metadata?.mediaAssetId === source.assetId;
    if (catalog.some((entry) => {
      const row = referenceRepair && entry.name === collection && String(entry.row._id) === String(release._id) ? { ...entry.row, metadata: { ...entry.row.metadata, mediaAssetId: canonical.assetId } } : entry.row;
      return hasLiveCatalogReference(row, identifiers);
    })) used = true;
    if (used) { skipped.push({ assetId: item.assetId, reason: "Original asset still has a live catalog reference." }); continue; }
    if (referenceRepair) permittedReferenceRepairs.set(`${collection}:${release._id}`, { sourceId: source.assetId, canonicalId: canonical.assetId });
    planned.push({ source, canonical, release, collection, target, sourceLinks, referenceRepair });
  }
  const before = await fingerprint();
  let archived = 0;
  let catalogReferencesReconciled = 0;
  if (apply && planned.length) {
    await writeFile(backupPath!, JSON.stringify({ runId, environment: "staging", assets: planned.map((item) => item.source), links: planned.flatMap((item) => item.sourceLinks), catalogRecords: planned.filter((item) => item.referenceRepair).map((item) => ({ collection: item.collection, record: item.release })) }, null, 2), { mode: 0o600, flag: "wx" });
    for (const plan of planned) {
      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          const asset = await db.collection("media_assets").findOne({ _id: plan.source._id }, { session });
          const canonical = await db.collection("media_assets").findOne({ _id: plan.canonical._id }, { session });
          const release = await db.collection(plan.collection).findOne({ _id: plan.release._id }, { session });
          if (JSON.stringify(asset) !== JSON.stringify(plan.source) || JSON.stringify(canonical) !== JSON.stringify(plan.canonical) || JSON.stringify(release) !== JSON.stringify(plan.release)) throw new Error("Records changed; stopped.");
          const currentLinks = await db.collection("media_asset_links").find({ assetId: asset!.assetId, status: "active" }, { session }).toArray();
          if (JSON.stringify(currentLinks) !== JSON.stringify(plan.sourceLinks)) throw new Error("Active links changed.");
          if (plan.referenceRepair) await db.collection(plan.collection).updateOne({ _id: release!._id, "metadata.mediaAssetId": asset!.assetId }, { $set: { "metadata.mediaAssetId": canonical!.assetId } }, { session });
          for (const name of ["artists", "song_releases", "gallery_items", "homepage_sections"]) for await (const row of db.collection(name).find({}, { session })) if (hasLiveCatalogReference(row, new Set([asset!.assetId]))) throw new Error("New catalog reference detected.");
          const now = new Date().toISOString();
          for (const link of currentLinks) await db.collection("media_asset_links").updateOne({ _id: link._id, assetId: asset!.assetId }, { $set: { assetId: canonical!.assetId, "metadata.duplicateReconciliationRunId": runId } }, { session });
          await db.collection("media_assets").updateOne({ _id: asset!._id }, { $set: { status: "archived", updatedAt: now, "metadata.assignmentReviewStatus": "resolved", "metadata.duplicateOfAssetId": canonical!.assetId, "metadata.duplicateReconciliation": { runId, entityId: plan.target.entityId, verifiedAt: now, basis: "Original upload SHA-256 matches current assigned media bytes; original file is unavailable.", previousStatus: asset!.status } } }, { session });
          await db.collection("admin_audit_events").insertOne({ auditEventId: randomUUID(), action: "media_duplicate_archived", entityType: "media_asset", entityId: asset!.assetId, actorId: "operator:codex-user-request", summary: "User-approved reversible archival of duplicate upload; current assigned media retained.", createdAt: now, metadata: { runId, canonicalAssetId: canonical!.assetId, entityId: plan.target.entityId, linksReconciled: currentLinks.length, catalogReferenceReconciled: plan.referenceRepair } }, { session });
        });
        archived++;
        if (plan.referenceRepair) catalogReferencesReconciled++;
      } finally { await session.endSession(); }
    }
  }
  const contentAndStorageUnchanged = before === await fingerprint();
  if (!contentAndStorageUnchanged) process.exitCode = 1;
  console.log(JSON.stringify({ environment: "staging", runId, apply, eligible: planned.length, archived, catalogReferencesReconciled, contentAndStorageUnchanged, skipped }, null, 2));
} catch {
  console.error(JSON.stringify({ environment: "staging", runId, error: "Duplicate archival stopped. Inspect audit and private backup; no URLs or secrets logged." }));
  process.exitCode = 1;
} finally { await client.close(); }
