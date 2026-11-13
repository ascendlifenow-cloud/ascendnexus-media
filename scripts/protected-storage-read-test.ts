import assert from "node:assert/strict";
Object.assign(process.env, { APP_ENV: "test", NODE_ENV: "test", MEDIA_STORAGE_PROVIDER: "r2", MEDIA_STORAGE_ENDPOINT: "https://fixture.r2.cloudflarestorage.com", MEDIA_STORAGE_BUCKET: "fixture", MEDIA_STORAGE_REGION: "auto", MEDIA_STORAGE_ACCESS_KEY_ID: "fixture-access", MEDIA_STORAGE_SECRET_ACCESS_KEY: "fixture-secret" });
const { S3CompatibleStorageAdapter } = await import("../server/storage/S3CompatibleStorageAdapter");
const adapter = new S3CompatibleStorageAdapter({ providerName: "r2" });
const originalFetch = globalThis.fetch;
let reads = 0;
const storage = { provider: "r2", bucket: "fixture", storagePath: "private/fixture.wav" } as never;
try {
  globalThis.fetch = async (input, init) => {
    reads++;
    const url = new URL(String(input));
    assert.equal(url.search, "", "Internal reads must not use presigned query artifacts");
    assert.equal(url.hostname, "fixture.r2.cloudflarestorage.com");
    const headers = new Headers(init?.headers);
    assert.ok(headers.get("authorization")?.startsWith("AWS4-HMAC-SHA256 "));
    assert.equal(headers.get("x-amz-content-sha256"), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    assert.equal(headers.get("accept-encoding"), "identity");
    assert.equal(init?.redirect, "error");
    if (reads === 1) assert.equal(headers.get("range"), "bytes=0-3");
    return new Response("test", { status: reads === 1 ? 206 : 200 });
  };
  assert.equal((await adapter.readObject(storage, { range: "bytes=0-3" })).status, 206);
  assert.equal((await adapter.readObject(storage, {})).status, 200);
  await assert.rejects(adapter.readObject({ ...storage, bucket: "other" } as never, {}), /mismatch/);
  await assert.rejects(adapter.readObject(storage, { range: "bytes=0-1,3-4" }), /Invalid storage range/);
  assert.equal(reads, 2);
  console.log("Header-authenticated protected storage reads passed: no signed query URL, empty-payload signature, range, redirect protection and bucket binding. Synthetic requests only.");
} finally { globalThis.fetch = originalFetch; }
