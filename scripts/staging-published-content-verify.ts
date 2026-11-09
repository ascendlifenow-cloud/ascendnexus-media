import { MongoClient } from "mongodb";
import { parseReleasePublicationTargets } from "../server/utils/publication/releasePublicationTargets";

if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "") || !process.env.MONGODB_URI) throw new Error("Explicit staging configuration required.");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const base = "https://api-staging.ascendnexusmedia.com";
try {
  const db = (await client.connect()).db(process.env.MONGODB_DATABASE);
  const releases = (await db.collection("song_releases").find({ status: "published", publicationState: "published" }).toArray()).filter(item => !item.deletedAt);
  const artists = await db.collection("artists").find({ status: "active", publicationState: "published", publicVisibility: true }).toArray();
  const publicArtists = new Set(artists.filter(item => !item.deletedAt).map(item => item.artistId));
  const expected = releases.filter(item => publicArtists.has(item.artistId) && item.publicVisibility === true && parseReleasePublicationTargets(item.metadata)?.audience === "public");
  const expectedIds = new Set(expected.map(item => item.releaseId));
  const get = async (path: string) => {
    const response = await fetch(base + path, { cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Staging content endpoint unavailable.");
    const payload = await response.json();
    if (!payload.success) throw new Error("Staging content endpoint rejected the request.");
    return payload;
  };
  const publicRows: Array<{ releaseId: string; coverArtUrl?: string; audioPreviewUrl?: string }> = [];
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    const payload = await get(`/api/public/releases?page=${page}&pageSize=48`);
    if (!Array.isArray(payload.data)) throw new Error("Invalid staging catalog response.");
    publicRows.push(...payload.data);
    pages = payload.meta?.pagination?.totalPages ?? 1;
    if (!Number.isSafeInteger(pages) || pages < 1 || pages > 100) throw new Error("Unbounded staging pagination.");
  }
  const actualIds = new Set(publicRows.map(item => item.releaseId));
  const catalogMatches = expectedIds.size === actualIds.size && [...expectedIds].every(id => actualIds.has(id)) && actualIds.size === publicRows.length;
  const landing = (await get("/api/public/landing")).data;
  const latest = landing.latestReleases ?? [];
  const landingSafe = latest.every((card: { release: { releaseId: string } }) => expected.some(item => item.releaseId === card.release.releaseId && parseReleasePublicationTargets(item.metadata)?.homepage && parseReleasePublicationTargets(item.metadata)?.newReleases));
  const images = [...new Set(publicRows.map(item => item.coverArtUrl).filter((url): url is string => Boolean(url)))].slice(0, 6);
  const imageResults: number[] = [];
  for (const value of images) {
    const url = new URL(value, "https://staging.ascendnexusmedia.com");
    if (url.protocol !== "https:" || !["staging-media.ascendnexusmedia.com", "staging.ascendnexusmedia.com"].includes(url.hostname)) { imageResults.push(0); continue; }
    const response = await fetch(url, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15000) });
    imageResults.push(response.status === 200 && response.headers.get("content-type")?.startsWith("image/") ? 200 : response.status === 200 ? 0 : response.status);
  }
  const result = { environment: "staging", mode: "read_only", publishedReleases: releases.length, expectedGuestReleases: expectedIds.size, actualGuestReleases: actualIds.size,
    catalogMatches, restrictedOrArtistIneligibleReleases: releases.length - expectedIds.size, landingLatestCount: latest.length, landingPlacementSafe: landingSafe,
    coversPresent: publicRows.filter(item => item.coverArtUrl).length, previewsPresent: publicRows.filter(item => item.audioPreviewUrl).length,
    sampledImageStatuses: imageResults, checkedAt: new Date().toISOString(), memberApiVerified: false, fullPlaybackVerified: false, databaseMutated: false };
  console.log(JSON.stringify(result));
  if (!catalogMatches || !landingSafe || imageResults.some(status => status !== 200)) process.exitCode = 1;
} catch {
  console.error(JSON.stringify({ environment: "staging", overallStatus: "blocked", error: "Published content verification failed safely; no URLs or member data printed.", databaseMutated: false }));
  process.exitCode = 1;
} finally { await client.close(); }
