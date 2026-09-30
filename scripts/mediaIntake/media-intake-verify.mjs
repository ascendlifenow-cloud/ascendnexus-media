import fs from "node:fs/promises";
import path from "node:path";
import { mediaIntakeConfigService } from "../../server/services/mediaIntake/MediaIntakeConfigService.ts";
import { mediaIntakeFolderWatcherService } from "../../server/services/mediaIntake/MediaIntakeFolderWatcherService.ts";
import { mediaIntakeRecordRepository } from "../../server/services/mediaIntake/MediaIntakeRecordRepository.ts";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));

const command = String(args.command ?? "health");
const config = mediaIntakeConfigService.getConfig({
  ...(args.folder ? { intakeFolder: path.resolve(String(args.folder)) } : {}),
  ...(args.archive ? { archiveFolder: path.resolve(String(args.archive)) } : {}),
  ...(args.review ? { reviewFolder: path.resolve(String(args.review)) } : {}),
  ...(args.quarantine ? { quarantineFolder: path.resolve(String(args.quarantine)) } : {}),
  ...(args.failed ? { failedFolder: path.resolve(String(args.failed)) } : {}),
  ...(args.enabled ? { enabled: args.enabled === "true" } : {}),
  ...(args.autoAssign ? { autoAssignEnabled: args.autoAssign === "true" } : {}),
});

if (command === "prepare-folders") {
  for (const folder of [config.intakeFolder, config.archiveFolder, config.reviewFolder, config.quarantineFolder, config.failedFolder]) {
    await fs.mkdir(folder, { recursive: true });
  }
  console.log(JSON.stringify({ success: true, command, folders: {
    intake: config.intakeFolder,
    archive: config.archiveFolder,
    review: config.reviewFolder,
    quarantine: config.quarantineFolder,
    failed: config.failedFolder,
  } }, null, 2));
} else if (command === "scan") {
  for (const folder of [config.intakeFolder, config.archiveFolder, config.reviewFolder, config.quarantineFolder, config.failedFolder]) {
    await fs.mkdir(folder, { recursive: true });
  }
  const result = await mediaIntakeFolderWatcherService.scanNow(config);
  await new Promise((resolve) => setTimeout(resolve, Number(args.waitMs ?? config.stabilityWindowMs + 500)));
  console.log(JSON.stringify({ success: true, command, scan: result, health: await mediaIntakeFolderWatcherService.getHealth(config) }, null, 2));
} else if (command === "records") {
  console.log(JSON.stringify({ success: true, command, intakeRecords: await mediaIntakeRecordRepository.list({ limit: args.limit ? Number(args.limit) : undefined }) }, null, 2));
} else {
  console.log(JSON.stringify({ success: true, command: "health", validation: mediaIntakeConfigService.validate(config), health: await mediaIntakeFolderWatcherService.getHealth(config) }, null, 2));
}
