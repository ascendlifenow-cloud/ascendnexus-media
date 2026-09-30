import { createMediaApiServer } from "../server/index.ts";

const requiredRoutes = ["/", "/artists", "/songs", "/releases", "/gallery", "/about", "/contact", "/privacy", "/terms", "/search", "/browse", "/login", "/register"];
const publicApiPaths = ["/api/public/site", "/api/public/homepage", "/api/public/landing", "/api/public/artists", "/api/public/releases", "/api/public/gallery"];
const forbiddenKeys = [/fullSong/i, /signedUrl/i, /private/i, /storagePath/i, /admin/i, /secret/i, /credential/i];

const failures = [];

const scan = (value, path = "$") => {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (forbiddenKeys.some((pattern) => pattern.test(key))) failures.push(`Unsafe public field present at ${nextPath}`);
    if (typeof child === "string" && (/blob:|file:|localhost|127\.0\.0\.1|signed/i.test(child))) failures.push(`Unsafe public value present at ${nextPath}`);
    scan(child, nextPath);
  }
};

const request = (baseUrl, path) => fetch(`${baseUrl}${path}`, { headers: { accept: "application/json" } });

const server = createMediaApiServer();

const listen = () =>
  new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

let listening = false;

const close = () =>
  new Promise((resolve, reject) => {
    if (!listening) {
      resolve();
      return;
    }
    server.close((error) => (error ? reject(error) : resolve()));
  });

try {
  await listen();
  listening = true;
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  for (const route of requiredRoutes) {
    const response = await request(baseUrl, `/api/public/metadata?path=${encodeURIComponent(route)}`);
    if (!response.ok) failures.push(`Metadata endpoint failed for ${route}: ${response.status}`);
    else {
      const payload = await response.json();
      scan(payload, `metadata:${route}`);
      if (!payload.data?.title || !payload.data?.description) failures.push(`Metadata is missing title/description for ${route}`);
    }
  }

  for (const path of publicApiPaths) {
    const response = await request(baseUrl, path);
    if (!response.ok) failures.push(`Public API failed for ${path}: ${response.status}`);
    else scan(await response.json(), path);
  }

  const site = await (await request(baseUrl, "/api/public/site")).json();
  const navigation = site.data?.navigation;
  if (!Array.isArray(navigation) || navigation.length === 0) failures.push("Published site navigation is empty.");
  const unsafeNav = (navigation ?? []).filter((item) => typeof item.href !== "string" || item.href.startsWith("/admin") || item.href.startsWith("/api"));
  if (unsafeNav.length) failures.push("Published navigation contains unsafe routes.");

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, checkedRoutes: requiredRoutes.length, checkedEndpoints: publicApiPaths.length }, null, 2));
  }
} finally {
  await close();
}
