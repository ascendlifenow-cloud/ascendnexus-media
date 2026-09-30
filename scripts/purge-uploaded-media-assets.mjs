import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "server/data/media-db.json");
const uploadsRoot = path.join(rootDir, "server/uploads/media");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(rootDir, `server/data/media-db.pre-upload-purge-${timestamp}.json`);

const uploadUrlPattern = /^(\/uploads\/media\/|https?:\/\/[^/]+\/uploads\/media\/|private\/|public\/|processing\/|quarantine\/)/;

const mediaCollectionKeys = [
  "mediaAssets",
  "mediaStorageObjects",
  "mediaUploadJobs",
  "mediaProcessingJobs",
  "mediaAssetLinks",
  "mediaAssetVersions",
  "mediaPublicationOperations",
  "mediaPublicationLocks",
  "publishedContentSyncStatuses",
  "directMediaUploadSessions",
  "mediaIntakeRecords",
  "protectedMediaResources",
  "protectedMediaAuthorizations",
  "protectedPlaybackSessions",
  "protectedContentTakedowns",
];

const assetMetadataKeys = new Set([
  "profileImageAssetId",
  "profileImageStorageObjectId",
  "profileThumbnailAssetId",
  "profileThumbnailStorageObjectId",
  "profileBannerAssetId",
  "profileBannerStorageObjectId",
  "characterArtUrl",
  "characterArtAssetId",
  "characterArtStorageObjectId",
  "coverArtAssetId",
  "coverArtStorageObjectId",
  "coverArtThumbnailAssetId",
  "coverArtThumbnailStorageObjectId",
  "coverArtLargeAssetId",
  "coverArtLargeStorageObjectId",
  "audioPreviewAssetId",
  "audioPreviewStorageObjectId",
  "fullSongUrl",
  "fullSongAssetId",
  "fullSongStorageObjectId",
  "mediaAssetId",
  "mediaAssetType",
  "mediaAssetUrl",
  "mediaAssetLinkId",
  "mediaAssetFieldKey",
  "mediaAssetIntendedUse",
  "previousMediaAssetLinkId",
  "previousCoverArtAssetIds",
  "previousAudioAssetIds",
  "pendingReleaseCoverArtAssignment",
  "pendingReleaseAudioAssignment",
  "pendingArtistArtworkAssignment",
]);

const readFirstJsonObject = (raw) => {
  let depth = 0;
  let inString = false;
  let escape = false;
  let started = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (!started) {
      if (/\s/.test(char)) continue;
      if (char !== "{") throw new Error("media-db.json does not start with a JSON object.");
      started = true;
      depth = 1;
      continue;
    }
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return raw.slice(0, index + 1);
  }
  throw new Error("media-db.json does not contain a complete JSON object.");
};

const isUploadReference = (value) => typeof value === "string" && uploadUrlPattern.test(value.trim());

const cleanMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return metadata;
  const next = { ...metadata };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (assetMetadataKeys.has(key) || isUploadReference(value)) delete next[key];
  }
  return next;
};

const clearStringFieldIfUpload = (record, field) => {
  if (isUploadReference(record[field])) {
    record[field] = "";
    return 1;
  }
  return 0;
};

const clearOptionalFieldIfUpload = (record, field) => {
  if (isUploadReference(record[field])) {
    delete record[field];
    return 1;
  }
  return 0;
};

const clearConfigMedia = (value) => {
  if (!value || typeof value !== "object") return 0;
  let count = 0;
  for (const [key, fieldValue] of Object.entries(value)) {
    if (isUploadReference(fieldValue)) {
      value[key] = "";
      count += 1;
    } else if (fieldValue && typeof fieldValue === "object") {
      count += clearConfigMedia(fieldValue);
    }
  }
  return count;
};

const removeUploads = async () => {
  let fileCount = 0;
  try {
    const entries = await fs.readdir(uploadsRoot, { recursive: true, withFileTypes: true });
    fileCount = entries.filter((entry) => entry.isFile()).length;
  } catch {
    fileCount = 0;
  }
  await fs.rm(uploadsRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(uploadsRoot, "public"), { recursive: true });
  await fs.mkdir(path.join(uploadsRoot, "private"), { recursive: true });
  return fileCount;
};

const raw = await fs.readFile(dbPath, "utf8");
await fs.writeFile(backupPath, raw);
const data = JSON.parse(readFirstJsonObject(raw));

const before = {};
for (const key of mediaCollectionKeys) before[key] = Array.isArray(data[key]) ? data[key].length : 0;

for (const key of mediaCollectionKeys) {
  data[key] = [];
}

let clearedReferences = 0;

for (const artist of data.artistRecords ?? []) {
  clearedReferences += clearStringFieldIfUpload(artist, "profileImage");
  clearedReferences += clearOptionalFieldIfUpload(artist, "profileThumbnailUrl");
  clearedReferences += clearOptionalFieldIfUpload(artist, "profileBannerUrl");
  clearedReferences += clearOptionalFieldIfUpload(artist, "publicCharacterArtUrl");
  artist.metadata = cleanMetadata(artist.metadata);
}

for (const release of data.releaseRecords ?? []) {
  clearedReferences += clearOptionalFieldIfUpload(release, "coverArtUrl");
  clearedReferences += clearOptionalFieldIfUpload(release, "coverArtThumbnailUrl");
  clearedReferences += clearOptionalFieldIfUpload(release, "coverArtLargeUrl");
  clearedReferences += clearOptionalFieldIfUpload(release, "audioPreviewUrl");
  release.metadata = cleanMetadata(release.metadata);
}

for (const item of data.galleryItems ?? []) {
  clearedReferences += clearOptionalFieldIfUpload(item, "imageUrl");
  clearedReferences += clearOptionalFieldIfUpload(item, "thumbnailUrl");
  item.metadata = cleanMetadata(item.metadata);
}

for (const config of data.siteConfigurations ?? []) clearedReferences += clearConfigMedia(config);
for (const config of data.homepageConfigurations ?? []) clearedReferences += clearConfigMedia(config);
for (const record of data.seoMetadataRecords ?? []) clearedReferences += clearConfigMedia(record);
for (const record of data.socialMetadataRecords ?? []) clearedReferences += clearConfigMedia(record);
for (const event of data.adminAuditEvents ?? []) clearedReferences += clearConfigMedia(event);
for (const event of data.analyticsEventRecords ?? []) clearedReferences += clearConfigMedia(event);
for (const event of data.securityEvents ?? []) clearedReferences += clearConfigMedia(event);
for (const event of data.distributionAuditEvents ?? []) clearedReferences += clearConfigMedia(event);

if (Array.isArray(data.optimizationRecommendations)) {
  data.optimizationRecommendations = data.optimizationRecommendations.filter((item) => item.entityType !== "media_asset");
}

const removedFiles = await removeUploads();
await fs.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  success: true,
  backupPath,
  purgedCollections: before,
  removedUploadFiles: removedFiles,
  clearedContentReferences: clearedReferences,
  uploadsRoot,
}, null, 2));
