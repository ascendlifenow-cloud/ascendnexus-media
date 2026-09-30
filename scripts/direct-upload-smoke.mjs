import { setTimeout as delay } from "node:timers/promises";

process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5314";
process.env.MEDIA_API_HOST = process.env.MEDIA_API_HOST || "127.0.0.1";
process.env.MEDIA_ADMIN_DEV_TOKEN = process.env.MEDIA_ADMIN_DEV_TOKEN || "dev-admin-token";
process.env.MEDIA_STORAGE_PROVIDER = process.env.MEDIA_STORAGE_PROVIDER || "local";

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
  const createSession = await fetch(`http://${host}:${port}/api/admin/media/direct-upload/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: "private-full-song.mp3",
      fileSizeBytes: 30 * 1024 * 1024,
      mimeType: "audio/mpeg",
      assetType: "full_song",
      targetType: "release",
      targetId: "release-smoke",
      ownerType: "release",
      ownerId: "release-smoke",
      intendedUse: "release_full_song",
      accessLevel: "public",
      metadata: {
        smoke: true,
      },
      storagePath: "client-must-not-control-this",
      publicUrl: "https://example.com/must-not-be-used.mp3",
    }),
  });
  const payload = await createSession.json();
  if (!createSession.ok || !payload.success || !payload.uploadSessionId) {
    throw new Error(`Direct session smoke failed: ${JSON.stringify(payload)}`);
  }
  if (payload.uploadStrategy !== "backend_proxy") {
    throw new Error(`Local provider should select backend_proxy, got ${payload.uploadStrategy}`);
  }
  if (payload.session?.accessLevel !== "admin_only") {
    throw new Error("Full-song direct session did not force admin_only access.");
  }
  if (JSON.stringify(payload).includes("client-must-not-control-this") || JSON.stringify(payload).includes("must-not-be-used.mp3")) {
    throw new Error("Client-controlled storage fields leaked into direct upload session.");
  }
  if (payload.parts?.length || payload.singleUploadUrl) {
    throw new Error("Proxy fallback must not expose presigned URLs.");
  }
  console.log(JSON.stringify({
    success: true,
    uploadSessionId: payload.uploadSessionId,
    uploadJobId: payload.uploadJobId,
    uploadStrategy: payload.uploadStrategy,
    accessLevel: payload.session.accessLevel,
  }, null, 2));
} finally {
  await close();
}
