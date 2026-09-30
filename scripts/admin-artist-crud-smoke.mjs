process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5321";
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
  const slug = `smoke-artist-${suffix}`;
  const create = await request("/api/admin/artists", {
    method: "POST",
    body: JSON.stringify({
      name: `Smoke Artist ${suffix}`,
      displayName: `Smoke Artist ${suffix}`,
      slug,
      shortBio: "A test artist draft.",
      bio: "A complete artist biography for CRUD smoke testing.",
      genres: ["Pop"],
      styleTags: ["test"],
      externalLinks: { website: "https://example.com" },
      sortOrder: 9000,
    }),
  });
  if (!create.response.ok || !create.json.artist?.artistId) throw new Error(`Artist create failed: ${JSON.stringify(create.json)}`);
  const artistId = create.json.artist.artistId;

  const duplicate = await request("/api/admin/artists", {
    method: "POST",
    body: JSON.stringify({ name: "Duplicate", displayName: "Duplicate", slug, bio: "Duplicate bio." }),
  });
  if (duplicate.response.status !== 409) throw new Error(`Duplicate slug was not rejected with 409: ${JSON.stringify(duplicate.json)}`);

  const update = await request(`/api/admin/artists/${artistId}`, {
    method: "PATCH",
    body: JSON.stringify({ featured: true, styleTags: ["test", "published"], metadata: { visualNotes: "Smoke update" } }),
  });
  if (!update.response.ok || update.json.artist.featured !== true) throw new Error(`Artist update failed: ${JSON.stringify(update.json)}`);

  const readiness = await request(`/api/admin/artists/${artistId}/readiness`);
  if (!readiness.response.ok || readiness.json.readiness.ready !== true) throw new Error(`Artist readiness failed: ${JSON.stringify(readiness.json)}`);

  const publish = await request(`/api/admin/artists/${artistId}/publish`, { method: "POST", body: "{}" });
  if (!publish.response.ok || publish.json.artist.publicationState !== "published" || publish.json.artist.publicVisibility !== true) {
    throw new Error(`Artist publish failed: ${JSON.stringify(publish.json)}`);
  }

  const publicDetail = await fetch(`${base}/api/public/artists/${slug}`);
  const publicJson = await publicDetail.json();
  if (!publicDetail.ok || publicJson.data?.slug !== slug) throw new Error(`Published artist was not visible publicly: ${JSON.stringify(publicJson)}`);
  if (JSON.stringify(publicJson).includes("private/")) throw new Error("Public artist payload exposed a private storage path.");

  const unpublish = await request(`/api/admin/artists/${artistId}/unpublish`, { method: "POST", body: "{}" });
  if (!unpublish.response.ok || unpublish.json.artist.publicVisibility !== false) throw new Error(`Artist unpublish failed: ${JSON.stringify(unpublish.json)}`);
  const hidden = await fetch(`${base}/api/public/artists/${slug}`);
  if (hidden.status !== 404) throw new Error("Unpublished artist should not resolve publicly.");

  const archive = await request(`/api/admin/artists/${artistId}/archive`, { method: "POST", body: "{}" });
  if (!archive.response.ok || archive.json.artist.status !== "archived") throw new Error(`Artist archive failed: ${JSON.stringify(archive.json)}`);

  const restore = await request(`/api/admin/artists/${artistId}/restore`, { method: "POST", body: "{}" });
  if (!restore.response.ok || restore.json.artist.status !== "draft" || restore.json.artist.publicVisibility !== false) {
    throw new Error(`Artist restore failed: ${JSON.stringify(restore.json)}`);
  }

  console.log(JSON.stringify({
    success: true,
    artistId,
    slug,
    publishedVisible: true,
    unpublishedHidden: true,
    restoredStatus: restore.json.artist.status,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
