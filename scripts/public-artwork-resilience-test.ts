import assert from "node:assert/strict";
import { loadArtworkSources, publicJsonRequest } from "../src/services/public/publicJsonRequest";

const unavailable = async (): Promise<string[]> => { throw new Error("Unavailable"); };
const partial = await loadArtworkSources(async () => ["artist"], async () => ["cover"], unavailable);
assert.deepEqual(partial.artists, ["artist"]);
assert.deepEqual(partial.releases, ["cover"]);
assert.deepEqual(partial.gallery, []);
assert.equal(partial.partial, true);
await assert.rejects(() => loadArtworkSources(unavailable, unavailable, unavailable));
const empty = await loadArtworkSources(async () => [], async () => [], async () => []);
assert.equal(empty.partial, false);

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
  assert.deepEqual(await publicJsonRequest("https://example.invalid"), { success: true });
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.equal(await publicJsonRequest("https://example.invalid", true), undefined);
  await assert.rejects(() => publicJsonRequest("https://example.invalid"));
  globalThis.fetch = async () => new Response(null, { status: 503 });
  await assert.rejects(() => publicJsonRequest("https://example.invalid"));
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  });
  await assert.rejects(() => publicJsonRequest("https://example.invalid", false, 5), /Aborted/);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Public artwork resilience: partial sources, total failure, HTTP failures and timeout checks passed.");
