import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/layout/ViewportPortal.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const body = {};
const exports: Record<string, (props: { children: unknown }) => unknown> = {};
vm.runInNewContext(compiled, { exports, document: { body }, require: () => ({ createPortal: (child: unknown, target: unknown) => ({ child, target }) }) });
const content = { fixedControl: true };
const result = exports.ViewportPortal({ children: content }) as { child: unknown; target: unknown };
assert.equal(result.child, content);
assert.equal(result.target, body, "Fixed UI must escape transformed route ancestors");
const serverExports: typeof exports = {};
vm.runInNewContext(compiled, { exports: serverExports, require: () => ({ createPortal: () => assert.fail("No DOM on server") }) });
assert.equal(serverExports.ViewportPortal({ children: content }), null);
for (const path of ["../src/pages/ArtworkCollagePage.tsx", "../src/admin/pages/AdminArtworkCollagePage.tsx"]) {
  const page = readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(page, /<ViewportPortal>/);
  assert.match(page, /<\/ViewportPortal>/);
}
console.log("Viewport portal tests passed: body target, SSR safety and public/admin collage integration. Pixel positioning requires browser verification.");
