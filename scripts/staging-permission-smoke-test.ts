import assert from "node:assert/strict";
import { projectionSafe, runStagingSmoke } from "./staging-permission-smoke";

assert.equal(projectionSafe({ data: [{ title: "Safe song", audioPreviewUrl: "https://media.example/public/preview.mp3" }] }), true);
for (const value of [{ streamUrl: "hidden" }, { fullSongPublicUrl: "https://cdn.example/audio/master.mp3" }, { nested: [{ privateObjectKey: "hidden" }] }, { url: "https://media.example/private/audio.wav" }, { url: "https://media.example/audio?X-Amz-Signature=hidden" }]) assert.equal(projectionSafe(value), false);
const commit = "a".repeat(40);
const mock = (revision: string, leak = false, unauthorized = true): typeof fetch => async input => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://api-staging.ascendnexusmedia.com");
  const health = url.pathname === "/health/ready";
  const publicRoute = url.pathname === "/api/public/releases";
  return new Response(JSON.stringify(health ? { data: { environment: "staging", ready: true, release: { commitSha: revision } } } : publicRoute ? { success: true, data: leak ? { streamUrl: "synthetic-secret" } : [] } : { success: false }), { status: health || publicRoute ? 200 : unauthorized ? 401 : 404, headers: { "Content-Type": "application/json" } });
};
assert.equal((await runStagingSmoke(commit.slice(0, 7), mock(commit))).overallStatus, "pass");
assert.equal((await runStagingSmoke(undefined, mock("local-unversioned"))).overallStatus, "blocked");
assert.equal((await runStagingSmoke("b".repeat(7), mock(commit))).overallStatus, "blocked");
assert.equal((await runStagingSmoke(undefined, mock(commit, true))).overallStatus, "blocked");
assert.equal((await runStagingSmoke(undefined, mock(commit, false, false))).overallStatus, "blocked");
await assert.rejects(runStagingSmoke("not-a-revision", mock(commit)));
console.log("Staging permission smoke tests passed: fixed host, revision mismatch, missing route, projection leaks and safe previews. No network or account mutations.");
