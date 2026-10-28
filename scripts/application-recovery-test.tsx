import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ApplicationErrorBoundary, isDeploymentChunkError } from "../src/components/ApplicationErrorBoundary";

assert.equal(isDeploymentChunkError(new Error("Failed to fetch dynamically imported module: https://example.invalid/assets/old.js")), true);
assert.equal(isDeploymentChunkError(new Error("Importing a module script failed.")), true);
assert.equal(isDeploymentChunkError(new Error("Sensitive internal error")), false);
for (const message of ["Failed to fetch dynamically imported module: private/path", "Sensitive internal error"]) {
  const boundary = new ApplicationErrorBoundary({ children: null });
  boundary.state = { error: new Error(message) };
  const html = renderToStaticMarkup(boundary.render());
  assert.match(html, /Reload page/);
  assert.doesNotMatch(html, /private\/path|Sensitive internal error/);
}
console.log("Application recovery: deployment errors, safe fallback rendering and error redaction passed.");
