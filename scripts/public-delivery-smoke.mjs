import { createMediaApiServer } from "../server/index.ts";
import { publicContentDeliveryService } from "../server/services/public/PublicContentDeliveryService.ts";
import { publicContentCacheService } from "../server/services/public/PublicContentCacheService.ts";

const server = createMediaApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

const getJson = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  const json = response.status === 304 ? { success: true, data: null } : await response.json();
  return { response, json };
};

try {
  const health = await getJson("/api/public/health");
  if (!health.json.success || health.json.data.status !== "ok") throw new Error("Public health endpoint failed.");

  const artists = await getJson("/api/public/artists?page=1&pageSize=5");
  if (!artists.json.success || !artists.json.data.length) throw new Error("Public artists endpoint returned no artists.");
  if (artists.json.data.some((artist) => artist.status !== "active" || String(artist.profileImage).includes("private"))) throw new Error("Unsafe artist was returned.");
  if (!artists.response.headers.get("etag")) throw new Error("Public artists endpoint did not set ETag.");

  const releases = await getJson("/api/public/releases?page=1&pageSize=20");
  if (!releases.json.success || !releases.json.data.length) throw new Error("Public releases endpoint returned no releases.");
  if (releases.json.data.some((release) => "fullSongUrl" in release || String(release.coverArtUrl).includes("private") || release.status !== "published")) {
    throw new Error("Unsafe release payload was returned.");
  }

  const latest = await getJson("/api/public/releases/latest");
  if (!latest.json.success || !latest.json.data.length) throw new Error("Latest releases endpoint returned no groups.");
  if (latest.json.data.some((group) => group.releases.length > 3)) throw new Error("Latest releases returned more than three per artist.");

  const firstArtist = artists.json.data[0];
  const artistDetail = await getJson(`/api/public/artists/${firstArtist.slug}`);
  if (!artistDetail.json.success || artistDetail.json.data.slug !== firstArtist.slug) throw new Error("Artist detail endpoint failed.");

  const missing = await fetch(`${baseUrl}/api/public/releases/not-a-real-private-slug`);
  if (missing.status !== 404) throw new Error("Missing/private release slug should return public 404.");

  const search = await getJson("/api/public/search?q=cosmic");
  if (!search.json.success || typeof search.json.data.totalResults !== "number") throw new Error("Public search endpoint failed.");

  const metadata = await getJson(`/api/public/metadata?path=${encodeURIComponent(`/artists/${firstArtist.slug}`)}`);
  if (!metadata.json.success || metadata.json.data.noIndex !== false) throw new Error("Public metadata endpoint failed.");

  const cachedBefore = publicContentCacheService.getCacheHealth().entries;
  publicContentDeliveryService.invalidatePublicContentCache(["artists"]);
  const cachedAfter = publicContentCacheService.getCacheHealth().entries;
  if (cachedAfter > cachedBefore) throw new Error("Cache invalidation behaved unexpectedly.");

  console.log(JSON.stringify({
    success: true,
    artistCount: artists.json.data.length,
    releaseCount: releases.json.data.length,
    latestGroups: latest.json.data.length,
    cacheEntriesAfterInvalidation: cachedAfter,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
