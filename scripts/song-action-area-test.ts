import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports: Record<string, any> = {};
let memberArea: object | null = null;
const jsx = (type: any, props: any) => ({ type, props });
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/components/songs/SongPlaybackActions.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require(name: string) {
  if (name === "react") return { useContext: () => memberArea };
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
  if (name.includes("hooks/public")) return { usePublicAudioPlayer: () => ({ playbackMode: "preview", isActive: () => false }) };
  if (name.includes("utils/format")) return { cx: (...values: any[]) => values.filter(Boolean).join(" ") };
  return new Proxy({}, { get: (_target, key) => String(key) });
} });
const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const render = () => nodes(exports.SongPlaybackActions({ release: { releaseId: "song", title: "Song", slug: "song", audioPreviewUrl: "/preview.wav" } }));
for (const area of ["guest public", "signed-in public", "admin preview"]) {
  memberArea = null;
  const controls = render();
  assert.equal(controls.some(node => node.type === "AddReleaseToPlaylistButton"), false, `${area} must not show playlist actions`);
  assert.ok(controls.some(node => node.props?.["aria-label"] === "Add to streaming queue"));
  assert.ok(controls.some(node => node.props?.["aria-label"] === "Play 30 second preview of Song"));
}
memberArea = { session: { member: { memberId: "member" } } };
assert.equal(render().filter(node => node.type === "AddReleaseToPlaylistButton").length, 1);
console.log("Song action area tests passed: playlist action requires member-area context; public/admin actions preserve preview and queue controls.");
