import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import postcss from "postcss";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = postcss.parse(read("src/styles.css"));
let checkedAnimation = false;
css.walkAtRules("keyframes", rule => {
  if (rule.params !== "anmRouteEnter") return;
  checkedAnimation = true;
  rule.walkDecls("opacity", declaration => { assert.ok(Number(declaration.value) >= 0.95, "Paused route animations must not hide loaded content"); });
});
assert.ok(checkedAnimation);
const root = ts.createSourceFile("AppRouter.tsx", read("src/routes/AppRouter.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.ok(!root.statements.some(node => ts.isImportDeclaration(node) && String((node.moduleSpecifier as ts.StringLiteral).text).startsWith("../admin/")), "Admin imports must stay behind the route boundary");

// Check the real component's key across query changes; pathname changes still revalidate.
const exports: Record<string, (props: { children: unknown }) => { key: unknown; props: { children: unknown } }> = {};
let location = { pathname: "/member/songs", search: "?q=first" };
const require = createRequire(import.meta.url);
vm.runInNewContext(ts.transpileModule(read("src/components/layout/RouteTransitionWrapper.tsx"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: (name: string) => name === "react-router-dom" ? { useLocation: () => location } : require(name) });
const child = {};
const first = exports.RouteTransitionWrapper({ children: child });
location = { ...location, search: "?q=second" };
const filtered = exports.RouteTransitionWrapper({ children: child });
assert.equal(first.key, filtered.key, "Filtering must not remount member session/layout state");
assert.equal(filtered.props.children, child);
location = { ...location, pathname: "/member/profile" };
assert.notEqual(exports.RouteTransitionWrapper({ children: child }).key, first.key, "Preserve account revalidation on page changes");
const layout = ts.createSourceFile("AdminLayout.tsx", read("src/admin/layout/AdminLayout.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let localBoundary = false;
const visit = (node: ts.Node) => {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Suspense") {
    localBoundary ||= node.children.some(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText() === "Outlet");
  }
  ts.forEachChild(node, visit);
};
visit(layout);
assert.ok(localBoundary, "Loading a page must not suspend the whole admin shell/session boundary");

type Chunk = { file: string; name?: string; src?: string; imports?: string[]; isDynamicEntry?: boolean };
const manifest = JSON.parse(read("dist/.vite/manifest.json")) as Record<string, Chunk>;
const entry = manifest["index.html"];
assert.ok(entry, "Build the app before running this bundle regression");
const statics = new Set<string>();
const walk = (key: string) => { if (statics.has(key)) return; statics.add(key); assert.ok(manifest[key]); for (const dependency of manifest[key].imports ?? []) walk(dependency); };
walk("index.html");
const admin = Object.entries(manifest).find(([, chunk]) => chunk.name === "AdminAppRoutes");
assert.ok(admin?.[1].isDynamicEntry, "Admin route module must be loaded on demand");
assert.ok(!statics.has(admin[0]), "Guest bootstrap must not preload admin routes");
const adminPages = Object.entries(manifest).filter(([key]) => key.startsWith("src/admin/pages/"));
assert.ok(adminPages.length >= 59);
assert.ok(adminPages.every(([key, chunk]) => chunk.isDynamicEntry && !statics.has(key)), "Admin pages must remain separate deferred entries");
const buffers = [...statics].map(key => readFileSync(new URL(`../dist/${manifest[key].file}`, import.meta.url)));
const entryBytes = readFileSync(new URL(`../dist/${entry.file}`, import.meta.url)).length;
const staticJavaScriptBytes = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
assert.ok(entryBytes < 400_000, "Entry bundle exceeded 400 KB budget");
assert.ok(staticJavaScriptBytes < 700_000, "Bootstrap JavaScript exceeded 700 KB budget");
console.log(JSON.stringify({ passed: true, entryBytes, staticJavaScriptBytes, staticJavaScriptGzipBytes: buffers.reduce((sum, buffer) => sum + gzipSync(buffer).length, 0), deferredAdminPages: adminPages.length, scope: "bundle_and_component_structure_not_signed_in_browser_e2e" }));
