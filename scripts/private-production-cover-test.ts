import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const root = await mkdtemp(join(tmpdir(), "anmx-cover-test-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_STORAGE_PROVIDER: "local", MEDIA_STORAGE_LOCAL_ROOT: root, MEDIA_DATA_ROOT: root, MEDIA_ADMIN_DEV_TOKEN: "isolated-cover-test-token" });
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { readPrivateProductionCover } = await import("../server/services/production/PrivateProductionCoverService");
const { handleAdminReleaseRoute } = await import("../server/routes/adminReleaseRoutes");
const { sendSafeError } = await import("../server/middleware/mediaErrorMiddleware");
const { mediaAuthorizationService } = await import("../server/services/media/MediaAuthorizationService");
const { backendStorageProviderRegistry } = await import("../server/storage/StorageProviderRegistry");
const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOuoAAAAASUVORK5CYII=", "base64");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const server = createServer(async (request, response) => {
  try { if (!await handleAdminReleaseRoute(request, response, new URL(request.url!, "http://localhost"))) { response.writeHead(404); response.end(); } }
  catch (error) { sendSafeError(response, error); }
});
try {
  await mkdir(join(root, "private"));
  await writeFile(join(root, "private/cover.png"), bytes);
  await jsonDatabase.insertCollectionRecord("releaseRecords", { releaseId: "cover-release", status: "draft", publicationState: "draft", publicVisibility: false, metadata: { productionPackage: { assets: [{ assetId: "cover-asset", role: "artwork", sha256 }] } } } as never);
  await jsonDatabase.insertCollectionRecord("mediaAssets", { assetId: "cover-asset", assetType: "cover_art", status: "draft" } as never);
  await jsonDatabase.insertCollectionRecord("mediaAssetLinks", { linkId: "cover-link", entityId: "cover-release", assetId: "cover-asset", fieldKey: "coverArt", status: "active" } as never);
  await jsonDatabase.insertCollectionRecord("mediaStorageObjects", { storageObjectId: "cover-storage", assetId: "cover-asset", status: "ready", accessLevel: "admin_only", checksum: sha256, mimeType: "image/png", storagePath: "private/cover.png" } as never);
  assert.ok((await readPrivateProductionCover("cover-release")).bytes.equals(bytes));
  await writeFile(join(root, "private/cover.png"), Buffer.from("changed"));
  await assert.rejects(() => readPrivateProductionCover("cover-release"), /Private artwork is unavailable/);
  await writeFile(join(root, "private/cover.png"), bytes);
  const getProvider = backendStorageProviderRegistry.getActiveProvider;
  const originalFetch = globalThis.fetch;
  try {
    backendStorageProviderRegistry.getActiveProvider = () => ({ getProviderName: () => "r2", getSignedUrl: async () => "https://storage.example.invalid/private?signature=SYNTHETIC_VALUE" }) as never;
    globalThis.fetch = async () => new Response(bytes, { status: 200 });
    assert.ok((await readPrivateProductionCover("cover-release")).bytes.equals(bytes));
    globalThis.fetch = async () => { throw new Error("SYNTHETIC_VALUE"); };
    await assert.rejects(() => readPrivateProductionCover("cover-release"), (error: Error) => !error.message.includes("SYNTHETIC_VALUE") && /Private artwork is unavailable/.test(error.message));
  } finally { backendStorageProviderRegistry.getActiveProvider = getProvider; globalThis.fetch = originalFetch; }
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Listener unavailable");
  const url = `http://127.0.0.1:${address.port}/api/admin/releases/cover-release/production-cover`;
  assert.equal((await fetch(url)).status, 401);
  const headers = { "X-Admin-Dev-Token": process.env.MEDIA_ADMIN_DEV_TOKEN! };
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.ok(Buffer.from(await response.arrayBuffer()).equals(bytes));
  const authenticate = mediaAuthorizationService.authenticate;
  try { mediaAuthorizationService.authenticate = async () => ({ adminId: "limited", permissions: ["releases.read"] }); assert.equal((await fetch(url, { headers })).status, 403); }
  finally { mediaAuthorizationService.authenticate = authenticate; }
  await jsonDatabase.patchCollectionRecord("mediaAssets", { assetId: "cover-asset" }, { status: "archived" });
  await assert.rejects(() => readPrivateProductionCover("cover-release"));
  console.log("Private production cover passed: exact bytes, checksum mismatch, private caching, authentication, media permission and archived asset denial.");
} finally {
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
}
