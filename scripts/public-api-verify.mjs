import { createMediaApiServer } from "../server/index.ts";
import { publicContentCacheService } from "../server/services/public/PublicContentCacheService.ts";
import { publicDeliveryVerificationService } from "../server/services/public/PublicDeliveryVerificationService.ts";

const server = createMediaApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

const get = async (path, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const json = response.status === 304 ? undefined : await response.json().catch(() => undefined);
  return { response, json };
};

const assertSafe = (payload, label) => {
  const text = JSON.stringify(payload);
  for (const unsafe of ["private/", "signedUrl", "fullSong", "full-song", "full_song", "storagePath", "password", "token=", "signature="]) {
    if (text.includes(unsafe)) throw new Error(`${label} exposed ${unsafe}`);
  }
};

try {
  const report = await publicDeliveryVerificationService.buildFullReport();
  if (!report.success) throw new Error(`Public delivery safety report failed: ${JSON.stringify(report)}`);

  const site = await get("/api/public/site");
  if (!site.response.ok || !site.json?.success) throw new Error(`Site endpoint failed: ${JSON.stringify(site.json)}`);
  assertSafe(site.json, "site");

  const homepage = await get("/api/public/homepage");
  if (!homepage.response.ok || !homepage.json?.success) throw new Error(`Homepage endpoint failed: ${JSON.stringify(homepage.json)}`);
  assertSafe(homepage.json, "homepage");

  const artists = await get("/api/public/artists?page=1&pageSize=5&sort=sortOrder");
  if (!artists.response.ok || !artists.response.headers.get("etag")) throw new Error("Artists endpoint failed or missed ETag.");
  assertSafe(artists.json, "artists");
  const etag = artists.response.headers.get("etag");
  const artists304 = await get("/api/public/artists?page=1&pageSize=5&sort=sortOrder", { "If-None-Match": etag });
  if (artists304.response.status !== 304) throw new Error("Artists endpoint did not return 304 for matching ETag.");

  const oversized = await get("/api/public/artists?page=1&pageSize=1000");
  if (oversized.response.status !== 400) throw new Error("Oversized page size was not rejected.");

  const invalidSort = await get("/api/public/releases?sort=$where");
  if (invalidSort.response.status !== 400) throw new Error("Invalid sort was not rejected.");

  const releases = await get("/api/public/releases?page=1&pageSize=10&sort=releaseDate");
  if (!releases.response.ok || !releases.json?.success) throw new Error(`Releases endpoint failed: ${JSON.stringify(releases.json)}`);
  assertSafe(releases.json, "releases");

  const latest = await get("/api/public/releases/latest");
  if (!latest.response.ok || !latest.json?.success || latest.json.data.some((group) => group.releases?.length > 3)) {
    throw new Error(`Latest releases endpoint failed: ${JSON.stringify(latest.json)}`);
  }
  assertSafe(latest.json, "latest");

  const gallery = await get("/api/public/gallery?page=1&pageSize=10&sort=sortOrder");
  if (!gallery.response.ok || !gallery.json?.success) throw new Error(`Gallery endpoint failed: ${JSON.stringify(gallery.json)}`);
  assertSafe(gallery.json, "gallery");

  const metadata = await get("/api/public/metadata/path?path=%2F");
  if (!metadata.response.ok || !metadata.json?.success) throw new Error(`Metadata endpoint failed: ${JSON.stringify(metadata.json)}`);
  assertSafe(metadata.json, "metadata");

  const invalidMetadata = await get("/api/public/metadata/path?path=%2Fadmin");
  if (invalidMetadata.response.status !== 404 && invalidMetadata.response.status !== 400) throw new Error("Admin metadata path was not rejected.");

  const cacheStatus = publicContentCacheService.getCacheHealth();
  if (cacheStatus.entries < 1 || cacheStatus.misses < 1) throw new Error(`Cache did not record endpoint activity: ${JSON.stringify(cacheStatus)}`);

  console.log(JSON.stringify({
    success: true,
    endpointsVerified: ["site", "homepage", "artists", "releases", "latest", "gallery", "metadata"],
    etag304: true,
    invalidQueriesRejected: true,
    cache: cacheStatus,
    report,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
