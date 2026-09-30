import { spawnSync } from "node:child_process";

const run = (args, env = {}) => spawnSync(process.execPath, ["scripts/run-cached-tsx.mjs", "scripts/configCheck.ts", ...args], {
  encoding: "utf8",
  env: { ...process.env, ...env },
});

const development = run(["--environment=development", "--json"]);
if (development.status !== 0) {
  console.error(development.stdout);
  console.error(development.stderr);
  throw new Error("Development config check should pass with safe defaults.");
}

const production = run(["--environment=production", "--strict", "--json"]);
if (production.status === 0) {
  console.error(production.stdout);
  throw new Error("Production strict config check should fail without injected secrets.");
}

const parsed = JSON.parse(production.stdout);
const requiredCodes = ["DATABASE_URI_REQUIRED", "AUTH_SECRET_WEAK", "STORAGE_PROVIDER_PERSISTENT_REQUIRED"];
const missing = requiredCodes.filter((code) => !parsed.errors.some((issue) => issue.code === code));
if (missing.length) throw new Error(`Expected production errors missing: ${missing.join(", ")}`);
if (/mongodb:\/\/[^"]+:[^"]+@|secret-access|dev-admin-token-value/.test(production.stdout)) {
  throw new Error("Configuration check output appears to contain a secret value.");
}

const productionSeedFallback = run(["--environment=production", "--strict", "--json"], { PUBLIC_API_SEED_FALLBACK_ENABLED: "true" });
const seedFallbackParsed = JSON.parse(productionSeedFallback.stdout);
if (!seedFallbackParsed.errors.some((issue) => issue.code === "PUBLIC_SEED_FALLBACK_FORBIDDEN")) {
  throw new Error("Production seed fallback rejection was not reported.");
}

console.log(JSON.stringify({
  success: true,
  developmentValid: JSON.parse(development.stdout).valid,
  productionStrictValid: parsed.valid,
  productionErrorCount: parsed.errors.length,
  checkedCodes: [...requiredCodes, "PUBLIC_SEED_FALLBACK_FORBIDDEN"],
}, null, 2));
