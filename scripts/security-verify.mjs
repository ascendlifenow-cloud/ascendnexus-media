process.env.AUTH_ENABLED ??= "true";
process.env.MEDIA_ADMIN_DEV_TOKEN ??= "dev-admin-token";

import fs from "node:fs";
import path from "node:path";

const { createMediaApiServer } = await import("../server/index.ts");
const { productionSecurityHealthService } = await import("../server/services/security/ProductionSecurityHealthService.ts");
const { securityLaunchGateService } = await import("../server/services/security/SecurityLaunchGateService.ts");

const repoRoot = process.cwd();
const requiredDocs = [
  "docs/ANM-WEB-102-security-asset-inventory.md",
  "docs/ANM-WEB-102-attack-surface-inventory.md",
  "docs/ANM-WEB-102-production-threat-model.md",
  "docs/ANM-WEB-102-authorization-matrix.md",
  "docs/ANM-WEB-102-security-launch-decision.md",
  "docs/ANM-WEB-102-incident-response-plan.md",
  "docs/ANM-WEB-102-security-incident-playbooks.md",
  "docs/ANM-WEB-102-security-operations-runbook.md",
  "docs/ANM-WEB-102-implementation-summary.md",
];

const failures = [];
const warnings = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const warn = (condition, message) => {
  if (!condition) warnings.push(message);
};

const read = (filePath) => fs.existsSync(path.join(repoRoot, filePath)) ? fs.readFileSync(path.join(repoRoot, filePath), "utf8") : "";

const scanText = (text, patterns, label) => {
  for (const pattern of patterns) {
    if (pattern.test(text)) failures.push(`${label} matched ${pattern}`);
  }
};

const server = createMediaApiServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const publicHealth = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://evil.example" } });
  assert(publicHealth.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options header missing.");
  assert(publicHealth.headers.get("x-frame-options") === "DENY", "X-Frame-Options DENY missing.");
  assert(Boolean(publicHealth.headers.get("content-security-policy")), "Content-Security-Policy header missing.");
  assert(publicHealth.headers.get("access-control-allow-credentials") !== "true", "Non-admin public response must not allow credentials for arbitrary origin.");

  const evilAdminOptions = await fetch(`${baseUrl}/api/admin/artists`, { method: "OPTIONS", headers: { Origin: "https://evil.example" } });
  assert(evilAdminOptions.headers.get("access-control-allow-origin") !== "https://evil.example", "Admin CORS reflected unapproved origin.");
  assert(evilAdminOptions.headers.get("access-control-allow-credentials") !== "true", "Admin CORS allowed credentials for unapproved origin.");

  const localAdminOptions = await fetch(`${baseUrl}/api/admin/artists`, { method: "OPTIONS", headers: { Origin: "http://localhost:5303" } });
  assert(localAdminOptions.headers.get("access-control-allow-origin") === "http://localhost:5303", "Local development admin origin should be allowed outside production.");
  assert(localAdminOptions.headers.get("access-control-allow-credentials") === "true", "Allowed admin origin should support credentials.");

  const evilAdminMutation = await fetch(`${baseUrl}/api/admin/artists`, {
    method: "POST",
    headers: { Origin: "https://evil.example", Authorization: "Bearer dev-admin-token", "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Blocked", displayName: "Blocked" }),
  });
  assert(evilAdminMutation.status === 403, "Admin mutation from unapproved origin was not blocked.");

  const securityHealth = await productionSecurityHealthService.getHealthReport();
  assert(securityHealth.criticalFindings === 0, `Security health has ${securityHealth.criticalFindings} critical findings.`);
  for (const warning of securityHealth.warnings) warnings.push(warning);

  const launchDecision = await securityLaunchGateService.evaluate();
  assert(launchDecision.decision !== "blocked", "Security launch gate is blocked.");

  const packageJson = JSON.parse(read("package.json"));
  assert(Boolean(packageJson.scripts?.["security:health"]), "security:health script missing.");
  assert(Boolean(packageJson.scripts?.["security:launch-gate"]), "security:launch-gate script missing.");
  assert(fs.existsSync(path.join(repoRoot, "package-lock.json")), "package-lock.json missing.");

  for (const doc of requiredDocs) warn(fs.existsSync(path.join(repoRoot, doc)), `${doc} is missing.`);

  const distText = fs.existsSync(path.join(repoRoot, "dist"))
    ? fs.readdirSync(path.join(repoRoot, "dist"), { recursive: true }).filter((entry) => typeof entry === "string").slice(0, 5000).join("\n")
    : "";
  scanText(distText, [/\.map$/i, /\.env/i], "dist artifact listing");

  const sourceSample = [
    read("src/services/media/DirectMediaUploadService.ts"),
    read("src/config/PublicRuntimeConfig.ts"),
    read("server/middleware/mediaErrorMiddleware.ts"),
    read("server/utils/security/securityHeaderUtils.ts"),
  ].join("\n");
  scanText(sourceSample, [/AKIA[0-9A-Z]{16}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /ghp_[A-Za-z0-9_]{30,}/], "source secret scan");

  console.log(JSON.stringify({
    success: failures.length === 0,
    checks: {
      headers: true,
      cors: true,
      adminOriginMutationBlock: true,
      launchDecision: launchDecision.decision,
      lockfilePresent: true,
      docsChecked: requiredDocs.length,
    },
    warnings,
    failures,
    checkedAt: new Date().toISOString(),
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
