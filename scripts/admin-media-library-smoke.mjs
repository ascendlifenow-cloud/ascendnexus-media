process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5323";
process.env.MEDIA_API_HOST = process.env.MEDIA_API_HOST || "127.0.0.1";
process.env.MEDIA_ADMIN_DEV_TOKEN = process.env.MEDIA_ADMIN_DEV_TOKEN || "dev-admin-token";

const { createMediaApiServer } = await import("../server/index.ts");
const { mediaAssetPersistenceService } = await import("../server/services/media/MediaAssetPersistenceService.ts");
const { mediaStoragePersistenceService } = await import("../server/services/media/MediaStoragePersistenceService.ts");

const token = process.env.MEDIA_ADMIN_DEV_TOKEN;
const port = process.env.MEDIA_API_PORT;
const host = process.env.MEDIA_API_HOST;
const base = `http://${host}:${port}`;
const server = createMediaApiServer();
const now = new Date().toISOString();

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
};

const createAsset = async (asset) => mediaAssetPersistenceService.create({
  ownerType: "media_library",
  title: "Smoke Media Asset",
  description: "Media library smoke asset",
  status: "draft",
  assignmentStatus: "unassigned",
  createdAt: now,
  updatedAt: now,
  metadata: {},
  ...asset,
});

const createStorage = async (object) => mediaStoragePersistenceService.create({
  provider: "local",
  bucket: "local",
  storagePath: `private/smoke/${object.storageObjectId}`,
  fileName: `${object.storageObjectId}.bin`,
  originalFileName: `${object.storageObjectId}.bin`,
  mimeType: "application/octet-stream",
  fileExtension: ".bin",
  fileSizeBytes: 100,
  mediaCategory: "image",
  assetType: "custom_image",
  accessLevel: "admin_only",
  status: "ready",
  uploadedAt: now,
  updatedAt: now,
  metadata: {},
  ...object,
});

try {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const imageAssetId = `smoke-media-image-${suffix}`;
  const storageAId = `smoke-storage-a-${suffix}`;
  const storageBId = `smoke-storage-b-${suffix}`;
  await createAsset({ assetId: imageAssetId, assetType: "cover_art", title: `Smoke Cover ${suffix}`, url: `/uploads/media/public/smoke/${storageAId}.webp` });
  await createStorage({ storageObjectId: storageAId, assetId: imageAssetId, storagePath: `public/smoke/${storageAId}.webp`, publicUrl: `/uploads/media/public/smoke/${storageAId}.webp`, fileName: `${storageAId}.webp`, originalFileName: `${storageAId}.webp`, mimeType: "image/webp", fileExtension: ".webp", mediaCategory: "image", assetType: "cover_art", accessLevel: "public" });
  await createStorage({ storageObjectId: storageBId, storagePath: `public/smoke/${storageBId}.webp`, publicUrl: `/uploads/media/public/smoke/${storageBId}.webp`, fileName: `${storageBId}.webp`, originalFileName: `${storageBId}.webp`, mimeType: "image/webp", fileExtension: ".webp", mediaCategory: "image", assetType: "cover_art", accessLevel: "public" });

  const fullSongAssetId = `smoke-full-song-${suffix}`;
  const fullSongStorageId = `smoke-full-song-storage-${suffix}`;
  const publicAudioStorageId = `smoke-public-audio-${suffix}`;
  await createAsset({ assetId: fullSongAssetId, assetType: "full_song", title: `Smoke Full Song ${suffix}`, metadata: { fullSongAsset: true } });
  await createStorage({ storageObjectId: fullSongStorageId, assetId: fullSongAssetId, storagePath: `private/smoke/${fullSongStorageId}.mp3`, fileName: `${fullSongStorageId}.mp3`, originalFileName: `${fullSongStorageId}.mp3`, mimeType: "audio/mpeg", fileExtension: ".mp3", mediaCategory: "audio", assetType: "full_song", accessLevel: "private" });
  await createStorage({ storageObjectId: publicAudioStorageId, storagePath: `public/smoke/${publicAudioStorageId}.mp3`, publicUrl: `/uploads/media/public/smoke/${publicAudioStorageId}.mp3`, fileName: `${publicAudioStorageId}.mp3`, originalFileName: `${publicAudioStorageId}.mp3`, mimeType: "audio/mpeg", fileExtension: ".mp3", mediaCategory: "audio", assetType: "full_song", accessLevel: "public" });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(port), host, resolve);
  });

  const list = await request(`/api/admin/media/assets?search=${encodeURIComponent(suffix)}`);
  if (!list.response.ok || !list.json.mediaAssets.some((asset) => asset.assetId === imageAssetId)) throw new Error(`Media list failed: ${JSON.stringify(list.json)}`);

  const details = await request(`/api/admin/media/assets/${imageAssetId}`);
  if (!details.response.ok || !details.json.storageObjects?.length) throw new Error(`Media details failed: ${JSON.stringify(details.json)}`);

  const history = await request(`/api/admin/media/assets/${imageAssetId}/versions`);
  if (!history.response.ok || history.json.history.versions.length !== 1) throw new Error(`Version history failed: ${JSON.stringify(history.json)}`);
  const initialVersionId = history.json.history.activeVersionId;

  const link = await request(`/api/admin/media/assets/${imageAssetId}/links`, {
    method: "POST",
    body: JSON.stringify({ entityType: "release", entityId: `release-smoke-${suffix}`, fieldKey: "coverArtUrl", intendedUse: "release_cover_art" }),
  });
  if (!link.response.ok || !link.json.link?.linkId) throw new Error(`Media link failed: ${JSON.stringify(link.json)}`);

  const replace = await request(`/api/admin/media/assets/${imageAssetId}/replace`, {
    method: "POST",
    body: JSON.stringify({ storageObjectId: storageBId, changeReason: "Smoke replacement" }),
  });
  if (!replace.response.ok || !replace.json.newVersion?.versionId || replace.json.newVersion.versionId === initialVersionId) throw new Error(`Media replace failed: ${JSON.stringify(replace.json)}`);

  const rollback = await request(`/api/admin/media/assets/${imageAssetId}/versions/${initialVersionId}/rollback`, {
    method: "POST",
    body: JSON.stringify({ changeReason: "Smoke rollback" }),
  });
  if (!rollback.response.ok || rollback.json.newVersion?.versionId !== initialVersionId) throw new Error(`Media rollback failed: ${JSON.stringify(rollback.json)}`);

  const dependencies = await request(`/api/admin/media/assets/${imageAssetId}/dependencies`);
  if (!dependencies.response.ok || !dependencies.json.dependencies?.activeLinks?.length) throw new Error(`Dependency inspection failed: ${JSON.stringify(dependencies.json)}`);

  const detach = await request(`/api/admin/media/links/${link.json.link.linkId}/detach`, { method: "POST", body: "{}" });
  if (!detach.response.ok || detach.json.link?.status !== "detached") throw new Error(`Detach failed: ${JSON.stringify(detach.json)}`);

  const fullSongPublicReplace = await request(`/api/admin/media/assets/${fullSongAssetId}/replace`, {
    method: "POST",
    body: JSON.stringify({ storageObjectId: publicAudioStorageId, changeReason: "Should be rejected" }),
  });
  if (fullSongPublicReplace.response.status < 400) throw new Error("Public replacement for full-song asset should be rejected.");

  console.log(JSON.stringify({
    success: true,
    assetId: imageAssetId,
    initialVersionId,
    replacementVersionId: replace.json.newVersion.versionId,
    rollbackActiveVersionId: rollback.json.newVersion.versionId,
    detached: true,
    fullSongPublicReplacementRejected: true,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
