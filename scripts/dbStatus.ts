import { databaseHealthService } from "../server/database/DatabaseHealthService";

const report = await databaseHealthService.getHealth();
console.log(JSON.stringify({ success: report.status !== "failed", data: report }, null, 2));
