import { createMediaApiServer } from "../server/index.ts";

const server = createMediaApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

const get = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  const json = await response.json().catch(() => undefined);
  return { response, json };
};

const assertSafe = (payload, label) => {
  const text = JSON.stringify(payload);
  for (const unsafe of ["private/", "signedUrl", "fullSong", "full-song", "full_song", "storagePath", "password", "token=", "signature="]) {
    if (text.includes(unsafe)) throw new Error(`${label} exposed ${unsafe}`);
  }
};

try {
  const search = await get("/api/public/search?q=cosmic&page=1&pageSize=5&type=release&sort=relevance");
  if (!search.response.ok || !search.json?.success) throw new Error(`Search endpoint failed: ${JSON.stringify(search.json)}`);
  if (!search.json.data.groups?.releases || !Array.isArray(search.json.data.results)) throw new Error("Search endpoint did not return grouped production payload.");
  assertSafe(search.json, "search");

  const suggestions = await get("/api/public/search/suggestions?q=co&pageSize=5");
  if (!suggestions.response.ok || !suggestions.json?.success) throw new Error(`Suggestions endpoint failed: ${JSON.stringify(suggestions.json)}`);
  if (!Array.isArray(suggestions.json.data.suggestions)) throw new Error("Suggestions endpoint did not return suggestions.");
  assertSafe(suggestions.json, "suggestions");

  const browse = await get("/api/public/browse?mode=releases&sort=newest&page=1&pageSize=6");
  if (!browse.response.ok || !browse.json?.success) throw new Error(`Browse endpoint failed: ${JSON.stringify(browse.json)}`);
  if (!browse.json.data.catalogs?.genres || !browse.json.data.sections?.releases) throw new Error("Browse endpoint did not return catalogs and mode sections.");
  assertSafe(browse.json, "browse");

  const genres = await get("/api/public/browse?mode=genres");
  if (!genres.response.ok || !genres.json?.success || !Array.isArray(genres.json.data.sections?.genres)) throw new Error("Genre browse mode failed.");
  assertSafe(genres.json, "genres");

  const invalidType = await get("/api/public/search?q=cosmic&type=$where");
  if (invalidType.response.status < 400) throw new Error("Invalid search type was not rejected.");

  const invalidMode = await get("/api/public/browse?mode[$where]=1");
  if (invalidMode.response.status < 400) throw new Error("Unsafe browse query was not rejected.");

  const releases = browse.json.data.releases ?? [];
  let relatedVerified = false;
  if (releases[0]?.slug) {
    const related = await get(`/api/public/discovery/related/releases/${encodeURIComponent(releases[0].slug)}?limit=3`);
    if (!related.response.ok || !related.json?.success) throw new Error(`Related releases endpoint failed: ${JSON.stringify(related.json)}`);
    assertSafe(related.json, "related releases");
    relatedVerified = true;
  }

  console.log(JSON.stringify({
    success: true,
    endpointsVerified: ["search", "suggestions", "browse", "browse:genres", relatedVerified ? "related:releases" : "related:releases:skipped-no-published-release"],
    invalidQueriesRejected: true,
    privateAudioMastersExcluded: true,
    checkedAt: new Date().toISOString(),
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
