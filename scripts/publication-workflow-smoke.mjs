process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5328";
process.env.MEDIA_API_HOST = process.env.MEDIA_API_HOST || "127.0.0.1";
process.env.MEDIA_ADMIN_DEV_TOKEN = process.env.MEDIA_ADMIN_DEV_TOKEN || "dev-admin-token";

const { createMediaApiServer } = await import("../server/index.ts");

const token = process.env.MEDIA_ADMIN_DEV_TOKEN;
const port = process.env.MEDIA_API_PORT;
const host = process.env.MEDIA_API_HOST;
const base = `http://${host}:${port}`;
const server = createMediaApiServer();

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
};

const publicGet = async (path) => {
  const response = await fetch(`${base}${path}`);
  const json = await response.json().catch(() => ({}));
  return { response, json };
};

const publish = (entityType, entityId, actionType, targetVersion) => request("/api/admin/publication", {
  method: "POST",
  body: JSON.stringify({ entityType, entityId, actionType, options: { metadata: { targetVersion } } }),
});

const assertNoUnsafePublicFields = (payload, label) => {
  const text = JSON.stringify(payload);
  for (const unsafe of ["fullSong", "full-song", "full_song", "private/", "signed", "token=", "signature=", "blob:"]) {
    if (text.includes(unsafe)) throw new Error(`${label} exposed unsafe public data: ${unsafe}`);
  }
};

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(port), host, resolve);
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const artistSlug = `publication-artist-${suffix}`;
  const artistCreate = await request("/api/admin/artists", {
    method: "POST",
    body: JSON.stringify({
      name: `Publication Artist ${suffix}`,
      displayName: `Publication Artist ${suffix}`,
      slug: artistSlug,
      bio: "Artist used for production publication workflow verification.",
      genres: ["Electronic"],
      styleTags: ["publication"],
      externalLinks: { website: "https://example.com/artist" },
    }),
  });
  if (!artistCreate.response.ok || !artistCreate.json.artist?.artistId) throw new Error(`Artist create failed: ${JSON.stringify(artistCreate.json)}`);
  const artistId = artistCreate.json.artist.artistId;

  const artistPublish = await publish("artist", artistId, "publish", `artist-v1-${suffix}`);
  if (!artistPublish.response.ok || !["completed", "completed_with_warnings"].includes(artistPublish.json.publicationOperation?.status)) {
    throw new Error(`Central artist publish failed: ${JSON.stringify(artistPublish.json)}`);
  }
  const artistDuplicate = await publish("artist", artistId, "publish", `artist-v1-${suffix}`);
  if (artistDuplicate.json.publicationOperation?.publicationOperationId !== artistPublish.json.publicationOperation?.publicationOperationId) {
    throw new Error("Publication idempotency did not return the existing artist operation.");
  }
  const publicArtist = await publicGet(`/api/public/artists/${artistSlug}`);
  if (!publicArtist.response.ok || publicArtist.json.data?.slug !== artistSlug) throw new Error(`Published artist was not public: ${JSON.stringify(publicArtist.json)}`);
  assertNoUnsafePublicFields(publicArtist.json, "artist");

  const releaseSlug = `publication-release-${suffix}`;
  const releaseCreate = await request("/api/admin/releases", {
    method: "POST",
    body: JSON.stringify({
      artistId,
      title: `Publication Release ${suffix}`,
      slug: releaseSlug,
      description: "Release used for production publication workflow verification.",
      lyrics: "Publication smoke lyric line.",
      releaseDate: "2026-07-10",
      genre: "Electronic",
      styleTags: ["publication"],
      externalLinks: { website: "https://example.com/release" },
      metadata: { fullSongAssetId: `private-full-song-${suffix}` },
    }),
  });
  if (!releaseCreate.response.ok || !releaseCreate.json.release?.releaseId) throw new Error(`Release create failed: ${JSON.stringify(releaseCreate.json)}`);
  const releaseId = releaseCreate.json.release.releaseId;

  const releasePublish = await publish("release", releaseId, "publish", `release-v1-${suffix}`);
  if (!releasePublish.response.ok || !["completed", "completed_with_warnings"].includes(releasePublish.json.publicationOperation?.status)) {
    throw new Error(`Central release publish failed: ${JSON.stringify(releasePublish.json)}`);
  }
  const publicRelease = await publicGet(`/api/public/releases/${releaseSlug}`);
  if (!publicRelease.response.ok || publicRelease.json.data?.slug !== releaseSlug) throw new Error(`Published release was not public: ${JSON.stringify(publicRelease.json)}`);
  assertNoUnsafePublicFields(publicRelease.json, "release");

  const operations = await request(`/api/admin/publication/operations?entityType=release&entityId=${releaseId}`);
  if (!operations.response.ok || !operations.json.publicationOperations?.length) throw new Error(`Publication operation list failed: ${JSON.stringify(operations.json)}`);

  const health = await request("/api/admin/publication/health");
  if (!health.response.ok || !health.json.health?.status) throw new Error(`Publication health failed: ${JSON.stringify(health.json)}`);

  const locks = await request("/api/admin/publication/locks");
  if (!locks.response.ok || !Array.isArray(locks.json.locks)) throw new Error(`Publication locks failed: ${JSON.stringify(locks.json)}`);

  const releaseUnpublish = await publish("release", releaseId, "unpublish", `release-unpublish-${suffix}`);
  if (!releaseUnpublish.response.ok || !["completed", "completed_with_warnings"].includes(releaseUnpublish.json.publicationOperation?.status)) {
    throw new Error(`Central release unpublish failed: ${JSON.stringify(releaseUnpublish.json)}`);
  }
  const hiddenRelease = await publicGet(`/api/public/releases/${releaseSlug}`);
  if (hiddenRelease.response.status !== 404) throw new Error("Centrally unpublished release still resolved publicly.");

  const recovery = await request("/api/admin/publication/recover-stale", { method: "POST", body: "{}" });
  if (!recovery.response.ok || typeof recovery.json.recovery?.staleOperationsRecovered !== "number") {
    throw new Error(`Publication recovery failed: ${JSON.stringify(recovery.json)}`);
  }

  console.log(JSON.stringify({
    success: true,
    artistId,
    releaseId,
    artistOperationId: artistPublish.json.publicationOperation.publicationOperationId,
    releaseOperationId: releasePublish.json.publicationOperation.publicationOperationId,
    idempotentOperation: artistDuplicate.json.publicationOperation.publicationOperationId,
    publicReleaseVerified: true,
    fullSongPrivate: true,
    health: health.json.health.status,
    staleOperationsRecovered: recovery.json.recovery.staleOperationsRecovered,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
