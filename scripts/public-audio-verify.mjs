import { publicAudioPlaybackVerificationService } from "../server/services/public/PublicAudioPlaybackVerificationService.ts";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));

const releaseId = args.get("releaseId");
const limit = Number(args.get("limit") ?? 10);
const reports = releaseId
  ? [await publicAudioPlaybackVerificationService.buildVerificationReport(releaseId)]
  : await publicAudioPlaybackVerificationService.verifySampleOfPublishedReleases(limit);

const blockingFailures = reports.filter((report) => report.status === "failed");
console.log(JSON.stringify({
  success: blockingFailures.length === 0,
  reports,
  checkedAt: new Date().toISOString(),
}, null, 2));

if (blockingFailures.length) process.exitCode = 1;

