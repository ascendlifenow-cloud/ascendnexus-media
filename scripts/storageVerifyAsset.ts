import { mediaStorageReconciliationService } from "../server/services/media/MediaStorageReconciliationService";

const assetArg = process.argv.find((arg) => arg.startsWith("--assetId="));
const assetId = assetArg?.split("=").slice(1).join("=");
if (!assetId) {
  console.error("Usage: npm run storage:verify -- --assetId=<assetId>");
  process.exit(2);
}
const verification = await mediaStorageReconciliationService.verifyAssetStorage(assetId);
console.log(JSON.stringify({ success: verification.assetFound, verification }, null, 2));
if (!verification.assetFound) process.exitCode = 1;
