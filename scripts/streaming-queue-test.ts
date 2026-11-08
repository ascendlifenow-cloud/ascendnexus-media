import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual provider callbacks with deterministic hooks, media and timers.
// This does not simulate browser decoding or replace an integration browser test.
const source = readFileSync(new URL("../src/providers/PublicAudioPlayerProvider.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replaceAll("import.meta.env", "({ VITE_API_URL: '' })"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  let cursor = 0;
  const slots: any[] = [];
  const effects: Array<() => void> = [];
  const listeners = new Map<string, () => void>();
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0;
  const calls = { authorize: 0, refresh: 0, usage: 0 };
  let sessionStatus = 200;
  let usageAllowed = true;
  let refreshFails = false;
  let autoPlay = true;
  let usageCounts: { streamStarts: number; remainingFullPlays: number | null } = { streamStarts: 7, remainingFullPlays: 0 };
  let resolveUsage: (() => Promise<any>) | undefined;
  let authorization: any = { authorized: true, streamEndpoint: "/api/member/media/stream/protected-auth-id.token", expiresAt: new Date(Date.now() + 90000).toISOString(), refreshAllowed: true, playbackSessionId: "session" };
  let resolveAuthorization: (() => Promise<any>) | undefined;
  class Audio {
    src = ""; preload = ""; crossOrigin = ""; duration = 90; currentTime = 0;
    buffered = { length: 0 }; error = null;
    handlers = new Map<string, () => void>();
    pause() {} load() {} async play() { if (autoPlay) this.handlers.get("playing")?.(); }
    removeAttribute() { this.src = ""; }
    addEventListener(name: string, fn: () => void) { this.handlers.set(name, fn); }
  }
  let audio: Audio;
  const memo = (factory: () => any, deps: any[]) => {
    const index = cursor++;
    if (!slots[index] || deps.some((dep, i) => dep !== slots[index].deps[i])) slots[index] = { value: factory(), deps };
    return slots[index].value;
  };
  const react = {
    useRef(value: any) { const index = cursor++; return slots[index] ??= { current: value }; },
    useState(value: any) { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], (next: any) => { slots[index] = next; }]; },
    useMemo: memo,
    useCallback(fn: any, deps: any[]) { return memo(() => fn, deps); },
    useEffect(fn: any, deps: any[]) { memo(() => { effects.push(fn); }, deps); },
  };
  const service = {
    async authorizeReleaseStream() { calls.authorize++; return resolveAuthorization ? resolveAuthorization() : authorization; },
    async refreshStream() { calls.refresh++; if (refreshFails) throw new Error("revoked"); return { expiresAt: new Date(Date.now() + 90000).toISOString() }; },
    async songUsage() { calls.usage++; return resolveUsage ? resolveUsage() : { canContinue: usageAllowed, ...usageCounts }; },
    async playbackState() {},
  };
  const exports: any = {};
  const context = vm.createContext({ exports, Date, DOMException, AbortSignal, navigator: {},
    Audio: function () { audio = new Audio(); return audio; },
    setTimeout(callback: () => void, delay: number) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id: number) { timers.delete(id); },
    window: { addEventListener(name: string, fn: () => void) { listeners.set(name, fn); }, removeEventListener() {} },
    fetch: async () => ({ status: sessionStatus, ok: sessionStatus === 200, json: async () => ({ success: true, data: { authenticated: true } }) }),
    require(name: string) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (_: any, props: any) => props.value };
      if (name.includes("PublicAudioPlayerContext")) return { PublicAudioPlayerContext: { Provider: {} } };
      if (name.includes("ProtectedMediaApiService")) return { protectedMediaApiService: service };
      if (name.includes("AuthenticationShellService")) return { authShellChangedEvent: "auth" };
      if (name.includes("SourceSelection")) return { publicAudioSourceSelectionService: { selectPreferredSource: (p: any) => p.url, canPlayMimeType: () => true } };
      if (name.includes("PreviewValidation")) return { publicAudioPreviewValidationService: { validatePreview: (p: any) => ({ valid: Boolean(p.url), blockingIssues: [] }) } };
      if (name.includes("StateMachine")) return { transitionAudioState: (_: any, next: any) => next };
      if (name.includes("audioTimeUtils")) return { clampAudioTime: (n: number) => n };
      if (name.includes("audioErrorUtils")) return { createAudioPlaybackError: (code: string, message: string) => ({ code, message }), mapMediaError: () => ({ message: "media failed" }) };
      throw new Error(name);
    },
  });
  vm.runInContext(compiled, context);
  const render = () => { cursor = 0; const value = exports.PublicAudioPlayerProvider({ children: null }); effects.splice(0).forEach((fn) => fn()); return value; };
  render();
  return { render, calls, timers, listeners, get audio() { return audio!; }, preventPlaying() { autoPlay = false; }, counts(value: typeof usageCounts) { usageCounts = value; }, deferUsage(fn: () => Promise<any>) { resolveUsage = fn; }, failRefresh() { refreshFails = true; }, setStatus(n: number) { sessionStatus = n; }, revoke() { usageAllowed = false; }, authorize(value: any) { authorization = value; }, defer(fn: () => Promise<any>) { resolveAuthorization = fn; } };
}
const preview = { releaseId: "song", url: "/preview.mp3" };
const release = { releaseId: "song", title: "Song" };
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

const member = harness();
member.render().enqueue(preview, release);
await member.render().playNext();
assert.equal(member.calls.authorize, 1);
assert.equal(member.render().playbackMode, "full");
assert.equal(member.render().activePreview, undefined);
assert.match(member.audio.src, /^\/api\/member\/media\/stream\//);
assert.equal(member.render().protectedUsage?.streamStarts, 7);
assert.equal(member.render().protectedUsage?.remainingFullPlays, 0);
assert.equal(JSON.stringify(member.render().queue).includes("protected-auth"), false);
const refresh = [...member.timers.values()].find((t) => t.delay > 30000 && t.delay < 80000)!;
refresh.callback(); await flush();
assert.equal(member.calls.refresh, 1);
assert.ok([...member.timers.values()].some((t) => t.delay === 15000), "refresh must preserve revocation polling");
member.revoke();
[...member.timers.values()].find((t) => t.delay === 15000)!.callback(); await flush();
assert.equal(member.audio.src, "");
assert.equal(member.render().status, "unavailable");
assert.equal(member.render().protectedUsage, undefined);

for (const endpoint of ["https://evil.invalid/audio", "//evil.invalid/audio", "/api/member/media/stream/../token", "/api/member/media/stream/id.token?x=1", "/preview.mp3"]) {
  const denied = harness();
  denied.authorize({ authorized: true, streamEndpoint: endpoint, expiresAt: new Date(Date.now() + 90000).toISOString() });
  await denied.render().playQueued(preview, release);
  assert.equal(denied.audio.src, "");
  assert.equal(denied.render().status, "unavailable");
}
for (const status of [401, 403, 500]) {
  const guest = harness(); guest.setStatus(status);
  await guest.render().playQueued(preview, release);
  assert.equal(guest.audio.src, status === 401 ? preview.url : "");
  assert.equal(guest.calls.authorize, 0);
  assert.equal(guest.render().protectedUsage, undefined);
  assert.equal(guest.calls.usage, 0);
}
for (const authorization of [
  { authorized: false },
  { authorized: true, streamEndpoint: "/api/member/media/stream/id.token" },
  { authorized: true, streamEndpoint: "/api/member/media/stream/id.token", expiresAt: "invalid" },
  { authorized: true, streamEndpoint: "/api/member/media/stream/id.token", expiresAt: new Date(Date.now() - 1000).toISOString() },
]) {
  const denied = harness(); denied.authorize(authorization);
  await denied.render().playQueued(preview, release);
  assert.equal(denied.audio.src, "");
  assert.equal(denied.render().status, "unavailable");
}
const refreshFailure = harness();
await refreshFailure.render().playQueued(preview, release);
refreshFailure.failRefresh();
[...refreshFailure.timers.values()].find((t) => t.delay > 30000 && t.delay < 80000)!.callback(); await flush();
assert.equal(refreshFailure.audio.src, "");
assert.equal(refreshFailure.render().status, "unavailable");
const explicit = harness();
await explicit.render().playPreview(preview, release);
assert.equal(explicit.audio.src, preview.url);
assert.equal(explicit.calls.authorize, 0);
assert.equal(explicit.render().protectedUsage, undefined);
const counters = harness();
counters.preventPlaying();
await counters.render().playQueued(preview, release);
assert.equal(counters.render().protectedUsage, undefined, "authorization alone must not show counters");
[...counters.timers.values()].find((t) => t.delay === 15000)!.callback(); await flush();
assert.equal(counters.render().protectedUsage, undefined, "pre-playback poll must not show counters");
counters.audio.handlers.get("playing")!(); await flush();
assert.equal(counters.render().protectedUsage?.streamStarts, 7);
counters.counts({ streamStarts: 11, remainingFullPlays: null });
[...counters.timers.values()].find((t) => t.delay === 15000)!.callback(); await flush();
assert.equal(counters.render().protectedUsage?.streamStarts, 11, "counts must come from server, not local increments");
assert.equal(counters.render().protectedUsage?.remainingFullPlays, null);
await counters.render().playPreview(preview, release);
assert.equal(counters.render().protectedUsage, undefined, "preview switch clears protected counters");
const staleUsage = harness();
let resolveStaleUsage!: (value: any) => void;
staleUsage.deferUsage(() => new Promise((done) => { resolveStaleUsage = done; }));
await staleUsage.render().playQueued(preview, release);
staleUsage.listeners.get("auth")!();
resolveStaleUsage({ canContinue: true, streamStarts: 99, remainingFullPlays: 1 }); await flush();
assert.equal(staleUsage.render().protectedUsage, undefined, "late usage cannot restore counters after auth change");
const invalidUsage = harness(); invalidUsage.counts({ streamStarts: NaN, remainingFullPlays: -1 });
await invalidUsage.render().playQueued(preview, release);
assert.equal(invalidUsage.render().protectedUsage, undefined);
assert.equal(invalidUsage.audio.src, "");
const expired = harness();
await expired.render().playQueued(preview, release);
[...expired.timers.values()].sort((a, b) => b.delay - a.delay)[0].callback();
assert.equal(expired.audio.src, "");
const ended = harness();
await ended.render().playQueued(preview, release);
ended.audio.handlers.get("ended")!(); await flush();
assert.equal(ended.audio.src, "");
assert.equal(ended.render().source, undefined, "completed authorization cannot be replayed through toggle");
const race = harness();
let resolve!: (result: any) => void;
race.defer(() => new Promise((done) => { resolve = done; }));
const pending = race.render().playQueued(preview, release);
await flush();
race.listeners.get("auth")!();
resolve({ authorized: true, streamEndpoint: "/api/member/media/stream/id.token", expiresAt: new Date(Date.now() + 90000).toISOString() });
await pending;
assert.equal(race.audio.src, "");
assert.equal(race.render().queue.length, 0);
assert.equal(race.render().source, undefined);

const uiSource = readFileSync(new URL("../src/components/audio/PublicAudioPlayer.tsx", import.meta.url), "utf8");
function globalPlayer(player: any, queueOpen = false) {
  const exports: any = {};
  const jsx = (type: any, props: any) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(uiSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, document: {}, require(name: string) {
    if (name === "react") return { useState: () => [queueOpen, () => {}] };
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
    if (name === "react-dom") return { createPortal: (tree: any) => tree };
    if (name.includes("hooks/public")) return { usePublicAudioPlayer: () => player };
    if (name.includes("format")) return { cx: (...values: any[]) => values.join(" ") };
    return new Proxy({}, { get: (_target, key) => String(key) });
  } });
  const nodes: any[] = [];
  const visit = (node: any) => { if (!node || typeof node !== "object") return; if (Array.isArray(node)) { node.forEach(visit); return; } nodes.push(node); visit(node.props?.children); };
  visit(exports.PublicGlobalAudioPlayer());
  return nodes;
}
const ui = harness();
ui.render().enqueue(preview, release);
await ui.render().playNext();
let nodes = globalPlayer(ui.render(), true);
assert.ok(nodes.some((node) => node.type === "CoverArtImage"), "cover remains visible without a release URL via existing fallback");
assert.ok(nodes.some((node) => node.props?.title === "Server-recorded playback starts, not completed listens"));
assert.ok(nodes.some((node) => node.props?.["aria-label"] === "0 included full plays remaining"));
const bubble = nodes.find((node) => node.props?.["aria-label"] === "Pause Song");
assert.match(bubble.props.className, /rounded-full/);
assert.match(nodes.find((node) => node.props?.className === "absolute bottom-3 right-3 flex items-center gap-2").props.className, /bottom-3 right-3/);
nodes.find((node) => node.props?.["aria-label"] === "Mute").props.onClick();
assert.equal(ui.render().muted, true);
nodes.find((node) => node.type === "PublicAudioProgress").props.onSeek(12);
assert.equal(ui.audio.currentTime, 12);
assert.ok(nodes.some((node) => node.props?.["aria-label"] === "Remove Song from queue"));
ui.counts({ streamStarts: 12, remainingFullPlays: null });
ui.audio.handlers.get("playing")!(); await flush();
nodes = globalPlayer(ui.render());
assert.equal(nodes.some((node) => node.props?.title === "Included full plays remaining"), false);
assert.ok(nodes.some((node) => node.props?.["aria-label"] === "12 server-recorded playback starts, not completed listens"));
await ui.render().playPreview(preview, release);
nodes = globalPlayer(ui.render());
assert.equal(nodes.some((node) => node.props?.title === "Server-recorded playback starts, not completed listens"), false);
nodes.find((node) => node.props?.["aria-label"] === "Close audio player").props.onClick();
assert.equal(ui.render().queue.length, 0);
assert.equal(ui.audio.src, "");
console.log("Streaming queue safeguards passed: authorization, preview separation, source safety, refresh/expiry/revocation, auth races, authoritative usage timing/clearing, album-art controls, seek, queue and close.");
