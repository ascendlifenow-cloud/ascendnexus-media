process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5322";
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

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(port), host, resolve);
  });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const artistSlug = `smoke-release-artist-${suffix}`;
  const artistCreate = await request("/api/admin/artists", {
    method: "POST",
    body: JSON.stringify({
      name: `Smoke Release Artist ${suffix}`,
      displayName: `Smoke Release Artist ${suffix}`,
      slug: artistSlug,
      bio: "Published artist for release CRUD smoke testing.",
      genres: ["Pop"],
      styleTags: ["release-test"],
      externalLinks: { website: "https://example.com" },
    }),
  });
  if (!artistCreate.response.ok || !artistCreate.json.artist?.artistId) throw new Error(`Artist create failed: ${JSON.stringify(artistCreate.json)}`);
  const artistId = artistCreate.json.artist.artistId;
  const artistPublish = await request(`/api/admin/artists/${artistId}/publish`, { method: "POST", body: "{}" });
  if (!artistPublish.response.ok || artistPublish.json.artist.publicationState !== "published") throw new Error(`Artist publish failed: ${JSON.stringify(artistPublish.json)}`);

  const releaseSlug = `smoke-release-${suffix}`;
  const create = await request("/api/admin/releases", {
    method: "POST",
    body: JSON.stringify({
      artistId,
      title: `Smoke Release ${suffix}`,
      slug: releaseSlug,
      description: "A test release draft.",
      lyrics: "Smoke line one\nSmoke line two",
      releaseDate: "2026-07-10",
      genre: "Pop",
      styleTags: ["test", "release"],
      externalLinks: { website: "https://example.com/release" },
      metadata: { fullSongAssetId: `private-full-song-${suffix}` },
    }),
  });
  if (!create.response.ok || !create.json.release?.releaseId) throw new Error(`Release create failed: ${JSON.stringify(create.json)}`);
  const releaseId = create.json.release.releaseId;

  const duplicate = await request("/api/admin/releases", {
    method: "POST",
    body: JSON.stringify({ artistId, title: "Duplicate", slug: releaseSlug, releaseDate: "2026-07-10", genre: "Pop" }),
  });
  if (duplicate.response.status !== 409) throw new Error(`Duplicate release slug was not rejected with 409: ${JSON.stringify(duplicate.json)}`);

  const update = await request(`/api/admin/releases/${releaseId}`, {
    method: "PATCH",
    body: JSON.stringify({ featured: true, featuredPlacement: "homepage", styleTags: ["test", "published"], metadata: { productionNotes: "Smoke update" } }),
  });
  if (!update.response.ok || update.json.release.featured !== true) throw new Error(`Release update failed: ${JSON.stringify(update.json)}`);

  const readiness = await request(`/api/admin/releases/${releaseId}/readiness`);
  if (!readiness.response.ok || readiness.json.readiness.ready !== true) throw new Error(`Release readiness failed: ${JSON.stringify(readiness.json)}`);

  const publish = await request(`/api/admin/releases/${releaseId}/publish`, { method: "POST", body: "{}" });
  if (!publish.response.ok || publish.json.release.publicationState !== "published" || publish.json.release.publicVisibility !== true) {
    throw new Error(`Release publish failed: ${JSON.stringify(publish.json)}`);
  }

  const publicDetail = await fetch(`${base}/api/public/releases/${releaseSlug}`);
  const publicJson = await publicDetail.json();
  if (!publicDetail.ok || publicJson.data?.slug !== releaseSlug) throw new Error(`Published release was not visible publicly: ${JSON.stringify(publicJson)}`);
  const publicPayload = JSON.stringify(publicJson);
  if (publicPayload.includes("fullSong") || publicPayload.includes("private/") || publicPayload.includes("blob:")) {
    throw new Error("Public release payload exposed full-song/private media data.");
  }

  const unpublish = await request(`/api/admin/releases/${releaseId}/unpublish`, { method: "POST", body: "{}" });
  if (!unpublish.response.ok || unpublish.json.release.publicVisibility !== false) throw new Error(`Release unpublish failed: ${JSON.stringify(unpublish.json)}`);
  const hidden = await fetch(`${base}/api/public/releases/${releaseSlug}`);
  if (hidden.status !== 404) throw new Error("Unpublished release should not resolve publicly.");

  const archive = await request(`/api/admin/releases/${releaseId}/archive`, { method: "POST", body: "{}" });
  if (!archive.response.ok || archive.json.release.status !== "archived") throw new Error(`Release archive failed: ${JSON.stringify(archive.json)}`);

  const restore = await request(`/api/admin/releases/${releaseId}/restore`, { method: "POST", body: "{}" });
  if (!restore.response.ok || restore.json.release.status !== "draft" || restore.json.release.publicVisibility !== false) {
    throw new Error(`Release restore failed: ${JSON.stringify(restore.json)}`);
  }

  console.log(JSON.stringify({
    success: true,
    artistId,
    releaseId,
    slug: releaseSlug,
    publishedVisible: true,
    unpublishedHidden: true,
    restoredStatus: restore.json.release.status,
    fullSongPrivate: true,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
