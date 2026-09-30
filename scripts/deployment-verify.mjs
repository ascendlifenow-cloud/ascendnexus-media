import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { once } from "node:events";
import { deploymentLaunchChecklistService } from "../server/services/deployment/DeploymentLaunchChecklistService.ts";
import { productionLaunchGateService } from "../server/services/deployment/ProductionLaunchGateService.ts";

const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};
const json = args.includes("--json");
const command = getArg("command") || getArg("mode") || "launch-check";
const environment = getArg("environment") || process.env.APP_ENV || "local";
const target = getArg("target") || process.env.DEPLOYMENT_TARGET_URL || "";

if (environment) process.env.APP_ENV = environment === "local" ? "development" : environment;

const output = (payload) => {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log(`${payload.command}: ${payload.success ? "pass" : "fail"}`);
    if (payload.decision) console.log(`Decision: ${payload.decision}`);
    if (payload.blockingIssues?.length) console.log(`Blocking: ${payload.blockingIssues.join("; ")}`);
    if (payload.warnings?.length) console.log(`Warnings: ${payload.warnings.join("; ")}`);
  }
  process.exitCode = payload.success ? 0 : 1;
};

const isUnsafeProductionTarget = (urlText) => {
  if (!urlText) return true;
  try {
    const url = new URL(urlText);
    return url.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
};

const verifyArtifact = () => {
  const dist = path.join(process.cwd(), "dist");
  const blockers = [];
  const warnings = [];
  if (!fs.existsSync(path.join(dist, "index.html"))) blockers.push("dist/index.html is missing; run the production build first.");
  const files = fs.existsSync(dist) ? fs.readdirSync(dist, { recursive: true }).map(String) : [];
  if (files.some((file) => file.endsWith(".map"))) blockers.push("Production artifact contains source maps.");
  if (files.some((file) => /\.env($|\.)/.test(file))) blockers.push("Production artifact contains env files.");
  if (files.some((file) => /full[-_]?song/i.test(file))) blockers.push("Production artifact contains a full-song named file.");
  if (!process.env.ARTIFACT_DIGEST && !process.env.DEPLOYMENT_ARTIFACT_DIGEST) warnings.push("No ARTIFACT_DIGEST/DEPLOYMENT_ARTIFACT_DIGEST was supplied.");
  return { success: blockers.length === 0, command, blockingIssues: blockers, warnings, checkedAt: new Date().toISOString() };
};

const smokeTest = async () => {
  const blockers = [];
  const warnings = [];
  if (!target) blockers.push("--target is required.");
  if (environment === "production" && isUnsafeProductionTarget(target)) blockers.push("Production smoke target must be a non-local HTTPS URL.");
  if (blockers.length) return { success: false, command, blockingIssues: blockers, warnings, checkedAt: new Date().toISOString() };
  const checks = [];
  for (const route of ["/", "/api/public/health", "/api/public/site", "/api/public/homepage"]) {
    const url = new URL(route, target).toString();
    try {
      const response = await fetch(url, { redirect: "manual" });
      const ok = response.status >= 200 && response.status < 400;
      checks.push({ route, status: response.status, ok });
      if (!ok) blockers.push(`${route} returned ${response.status}.`);
      if (route === "/" && !response.headers.get("content-security-policy")) warnings.push("Root response did not include CSP header.");
    } catch (error) {
      blockers.push(`${route} request failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  return { success: blockers.length === 0, command, target, checks, blockingIssues: blockers, warnings, checkedAt: new Date().toISOString() };
};

const dnsVerify = async () => {
  const hostname = getArg("hostname") || (target ? new URL(target).hostname : "");
  const blockers = [];
  const warnings = [];
  if (!hostname) blockers.push("--hostname or --target is required.");
  if (hostname && ["localhost", "127.0.0.1", "::1"].includes(hostname)) blockers.push("DNS verification refuses local hostnames.");
  if (!blockers.length) {
    try {
      const [addresses, caa] = await Promise.all([dns.lookup(hostname, { all: true }), dns.resolveCaa(hostname).catch(() => [])]);
      if (!addresses.length) blockers.push("No DNS addresses resolved.");
      if (!caa.length) warnings.push("No CAA records were observed by local resolver.");
      return { success: blockers.length === 0, command, hostname, addresses: addresses.map((item) => item.family), caaCount: caa.length, blockingIssues: blockers, warnings, checkedAt: new Date().toISOString() };
    } catch (error) {
      blockers.push(`DNS lookup failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  return { success: false, command, hostname, blockingIssues: blockers, warnings, checkedAt: new Date().toISOString() };
};

const tlsVerify = async () => {
  const hostname = getArg("hostname") || (target ? new URL(target).hostname : "");
  const blockers = [];
  const warnings = [];
  if (!hostname) blockers.push("--hostname or --target is required.");
  if (hostname && ["localhost", "127.0.0.1", "::1"].includes(hostname)) blockers.push("TLS verification refuses local hostnames.");
  if (!blockers.length) {
    const socket = tls.connect({ host: hostname, port: Number(getArg("port") || 443), servername: hostname, rejectUnauthorized: true });
    try {
      await Promise.race([once(socket, "secureConnect"), new Promise((_, reject) => setTimeout(() => reject(new Error("TLS connection timed out.")), 8000))]);
      const cert = socket.getPeerCertificate();
      const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
      if (!validTo || validTo <= new Date()) blockers.push("Certificate is expired or missing validity.");
      socket.end();
      return { success: blockers.length === 0, command, hostname, validTo: validTo?.toISOString(), blockingIssues: blockers, warnings, checkedAt: new Date().toISOString() };
    } catch (error) {
      socket.destroy();
      blockers.push(`TLS verification failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  return { success: false, command, hostname, blockingIssues: blockers, warnings, checkedAt: new Date().toISOString() };
};

const placeholderBlocked = (name, evidenceEnv) => {
  const verified = ["1", "true", "yes", "verified"].includes(String(process.env[evidenceEnv] || "").toLowerCase());
  return {
    success: verified,
    command,
    blockingIssues: verified ? [] : [`${name} requires provider evidence via ${evidenceEnv}=true or a provider-specific verifier.`],
    warnings: [],
    checkedAt: new Date().toISOString(),
  };
};

try {
  if (command === "verify-artifact" || command === "build") output(verifyArtifact());
  else if (command === "smoke-test" || command === "admin-smoke-test" || command === "worker-smoke-test") output(await smokeTest());
  else if (command === "dns-verify") output(await dnsVerify());
  else if (command === "tls-verify") output(await tlsVerify());
  else if (command === "email-domain-verify") output(placeholderBlocked("Email-domain authentication verification", "DEPLOYMENT_EMAIL_DOMAIN_VERIFIED"));
  else if (command === "backup-status") output(placeholderBlocked("Backup status verification", "DEPLOYMENT_BACKUP_VERIFIED"));
  else if (command === "restore-verify") output(placeholderBlocked("Restore verification", "DEPLOYMENT_RESTORE_VERIFIED"));
  else if (command === "rollback") output(placeholderBlocked("Rollback execution", "DEPLOYMENT_ROLLBACK_VERIFIED"));
  else if (command === "health") output({ success: true, command, ...(await deploymentLaunchChecklistService.buildLaunchReport(environment)) });
  else {
    const result = await productionLaunchGateService.evaluate(environment);
    output({ success: result.decision !== "blocked", command, ...result });
  }
} catch (error) {
  output({ success: false, command, blockingIssues: [error instanceof Error ? error.message : "Deployment verification failed."], warnings: [], checkedAt: new Date().toISOString() });
}
