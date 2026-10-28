import { pathToFileURL } from "node:url";

type Check = { name: string; passed: boolean; status?: number };
const origin = "https://api-staging.ascendnexusmedia.com";
export function projectionSafe(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(projectionSafe);
  if (value && typeof value === "object") return Object.entries(value).every(([key, nested]) =>
    !/^(?:streamUrl|downloadUrl|signedUrl|storagePath|privateObjectKey|passwordHash|authorizationToken|fullSongUrl|fullSongPublicUrl)$/i.test(key) && projectionSafe(nested));
  return typeof value !== "string" || !/(?:https?:\/\/|^\/)[^\s]*(?:\/private\/|[?&](?:x-amz-signature|token|signature)=)/i.test(value);
}

export async function runStagingSmoke(expectedCommit?: string, request: typeof fetch = fetch) {
  if (expectedCommit && !/^[a-f0-9]{7,40}$/i.test(expectedCommit)) throw new Error("Expected commit must be a hexadecimal revision.");
  const checks: Check[] = [];
  async function get(path: string) {
    const response = await request(`${origin}${path}`, { redirect: "error", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(30000), headers: { Accept: "application/json" } });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Expected bounded JSON response.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Missing response.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 2_000_000) throw new Error("Response exceeds safety bound.");
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    return { response, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  }
  const health = await get("/health/ready");
  checks.push({ name: "api_ready", passed: health.response.status === 200 && health.body.data?.ready === true && health.body.data?.environment === "staging", status: health.response.status });
  const commit = health.body.data?.release?.commitSha;
  const validCommit = typeof commit === "string" && /^[a-f0-9]{40}$/i.test(commit);
  checks.push({ name: "deployed_revision_identifiable", passed: validCommit });
  if (expectedCommit) checks.push({ name: "expected_revision_deployed", passed: validCommit && commit.toLowerCase().startsWith(expectedCommit.toLowerCase()) });
  for (const [name, path] of [
    ["song_usage_requires_member", "/api/member/releases/anmx-permission-smoke-nonexistent/usage"],
    ["member_dashboard_requires_member", "/api/member/dashboard"],
    ["admin_members_requires_admin", "/api/admin/members"],
  ]) {
    const result = await get(path);
    checks.push({ name, passed: result.response.status === 401 && result.body.success === false && projectionSafe(result.body), status: result.response.status });
  }
  const publicSongs = await get("/api/public/releases?limit=5");
  checks.push({ name: "sampled_public_release_projection_safe", passed: publicSongs.response.status === 200 && publicSongs.body.success === true && projectionSafe(publicSongs.body), status: publicSongs.response.status });
  return { environment: "staging", checkedAt: new Date().toISOString(), commitSha: validCommit ? commit : "unidentified", overallStatus: checks.every(c => c.passed) ? "pass" : "blocked", checks,
    scope: "anonymous_read_only_sample_not_authenticated_playback_or_full_catalog_certification", accountMutations: false, mediaBytesRequested: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv.includes("--environment=staging")) throw new Error("Explicit staging mode required.");
    const expected = process.argv.find(arg => arg.startsWith("--expected-commit="))?.slice("--expected-commit=".length);
    const report = await runStagingSmoke(expected);
    console.log(JSON.stringify(report));
    if (report.overallStatus !== "pass") process.exitCode = 1;
  } catch { console.error(JSON.stringify({ environment: "staging", overallStatus: "blocked", error: "Safe staging verification could not complete. No response bodies or credentials were printed." })); process.exitCode = 1; }
}
