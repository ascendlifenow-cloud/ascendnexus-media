import { databaseIntegrityService } from "../server/database/DatabaseIntegrityService";

const report = await databaseIntegrityService.buildIntegrityReport();
console.log(JSON.stringify({ success: report.status === "healthy", data: report }, null, 2));
if (report.status !== "healthy") process.exitCode = 1;
