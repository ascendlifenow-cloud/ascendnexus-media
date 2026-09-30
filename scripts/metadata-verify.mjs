process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5326";
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

const getPublic = async (path) => {
  const response = await fetch(`${base}${path}`);
  const json = await response.json().catch(() => ({}));
  return { response, json };
};

const assertNoUnsafe = (payload, label) => {
  const text = JSON.stringify(payload);
  for (const unsafe of ["private/", "token=", "signature=", "signed", "blob:", "fullSong", "full-song", "fullSongUrl"]) {
    if (text.includes(unsafe)) throw new Error(`${label} exposed unsafe metadata value: ${unsafe}`);
  }
};

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(port), host, resolve);
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const title = `Metadata Smoke ${suffix}`;
  const create = await request("/api/admin/metadata", {
    method: "POST",
    body: JSON.stringify({
      entityType: "about",
      path: "/about",
      title,
      description: "Production metadata smoke verification for the About page.",
      imageUrl: "https://example.com/metadata-social.jpg",
      imageAlt: "Metadata smoke social card",
      robots: "index, follow",
      openGraph: { type: "website" },
      twitterCard: { card: "summary_large_image" },
      structuredData: { "@context": "https://schema.org", "@type": "AboutPage", name: title, url: "https://ascendnexusmedia.com/about" },
    }),
  });
  if (!create.response.ok || !create.json.seo?.seoMetadataId) throw new Error(`Metadata create failed: ${JSON.stringify(create.json)}`);
  const seoMetadataId = create.json.seo.seoMetadataId;
  const listed = await request("/api/admin/metadata");
  if (!listed.response.ok || !listed.json.seo?.some((item) => item.seoMetadataId === seoMetadataId)) {
    throw new Error(`Created metadata was not listed: ${seoMetadataId} ${JSON.stringify(listed.json)}`);
  }

  const privateImage = await request("/api/admin/metadata", {
    method: "POST",
    body: JSON.stringify({
      entityType: "about",
      path: "/about-private",
      title: "Private Image Metadata",
      description: "This should be blocked because the image is private.",
      imageUrl: "/uploads/media/private/social.jpg?token=secret",
    }),
  });
  if (privateImage.response.ok) throw new Error("Private/signed metadata image was accepted.");

  const readiness = await request(`/api/admin/metadata/${seoMetadataId}/readiness`);
  if (!readiness.response.ok || readiness.json.readiness?.ready !== true) throw new Error(`Metadata readiness failed: ${JSON.stringify(readiness.json)}`);

  const publish = await request(`/api/admin/metadata/${seoMetadataId}/publish`, { method: "POST", body: "{}" });
  if (!publish.response.ok || publish.json.metadata?.status !== "published") throw new Error(`Metadata publish failed: ${JSON.stringify(publish.json)}`);

  const about = await getPublic(`/api/public/metadata?path=${encodeURIComponent("/about")}`);
  if (!about.response.ok || !String(about.json.data?.title ?? "").startsWith(`${title} | `)) throw new Error(`Public metadata did not resolve published override: ${JSON.stringify(about.json)}`);
  if (!about.json.data?.canonicalUrl?.endsWith("/about")) throw new Error(`Canonical URL was not resolved for /about: ${JSON.stringify(about.json.data)}`);
  if (about.json.data?.openGraph?.image !== "https://example.com/metadata-social.jpg") throw new Error("Open Graph image did not resolve.");
  if (!about.json.data?.twitterCard?.card) throw new Error("Twitter card metadata missing.");
  if (!about.json.data?.structuredData) throw new Error("Structured data missing from public metadata.");
  assertNoUnsafe(about.json, "Public /about metadata");

  const search = await getPublic(`/api/public/metadata?path=${encodeURIComponent("/search")}`);
  if (!search.response.ok || search.json.data?.noIndex !== true || !String(search.json.data?.robots).includes("noindex")) {
    throw new Error(`Search route robots policy failed: ${JSON.stringify(search.json)}`);
  }

  const privatePath = await getPublic(`/api/public/metadata?path=${encodeURIComponent("/admin/metadata")}`);
  if (privatePath.response.ok) throw new Error("Admin path metadata should not resolve publicly.");

  const releases = await getPublic("/api/public/releases");
  const firstRelease = releases.json.data?.[0];
  if (firstRelease?.slug) {
    const releaseMetadata = await getPublic(`/api/public/metadata?path=${encodeURIComponent(`/songs/${firstRelease.slug}`)}`);
    if (releaseMetadata.response.ok) assertNoUnsafe(releaseMetadata.json, "Public release metadata");
  }

  console.log(JSON.stringify({
    success: true,
    metadataId: seoMetadataId,
    privateImageBlocked: true,
    aboutPublished: true,
    canonicalVerified: true,
    searchNoIndex: true,
    adminPathRejected: true,
    publicSafePayloads: true,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
