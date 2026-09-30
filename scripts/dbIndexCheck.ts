import { databaseIndexService } from "../server/database/DatabaseIndexService";

const report = await databaseIndexService.compareIndexes();
console.log(JSON.stringify({ success: report.status !== "failed" && report.missing.length === 0, data: report }, null, 2));
if (report.status === "failed" || report.missing.length) process.exitCode = 1;
