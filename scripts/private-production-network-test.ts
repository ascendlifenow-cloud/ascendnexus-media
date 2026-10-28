import assert from "node:assert/strict";
import { createServer } from "vite";
import { createMediaApiServer } from "../server/index";
import { writeFile } from "node:fs/promises";
import { mediaBackendConfig } from "../server/config/mediaBackendConfig";

const api = createMediaApiServer();
await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
const address = api.address();
if (!address || typeof address === "string") throw new Error("API address unavailable");
const base = `http://127.0.0.1:${address.port}`;
const web = await createServer({ server: { host: "127.0.0.1", port: 0, strictPort: false, open: false }, logLevel: "silent" });
try {
  await web.listen();
  const webAddress = web.httpServer!.address();
  if (!webAddress || typeof webAddress === "string") throw new Error("Web address unavailable");
  const results: Record<string, number> = {};
  const previewPath = "/api/admin/releases/anmx-release-the-spare-key-choir/production-preview";
  const unauthorized = await fetch(`${base}${previewPath}`);
  assert.equal(unauthorized.status, 401);
  results.unauthenticatedPreview = unauthorized.status;
  const preview = await fetch(`${base}${previewPath}`, { headers: { "X-Admin-Dev-Token": mediaBackendConfig.devAdminToken } });
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("cache-control"), "private, no-store");
  const previewBody = await preview.json();
  assert.equal(previewBody.data.approval.publicActionsAllowed, false);
  results.authenticatedPreview = preview.status;
  for (const action of ["publish", "production-approve"]) {
    const response = await fetch(`${base}/api/admin/releases/anmx-release-the-spare-key-choir/${action}`, { method: "POST", headers: { "X-Admin-Dev-Token": mediaBackendConfig.devAdminToken, "Content-Type": "application/json" }, body: JSON.stringify({ bundleHash: previewBody.data.bundleHash }) });
    assert.equal(response.status, action === "production-approve" ? 401 : 403);
    results[action] = response.status;
  }
  for (const route of ["/api/public/songs/the-spare-key-choir", "/api/public/releases/the-spare-key-choir"]) {
    const response = await fetch(`${base}${route}`);
    results[route] = response.status;
    assert.equal(response.status, 404);
  }
  for (const route of ["/production/anmx-002/lyrics.txt", "/production/anmx-002/cover-v1.png", "/production/anmx-002/review.html", "/server/data/media-db.json"]) {
    const response = await fetch(`http://127.0.0.1:${webAddress.port}${route}`);
    results[route] = response.status;
    assert.ok([403, 404].includes(response.status), `${route} was exposed: ${response.status}`);
  }
  await writeFile("production/anmx-002/network-validation.json", JSON.stringify({ passed: true, results, checkedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ passed: true, results }));
} finally {
  await web.close();
  await new Promise<void>((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
}
