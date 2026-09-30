import { productionCertificationService } from "../server/services/certification/MemberEcosystemCertificationService.ts";

const command = process.argv.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "certify";
const environment = process.argv.find((arg) => arg.startsWith("--environment="))?.split("=")[1] ?? "production";
const result = await productionCertificationService.certify(environment);

const safePrint = (payload) => console.log(JSON.stringify(payload, (key, value) => {
  if (key.toLowerCase().includes("email")) return "[REDACTED]";
  if (typeof value === "string" && /(token=|signature=|x-amz-|private\/|storagePath|privateObjectKey|signedUrl|full[-_]?song|authorizationReference|streamEndpoint|downloadUrl|card|secret)/i.test(value)) return "[REDACTED]";
  return value;
}, 2));

safePrint({ success: command === "launch-gate" ? result.readiness.decision === "approved" : true, command, result });
if (command === "launch-gate") {
  process.exitCode = result.readiness.decision === "approved" ? 0 : 1;
}
