import { mediaTemporaryFileService } from "../server/services/media/MediaTemporaryFileService";

const result = await mediaTemporaryFileService.cleanupAbandonedDirectories();
console.log(JSON.stringify({ success: true, ...result }, null, 2));
