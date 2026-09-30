import { setTimeout as delay } from "node:timers/promises";

process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5313";
process.env.MEDIA_API_HOST = process.env.MEDIA_API_HOST || "127.0.0.1";
process.env.MEDIA_ADMIN_DEV_TOKEN = process.env.MEDIA_ADMIN_DEV_TOKEN || "dev-admin-token";

const { createMediaApiServer } = await import("../server/index.ts");

const token = process.env.MEDIA_ADMIN_DEV_TOKEN;
const port = process.env.MEDIA_API_PORT;
const host = process.env.MEDIA_API_HOST;
const server = createMediaApiServer();

const listen = () => new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(Number(port), host, resolve);
});

const close = () => new Promise((resolve) => server.close(resolve));

const waitForHealth = async () => {
  for (let index = 0; index < 20; index += 1) {
    try {
      const response = await fetch(`http://${host}:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Server did not become healthy.");
};

try {
  await listen();
  await waitForHealth();
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const form = new FormData();
  form.append("file", new Blob([pngBytes], { type: "image/png" }), "cover.png");
  form.append("targetType", "media_library");
  form.append("assetType", "cover_art");
  form.append("intendedUse", "backend_smoke_test");
  form.append("accessLevel", "admin_only");
  form.append("title", "Backend Smoke Cover");
  const upload = await fetch(`http://${host}:${port}/api/admin/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const payload = await upload.json();
  if (!upload.ok || !payload.success || !payload.mediaAsset?.assetId || !payload.storageObject?.storageObjectId) {
    throw new Error(`Upload smoke test failed: ${JSON.stringify(payload)}`);
  }
  const job = await fetch(`http://${host}:${port}/api/admin/media/uploads/${payload.uploadJob.uploadJobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!job.ok) throw new Error("Upload job polling failed.");
  const health = await fetch(`http://${host}:${port}/api/admin/media/storage/health`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!health.ok) throw new Error("Storage health endpoint failed.");
  console.log(JSON.stringify({
    success: true,
    assetId: payload.mediaAsset.assetId,
    storageObjectId: payload.storageObject.storageObjectId,
    uploadJobId: payload.uploadJob.uploadJobId,
  }, null, 2));
} finally {
  await close();
}
