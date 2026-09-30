process.env.MEDIA_STORAGE_PROVIDER = "r2";
process.env.MEDIA_STORAGE_ENDPOINT = "https://example-account.r2.cloudflarestorage.com";
process.env.MEDIA_STORAGE_BUCKET = "ascend-nexus-media";
process.env.MEDIA_STORAGE_REGION = "auto";
process.env.MEDIA_STORAGE_ACCESS_KEY_ID = "test-access-key";
process.env.MEDIA_STORAGE_SECRET_ACCESS_KEY = "test-secret-key";
process.env.MEDIA_STORAGE_PUBLIC_BASE_URL = "https://media.example.com";
process.env.MEDIA_STORAGE_PUBLIC_PREFIX = "public";
process.env.MEDIA_STORAGE_PRIVATE_PREFIX = "private";
process.env.MEDIA_CDN_ENABLED = "true";
process.env.MEDIA_CDN_BASE_URL = "https://cdn.example.com";

const { validateProductionStorageConfig } = await import("../server/config/validateProductionStorageConfig.ts");
const { CloudflareR2StorageAdapter } = await import("../server/storage/adapters/CloudflareR2StorageAdapter.ts");
const { buildNamespacedStoragePath } = await import("../server/utils/media/storagePrefixUtils.ts");

const validation = validateProductionStorageConfig();
if (!validation.configured) throw new Error(`Expected configured R2 test config: ${JSON.stringify(validation)}`);

const adapter = new CloudflareR2StorageAdapter();
if (!adapter.isConfigured()) throw new Error("R2 adapter should be configured with smoke env.");

const publicPath = buildNamespacedStoragePath({
  accessLevel: "public",
  target: {
    targetType: "release",
    targetId: "release-001",
    ownerType: "release",
    ownerId: "release-001",
    assetType: "cover_art",
    intendedUse: "cover_art",
    accessLevel: "public",
  },
  fileName: "Cover Art.png",
  publicPrefix: "public",
  privatePrefix: "private",
});
const privatePath = buildNamespacedStoragePath({
  accessLevel: "admin_only",
  target: {
    targetType: "release",
    targetId: "release-001",
    ownerType: "release",
    ownerId: "release-001",
    assetType: "full_song",
    intendedUse: "full_song",
    accessLevel: "admin_only",
  },
  fileName: "Full Song.mp3",
  publicPrefix: "public",
  privatePrefix: "private",
});

if (!publicPath.startsWith("public/releases/release-001/cover-art/")) throw new Error(`Unexpected public namespace: ${publicPath}`);
if (!privatePath.startsWith("private/releases/release-001/full-song/")) throw new Error(`Unexpected private namespace: ${privatePath}`);
const publicUrl = adapter.getPublicUrl(publicPath);
if (!publicUrl?.startsWith("https://cdn.example.com/public/releases/release-001/cover-art/")) throw new Error(`Unexpected public URL: ${publicUrl}`);
if (adapter.getPublicUrl(privatePath) !== undefined) throw new Error("Private path produced a public URL.");
const signedUrl = await adapter.getSignedUrl({
  storageObjectId: "storage-test",
  provider: "r2",
  bucket: "ascend-nexus-media",
  storagePath: privatePath,
  fileName: "full-song.mp3",
  originalFileName: "Full Song.mp3",
  mimeType: "audio/mpeg",
  fileExtension: "mp3",
  fileSizeBytes: 1234,
  mediaCategory: "audio",
  assetType: "full_song",
  accessLevel: "admin_only",
  status: "ready",
  uploadedAt: new Date().toISOString(),
}, 120, "admin_preview");
if (!signedUrl?.includes("X-Amz-Signature=")) throw new Error("Signed URL was not generated.");

console.log(JSON.stringify({
  success: true,
  provider: adapter.getProviderName(),
  publicPath,
  privatePath,
  publicUrl,
  signedUrlReady: true,
}, null, 2));
