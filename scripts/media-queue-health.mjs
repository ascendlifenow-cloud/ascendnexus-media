process.env.MEDIA_ADMIN_DEV_TOKEN = process.env.MEDIA_ADMIN_DEV_TOKEN || "dev-admin-token";

const { mediaWorkerHealthService } = await import("../server/services/media/MediaWorkerHealthService.ts");

console.log(JSON.stringify({
  success: true,
  health: await mediaWorkerHealthService.getFullHealthReport(),
}, null, 2));
