import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const item = { contentId: "song", contentType: "release", title: "Selected Song", href: "/member/songs/selected-song", imageUrl: "/cover.jpg", audioPreviewUrl: "/preview.mp3" };
let selected: typeof item | null = item;
let plays = 0;
const player = { status: "idle", playQueued: (preview: any, release: any) => {
  assert.equal(preview.releaseId, "song"); assert.equal(release.slug, "selected-song"); plays++;
} };
const exports: Record<string, any> = {};
const jsx = (type: any, props: any) => ({ type, props });
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/member/components/media/MemberSongSelection.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, document: { body: {} }, require(name: string) {
  if (name === "react") return { createContext: () => ({ Provider: "SelectionProvider" }), useContext: () => ({ selected, select: (next: typeof item) => { selected = next; } }), useState: () => [selected, (next: typeof item | null) => { selected = next; }], useEffect: () => {} };
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
  if (name === "react-router-dom") return { useLocation: () => ({ pathname: "/member" }) };
  if (name === "react-dom") return { createPortal: (value: any) => value };
  if (name.includes("hooks/public")) return { usePublicAudioPlayer: () => player };
  return new Proxy({}, { get: (_target, key) => String(key) });
} });
const nodes = (root: any) => {
  const result: any[] = [];
  const visit = (node: any) => { if (Array.isArray(node)) return node.forEach(visit); if (node && typeof node === "object") { result.push(node); visit(node.props?.children); } };
  visit(root); return result;
};
const tile = nodes(exports.MemberSongTile({ item }));
assert.equal(tile.filter(node => node.type === "button").length, 1);
assert.equal(tile[0].props["aria-pressed"], true);
assert.ok(tile.some(node => node.type === "CoverArtImage"));
assert.ok(tile.some(node => node.type === "span" && node.props.children === item.title));
let menu = nodes(exports.MemberSongSelectionProvider({ children: null }));
assert.equal(plays, 0, "Selecting a song must not authorize or preload playback");
assert.match(menu.find(node => node.type === "aside").props.className, /fixed bottom-3 left-3/);
menu.find(node => node.props?.["aria-label"] === "Play full song").props.onClick();
assert.equal(plays, 1);
assert.equal(menu.filter(node => node.type === "SongPlaybackActions").length, 1);
menu.find(node => node.props?.["aria-label"] === "Close song actions").props.onClick();
menu = nodes(exports.MemberSongSelectionProvider({ children: null }));
assert.equal(menu.some(node => node.type === "aside"), false);
console.log("Member song selection passed: artwork/title tiles, keyboard-native selection, one shared fixed action menu, no preload, explicit full-song playback and close.");
