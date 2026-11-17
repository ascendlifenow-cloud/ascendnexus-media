import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports: Record<string, any> = {};
const slots: any[] = [];
let cursor = 0;
let starts = 0;
let clears = 0;
let finish!: () => void;
let queue: any[] = [];
const jsx = (type: any, props: any) => ({ type, props });
const player = {
  status: "idle", get queue() { return queue; },
  enqueue(preview: any, release: any) { if (!queue.some(item => item.release.releaseId === release.releaseId)) queue.push({ preview, release }); },
  removeFromQueue(id: string) { queue = queue.filter(item => item.release.releaseId !== id); },
  clearQueue() { clears++; queue = []; },
  playQueued(preview: any, release: any) { starts++; assert.equal(preview.releaseId, "one"); assert.equal(release.releaseId, "one"); return new Promise<void>(resolve => { finish = resolve; }); },
};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/member/components/media/MemberMixActions.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require(name: string) {
  if (name === "react") return {
    useRef: (value: any) => slots[cursor++] ??= { current: value },
    useState: (value: any) => { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], (next: any) => { slots[index] = next; }]; },
  };
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
  if (name.includes("hooks/public")) return { usePublicAudioPlayer: () => player };
  if (name.includes("MemberSongSelection")) return { songActionRelease: (item: any) => ({ releaseId: item.contentId, title: item.title }) };
  return new Proxy({}, { get: (_target, key) => String(key) });
} });
const card = (id: string, streamAvailable = true) => ({ contentType: "release", contentId: id, title: id, streamAvailable });
const items = [card("one"), card("two"), card("one"), card("used-up", false)];
const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const render = (value = items) => { cursor = 0; return nodes(exports.MemberMixActions({ name: "Mix", items: value })); };
const button = (label: string, value = items) => render(value).find(node => node.props?.["aria-label"] === label);
render(); assert.equal(starts, 0); assert.equal(queue.length, 0, "Rendering must not enqueue or authorize");
button("Add Mix to queue").props.onClick(); button("Add Mix to queue").props.onClick();
assert.deepEqual(queue.map(item => item.release.releaseId), ["one", "two"]);
assert.equal(starts, 0, "Appending a mix must never authorize future songs");
player.enqueue({ releaseId: "other", url: "" }, { releaseId: "other" });
button("Remove Mix from queue").props.onClick(); assert.deepEqual(queue.map(item => item.release.releaseId), ["other"]);
button("Play Mix").props.onClick(); button("Play Mix").props.onClick();
assert.equal(clears, 1); assert.equal(starts, 1, "Play mix authorizes only the first song, once");
assert.deepEqual(queue.map(item => item.release.releaseId), ["one", "two"]);
finish(); for (let i = 0; i < 8; i++) await Promise.resolve();
assert.equal(button("Play Mix", [card("used-up", false)]).props.disabled, true);
assert.equal(button("Add Mix to queue", []).props.disabled, true);
assert.ok(!JSON.stringify(queue).includes("streamEndpoint"));
console.log("Member mix actions passed: render/append never authorize, ordered unique playable songs, first-song-only start, repeated-click guard, scoped removal, empty/exhausted states. Mocked controls, not browser playback.");
