process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5324";
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
  const slug = `smoke-gallery-${suffix}`;
  const create = await request("/api/admin/gallery", {
    method: "POST",
    body: JSON.stringify({
      title: `Smoke Gallery ${suffix}`,
      slug,
      sourceType: "custom",
      sourceId: `smoke-source-${suffix}`,
      mediaType: "image",
      description: "A production gallery CRUD smoke item.",
      imageUrl: "/uploads/media/public/gallery/smoke-image.jpg",
      thumbnailUrl: "/uploads/media/public/gallery/smoke-thumb.jpg",
      altText: "Smoke gallery visual",
      sortOrder: 9000,
      metadata: { credit: "Smoke Test" },
    }),
  });
  if (!create.response.ok || !create.json.galleryItem?.galleryItemId) throw new Error(`Gallery create failed: ${JSON.stringify(create.json)}`);
  const galleryItemId = create.json.galleryItem.galleryItemId;

  const duplicate = await request("/api/admin/gallery", {
    method: "POST",
    body: JSON.stringify({
      title: "Duplicate Gallery",
      slug,
      sourceType: "custom",
      sourceId: `duplicate-${suffix}`,
      mediaType: "image",
    }),
  });
  if (duplicate.response.status !== 409) throw new Error(`Duplicate gallery slug was not rejected with 409: ${JSON.stringify(duplicate.json)}`);

  const update = await request(`/api/admin/gallery/${galleryItemId}`, {
    method: "PATCH",
    body: JSON.stringify({
      description: "Updated gallery smoke item.",
      sortOrder: 9001,
      metadata: { caption: "Updated caption", credit: "Smoke Test" },
    }),
  });
  if (!update.response.ok || update.json.galleryItem.description !== "Updated gallery smoke item.") throw new Error(`Gallery update failed: ${JSON.stringify(update.json)}`);

  const readiness = await request(`/api/admin/gallery/${galleryItemId}/readiness`);
  if (!readiness.response.ok || readiness.json.readiness.ready !== true) throw new Error(`Gallery readiness failed: ${JSON.stringify(readiness.json)}`);

  const publish = await request(`/api/admin/gallery/${galleryItemId}/publish`, { method: "POST", body: "{}" });
  if (!publish.response.ok || publish.json.galleryItem.status !== "published" || publish.json.galleryItem.metadata?.publicVisibility !== true) {
    throw new Error(`Gallery publish failed: ${JSON.stringify(publish.json)}`);
  }

  const publicDetail = await fetch(`${base}/api/public/gallery/${slug}`);
  const publicJson = await publicDetail.json();
  if (!publicDetail.ok || publicJson.data?.slug !== slug) throw new Error(`Published gallery item was not visible publicly: ${JSON.stringify(publicJson)}`);
  const publicPayload = JSON.stringify(publicJson);
  if (publicPayload.includes("private/") || publicPayload.includes("signed") || publicPayload.includes("token=")) {
    throw new Error("Public gallery payload exposed private or signed media data.");
  }

  const list = await request("/api/admin/gallery");
  if (!list.response.ok || !Array.isArray(list.json.galleryItems)) throw new Error(`Gallery list failed: ${JSON.stringify(list.json)}`);
  const firstTwo = list.json.galleryItems.slice(0, 2).map((item, index) => ({ galleryItemId: item.galleryItemId, sortOrder: index + 1 }));
  if (firstTwo.length) {
    const reorder = await request("/api/admin/gallery/reorder", { method: "POST", body: JSON.stringify({ items: firstTwo }) });
    if (!reorder.response.ok) throw new Error(`Gallery reorder failed: ${JSON.stringify(reorder.json)}`);
  }

  const unpublish = await request(`/api/admin/gallery/${galleryItemId}/unpublish`, { method: "POST", body: "{}" });
  if (!unpublish.response.ok || unpublish.json.galleryItem.metadata?.publicVisibility !== false) throw new Error(`Gallery unpublish failed: ${JSON.stringify(unpublish.json)}`);
  const hidden = await fetch(`${base}/api/public/gallery/${slug}`);
  if (hidden.status !== 404) throw new Error("Unpublished gallery item should not resolve publicly.");

  const archive = await request(`/api/admin/gallery/${galleryItemId}/archive`, { method: "POST", body: "{}" });
  if (!archive.response.ok || archive.json.galleryItem.status !== "archived") throw new Error(`Gallery archive failed: ${JSON.stringify(archive.json)}`);

  const restore = await request(`/api/admin/gallery/${galleryItemId}/restore`, { method: "POST", body: "{}" });
  if (!restore.response.ok || restore.json.galleryItem.status !== "draft" || restore.json.galleryItem.metadata?.publicVisibility !== false) {
    throw new Error(`Gallery restore failed: ${JSON.stringify(restore.json)}`);
  }

  console.log(JSON.stringify({
    success: true,
    galleryItemId,
    slug,
    publishedVisible: true,
    unpublishedHidden: true,
    restoredStatus: restore.json.galleryItem.status,
    privateMediaExcluded: true,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
