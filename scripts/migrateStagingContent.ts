import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

type Row = Record<string, any>;

const root = process.cwd();
const dataPath = path.join(root, "server/data/media-db.json");
const uploadRoot = path.join(root, "server/uploads/media");
const checkpointPath = path.join(root, "server/data/staging-migration-checkpoint.json");
const execute = process.argv.includes("--execute");
const phase = process.argv.find((arg) => arg.startsWith("--phase="))?.split("=")[1] ?? "all";
const publicBaseUrl = (process.env.MEDIA_STORAGE_PUBLIC_BASE_URL || "https://staging-media.ascendnexusmedia.com").replace(/\/+$/, "");

if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) throw new Error("MongoDB migration configuration is incomplete.");
if (!process.env.MEDIA_STORAGE_ENDPOINT || !process.env.MEDIA_STORAGE_BUCKET) throw new Error("R2 migration configuration is incomplete.");
if (!execute) throw new Error("This command mutates staging and requires --execute.");
if (!["all", "media", "catalog"].includes(phase)) throw new Error("--phase must be all, media, or catalog.");

process.env.NODE_ENV = "staging";
process.env.MEDIA_STORAGE_PROVIDER = "r2";
process.env.MEDIA_STORAGE_PUBLIC_BASE_URL = publicBaseUrl;
process.env.MEDIA_STORAGE_PUBLIC_PREFIX ||= "public";
process.env.MEDIA_STORAGE_PRIVATE_PREFIX ||= "private";
process.env.MEDIA_STORAGE_FORCE_PATH_STYLE ||= "true";

const source = JSON.parse(await fs.readFile(dataPath, "utf8")) as Record<string, Row[]>;
const activeAssets = (source.mediaAssets ?? []).filter((asset) => !["archived", "deleted"].includes(asset.status));
const activeAssetIds = new Set(activeAssets.map((asset) => asset.assetId));

const fileFor = (storagePath: string) => {
  const resolved = path.resolve(uploadRoot, storagePath);
  if (!resolved.startsWith(`${path.resolve(uploadRoot)}${path.sep}`)) throw new Error("Storage path escaped the upload root.");
  return resolved;
};

const publicUrl = (storagePath: string) => storagePath.startsWith("public/") ? `${publicBaseUrl}/${storagePath}` : undefined;

const rewritePublicUrls = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(rewritePublicUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Row).map(([key, nested]) => [key, rewritePublicUrls(nested)]));
  }
  if (typeof value !== "string") return value;
  const marker = "/uploads/media/public/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex >= 0) return `${publicBaseUrl}/${value.slice(markerIndex + marker.length).replace(/^\/+/, "")}`;
  if (value.startsWith("public/")) return `${publicBaseUrl}/${value}`;
  return value;
};

const sha256File = async (filePath: string) => {
  const buffer = await fs.readFile(filePath);
  return { buffer, checksum: createHash("sha256").update(buffer).digest("hex") };
};

const checkpoint = await fs.readFile(checkpointPath, "utf8")
  .then((text) => JSON.parse(text) as { uploaded: string[] })
  .catch(() => ({ uploaded: [] }));
const uploaded = new Set(checkpoint.uploaded ?? []);
const saveCheckpoint = async () => fs.writeFile(checkpointPath, JSON.stringify({ uploaded: [...uploaded].sort(), updatedAt: new Date().toISOString() }, null, 2));

const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20_000 });
await mongo.connect();
const db = mongo.db(process.env.MONGODB_DATABASE);

const stats = {
  uploaded: 0,
  skippedExisting: 0,
  missingFiles: 0,
  upsertedStorageRecords: 0,
  catalog: {} as Record<string, number>,
};

try {
  const storageObjects = (source.mediaStorageObjects ?? []).filter((item) =>
    item.assetId && activeAssetIds.has(item.assetId) && !["failed", "deleted"].includes(item.status),
  );
  const available: Array<{ record: Row; filePath: string; size: number }> = [];
  const missing: Row[] = [];
  for (const record of storageObjects) {
    const filePath = fileFor(record.storagePath);
    const stat = await fs.stat(filePath).catch(() => undefined);
    if (stat?.isFile()) available.push({ record, filePath, size: stat.size });
    else missing.push(record);
  }
  stats.missingFiles = missing.length;

  if (phase === "all" || phase === "media") {
    const { CloudflareR2StorageAdapter } = await import("../server/storage/adapters/CloudflareR2StorageAdapter");
    const adapter = new CloudflareR2StorageAdapter();
    let cursor = 0;
    let completed = 0;
    const migrateOne = async ({ record, filePath, size }: (typeof available)[number]) => {
      const remote = await adapter.fileExists(record.storagePath);
      const remoteSize = Number(remote.metadata?.contentLength ?? -1);
      if (remote.exists && remoteSize === size) {
        stats.skippedExisting += 1;
      } else {
        const { buffer, checksum } = await sha256File(filePath);
        await adapter.upload({
          storagePath: record.storagePath,
          checksum,
          uploadedBy: "staging-migration",
          file: {
            buffer,
            fileName: record.originalFileName || record.fileName,
            mimeType: record.mimeType || "application/octet-stream",
            size,
          },
          target: {
            assetType: record.assetType,
            accessLevel: record.accessLevel,
            metadata: { migratedFrom: "local", sourceStorageObjectId: record.storageObjectId },
          },
        });
        stats.uploaded += 1;
      }
      uploaded.add(record.storageObjectId);
      const migratedRecord = rewritePublicUrls({
        ...record,
        provider: "r2",
        bucket: process.env.MEDIA_STORAGE_BUCKET,
        fileSizeBytes: size,
        publicUrl: publicUrl(record.storagePath),
        updatedAt: new Date().toISOString(),
        metadata: { ...(record.metadata ?? {}), migratedFrom: "local", migrationVerifiedAt: new Date().toISOString() },
      }) as Row;
      await db.collection("media_storage_objects").replaceOne({ storageObjectId: record.storageObjectId }, migratedRecord, { upsert: true });
      stats.upsertedStorageRecords += 1;
      completed += 1;
      if (completed % 10 === 0 || completed === available.length) {
        await saveCheckpoint();
        console.log(JSON.stringify({ stage: "media", complete: completed, total: available.length, uploaded: stats.uploaded, skipped: stats.skippedExisting }));
      }
    };
    const worker = async () => {
      while (cursor < available.length) {
        const item = available[cursor];
        cursor += 1;
        await migrateOne(item);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  if (phase === "all" || phase === "catalog") {
    const uploadedStorageIds = new Set(available.map(({ record }) => record.storageObjectId));
    const definitions: Array<[string, string, string, (row: Row) => boolean]> = [
      ["artistRecords", "artists", "artistId", () => true],
      ["releaseRecords", "song_releases", "releaseId", () => true],
      ["mediaAssets", "media_assets", "assetId", (row) => activeAssetIds.has(row.assetId)],
      ["mediaAssetLinks", "media_asset_links", "linkId", (row) => activeAssetIds.has(row.assetId)],
      ["mediaAssetVersions", "media_asset_versions", "versionId", (row) => activeAssetIds.has(row.assetId) && (!row.storageObjectId || uploadedStorageIds.has(row.storageObjectId))],
      ["galleryItems", "gallery_items", "galleryItemId", () => true],
      ["homepageConfigurations", "homepage_configurations", "homepageConfigId", () => true],
      ["siteConfigurations", "site_configurations", "siteConfigId", () => true],
      ["seoMetadataRecords", "seo_metadata", "seoMetadataId", () => true],
      ["socialMetadataRecords", "social_metadata", "socialMetadataId", () => true],
      ["publishedContentSyncStatuses", "published_content_sync_statuses", "syncStatusId", () => true],
    ];
    for (const [property, collectionName, idField, include] of definitions) {
      const rows = (source[property] ?? []).filter(include).map((row) => rewritePublicUrls(row) as Row);
      if (rows.length) {
        await db.collection(collectionName).bulkWrite(rows.map((row) => ({
          replaceOne: { filter: { [idField]: row[idField] }, replacement: row, upsert: true },
        })), { ordered: true });
      }
      stats.catalog[property] = rows.length;
      console.log(JSON.stringify({ stage: "catalog", collection: collectionName, upserted: rows.length }));
    }
  }

  const criticalAssetIds = new Set([
    ...(source.mediaAssetLinks ?? []).filter((link) => link.status === "active").map((link) => link.assetId),
    ...activeAssets.filter((asset) => ["assigned", "published"].includes(asset.assignmentStatus) || asset.status === "published").map((asset) => asset.assetId),
  ]);
  const availableAssetIds = new Set(available.map(({ record }) => record.assetId));
  const missingCritical = [...criticalAssetIds].filter((assetId) => assetId && !availableAssetIds.has(assetId));
  console.log(JSON.stringify({
    success: true,
    phase,
    database: process.env.MONGODB_DATABASE,
    stats,
    missingCriticalAssetCount: missingCritical.length,
    missingCriticalAssetIds: missingCritical,
  }, null, 2));
} finally {
  await mongo.close();
}
