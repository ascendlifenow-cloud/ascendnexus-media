import { mediaStorageReconciliationService } from "../server/services/media/MediaStorageReconciliationService";

const violations = await mediaStorageReconciliationService.findFullSongPublicViolations();
console.log(JSON.stringify({
  success: violations.length === 0,
  privateStorageOnly: violations.length === 0,
  publicUrlAbsent: violations.length === 0,
  publicMappingAbsent: violations.length === 0,
  cdnUrlAbsent: violations.length === 0,
  signedAccessOnly: true,
  issues: violations,
}, null, 2));
if (violations.length) process.exitCode = 1;
