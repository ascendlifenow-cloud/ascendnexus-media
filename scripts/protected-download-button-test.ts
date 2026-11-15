import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/member/components/media/ProtectedDownloadButton.tsx", import.meta.url), "utf8");
function harness() {
  const exports: Record<string, any> = {};
  const values: any[] = [];
  const effects: Array<() => void> = [];
  const cleanup: Array<() => void> = [];
  const listeners = new Map<string, Set<(event?: any) => void>>();
  const calls: Array<{ slug: string; signal: AbortSignal }> = [];
  const navigations: string[] = [];
  let index = 0;
  let mounted = false;
  let resolve: (value: unknown) => void = () => {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, AbortController, Date, setTimeout, clearTimeout,
    window: {
      location: { assign: (url: string) => navigations.push(url) },
      addEventListener: (name: string, listener: any) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(listener); },
      removeEventListener: (name: string, listener: any) => listeners.get(name)?.delete(listener),
    },
    require(name: string) {
      if (name === "react") return {
        useState: (initial: any) => { const key = index++; if (!(key in values)) values[key] = initial; return [values[key], (next: any) => { values[key] = next; }]; },
        useRef: (initial: any) => { const key = index++; if (!(key in values)) values[key] = { current: initial }; return values[key]; },
        useEffect: (effect: () => void) => { if (!mounted) effects.push(effect); },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name.includes("ProtectedMediaApiService")) return {
        protectedMediaApiService: { authorizeReleaseDownload: (slug: string, signal: AbortSignal) => { calls.push({ slug, signal }); return new Promise(done => { resolve = done; }); } },
        protectedDownloadUrl: (endpoint: string) => { if (!/^\/api\/member\/media\/download\/[\w-]+\.[\w-]+$/.test(endpoint)) throw new Error("Invalid download source."); return `https://api.example.test${endpoint}`; },
      };
      if (name.includes("AuthenticationShellService")) return { authShellChangedEvent: "auth_changed" };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  const render = () => {
    index = 0;
    const tree = exports.ProtectedDownloadButton({ releaseSlug: "selected-song" });
    if (!mounted) { for (const effect of effects) { const stop = effect(); if (typeof stop === "function") cleanup.push(stop); } mounted = true; }
    return tree.props.children[0];
  };
  return { render, calls, navigations, resolve: (value: unknown) => resolve(value), cancel: (storage = false) => { for (const listener of listeners.get(storage ? "storage" : "auth_changed") ?? []) listener(storage ? { key: "auth_changed" } : undefined); }, unmount: () => cleanup.forEach(stop => stop()) };
}
const valid = () => ({ authorized: true, downloadEndpoint: "/api/member/media/download/id.token", expiresAt: new Date(Date.now() + 60000).toISOString() });
const success = harness();
assert.equal(success.calls.length, 0, "Rendering must not preauthorize downloads");
const first = success.render().props.onClick();
await success.render().props.onClick();
assert.equal(success.calls.length, 1, "Repeated clicks must not create duplicate authorizations");
assert.equal(success.render().props.disabled, true);
success.resolve(valid()); await first;
assert.equal(success.navigations[0], "https://api.example.test/api/member/media/download/id.token");
success.unmount();
for (const value of [{ ...valid(), authorized: false }, { ...valid(), expiresAt: "invalid" }, { ...valid(), expiresAt: "2000-01-01" }, { ...valid(), downloadEndpoint: "https://evil.example/file" }]) {
  const h = harness(); const pending = h.render().props.onClick(); h.resolve(value); await pending;
  assert.equal(h.navigations.length, 0); assert.equal(h.render().props.disabled, false); h.unmount();
}
for (const mode of ["logout", "storage", "unmount"]) {
  const h = harness(); const pending = h.render().props.onClick();
  if (mode === "unmount") h.unmount(); else h.cancel(mode === "storage");
  assert.equal(h.calls[0].signal.aborted, true);
  h.resolve(valid()); await pending;
  assert.equal(h.navigations.length, 0, "Stale authorization must never navigate after cleanup");
  if (mode !== "unmount") { assert.equal(h.render().props.disabled, true); h.unmount(); }
}
console.log("Protected download button passed: on-demand authorization, API-host routing, duplicate-click guard, denied/expired/unsafe response rejection, logout/cross-tab/unmount cancellation. Mocked browser lifecycle; not a live download.");
