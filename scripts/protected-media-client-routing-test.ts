import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/member/services/ProtectedMediaApiService.ts", import.meta.url), "utf8");
for (const base of ["", "https://api.example.test", "https://api.example.test/"]) {
  const calls: Array<{ url: string; options: RequestInit }> = [];
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(source.replaceAll("import.meta.env", JSON.stringify({ VITE_API_URL: base })), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, AbortSignal, fetch: async (url: string, options: RequestInit) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ success: true, data: {} }) };
  } });
  const api = exports.protectedMediaApiService;
  await api.authorizeReleaseStream("test song");
  await api.authorizeStream("test-media");
  await api.authorizeDownload("test-media");
  await api.songUsage("test song");
  await api.playbackState("test-session", "playing");
  await api.refreshStream("/api/member/media/stream/id.token");
  for (const call of calls) {
    assert.ok(call.url.startsWith(`${base.replace(/\/+$/, "")}/api/member/`));
    assert.equal(call.options.credentials, "include");
  }
  assert.equal(exports.protectedStreamUrl("/api/member/media/stream/id.token"), `${base.replace(/\/+$/, "")}/api/member/media/stream/id.token`);
  for (const endpoint of ["https://evil.test/file", "//evil.test/file", "/api/member/media/stream/../x", "/api/member/media/stream/id.token?leak=1"]) {
    assert.throws(() => exports.protectedStreamUrl(endpoint), /Invalid playback source/);
  }
}
console.log("Protected media client routing passed: all six API actions share the configured identity host, credentials included, gateway-only URL resolution, external and traversal sources rejected.");
