import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
for (const [args, values] of [
  [["--environment=production", "--execute-isolated-staging-tests"], { MONGODB_DATABASE: "production", MEDIA_STORAGE_BUCKET: "production" }],
  [["--environment=staging", "--execute-isolated-staging-tests"], { MONGODB_DATABASE: "arbitrary-staging", MEDIA_STORAGE_BUCKET: "arbitrary-staging" }],
  [["--environment=staging", "--cleanup-run=../../other"], { MONGODB_DATABASE: "ascend_nexus_media_staging", MEDIA_STORAGE_BUCKET: "anm-media-staging" }],
] as Array<[string[], Record<string, string>]>) {
  try {
    await run(process.execPath, ["--import", "tsx", "scripts/staging-song-acceptance.ts", ...args], {
      timeout: 5000, env: { ...process.env, ...values, MONGODB_URI: "mongodb://fixture:SYNTHETIC_SECRET@127.0.0.1:1/test", MEDIA_STORAGE_ENDPOINT: "https://unapproved.example.invalid", MEDIA_STORAGE_SECRET_ACCESS_KEY: "SYNTHETIC_SECRET" },
    });
    assert.fail("Unapproved environment must be rejected before connecting.");
  } catch (error) {
    const result = error as { code?: number; stdout?: string; stderr?: string };
    assert.equal(result.code, 1);
    assert.doesNotMatch(`${result.stdout ?? ""}${result.stderr ?? ""}`, /SYNTHETIC_SECRET|ECONNREFUSED|querySrv/);
  }
}
console.log("Staging acceptance safety tests passed: production/unapproved targets rejected before network access, with secrets redacted.");
