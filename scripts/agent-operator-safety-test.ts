import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), "anmx-operator-safety-"));
async function failure(script: string, args: string[], env: NodeJS.ProcessEnv) {
  try { await run(process.execPath, ["--import", "tsx", script, ...args], { env, timeout: 15000 }); assert.fail("Unsafe input should fail."); }
  catch (error) {
    const result = error as { code?: number; stdout?: string; stderr?: string };
    assert.equal(result.code, 1);
    assert.doesNotMatch(`${result.stdout ?? ""}${result.stderr ?? ""}`, /SYNTHETIC_CREDENTIAL|SYNTHETIC_VALUE/);
  }
}
try {
  await failure("scripts/verify-private-production-staging.ts", ["--environment=staging"], { ...process.env, MONGODB_URI: "mongodb://audit-user:SYNTHETIC_CREDENTIAL@/db", MONGODB_DATABASE: "anm-staging-test" });
  const file = join(root, "unsafe.json");
  await writeFile(file, "token= SYNTHETIC_VALUE");
  await failure("scripts/report-agent-status.ts", ["--environment=local", `--file=${file}`], { ...process.env, MONGODB_URI: "", NODE_ENV: "test", MEDIA_DATA_ROOT: root });
  console.log("Operator safety passed: malformed connection and report input fail without disclosing credential-shaped text.");
} finally { await rm(root, { recursive: true, force: true }); }
