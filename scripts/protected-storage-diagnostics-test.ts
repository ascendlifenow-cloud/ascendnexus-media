import assert from "node:assert/strict";
import { readProtectedStorageErrorCode } from "../server/services/protectedContent/ProtectedStorageErrorDiagnostics";

const signal = new AbortController().signal;
const response = (body: string) => new Response(body, { status: 400 });
assert.equal(await readProtectedStorageErrorCode(response("<Error><Code>InvalidArgument</Code><Message>Credential access key has length 40, should be 32: SECRET_VALUE</Message></Error>"), signal), "InvalidArgumentCredentialLength");
for (const code of ["InvalidArgument", "SignatureDoesNotMatch", "AuthorizationQueryParametersError", "RequestTimeTooSkewed"]) {
  assert.equal(await readProtectedStorageErrorCode(response(`<Error><Code>${code}</Code><Message>SECRET_URL</Message></Error>`), signal), code);
}
for (const body of ["", "<Code>SECRET_URL</Code>", "<Code>https://private.invalid/?token=SECRET_URL</Code>", "<Error><Message>SECRET_URL</Message></Error>", `${"x".repeat(4096)}<Code>InvalidArgument</Code>`]) {
  assert.equal(await readProtectedStorageErrorCode(response(body), signal), "unavailable");
}
let cancelled = false;
const chunks = ["<Error><Co", "de>InvalidArgument</Code><Message>SECRET_URL</Message></Error>"];
const split = new Response(new ReadableStream({
  pull(controller) { controller.enqueue(new TextEncoder().encode(chunks.shift()!)); },
  cancel() { cancelled = true; },
}, { highWaterMark: 0 }), { status: 400 });
assert.equal(await readProtectedStorageErrorCode(split, signal), "InvalidArgument");
assert.equal(cancelled, true);
let finishCancel!: () => void;
const pendingCancel = new Promise<void>(resolve => { finishCancel = resolve; });
const stalled = new Response(new ReadableStream({ cancel() { return pendingCancel; } }), { status: 400 });
let guard: ReturnType<typeof setTimeout> | undefined;
try {
  assert.equal(await Promise.race([
    readProtectedStorageErrorCode(stalled, signal),
    new Promise((_, reject) => { guard = setTimeout(() => reject(new Error("Diagnostics exceeded their bounded deadline.")), 1500); }),
  ]), "unavailable");
} finally { clearTimeout(guard); finishCancel(); }
const abort = new AbortController();
const abortedRead = readProtectedStorageErrorCode(new Response(new ReadableStream(), { status: 400 }), abort.signal);
abort.abort();
assert.equal(await abortedRead, "unavailable");
let emptyChunks = 0;
const empty = new Response(new ReadableStream({ pull(controller) { emptyChunks++; controller.enqueue(new Uint8Array()); } }, { highWaterMark: 0 }), { status: 400 });
assert.equal(await readProtectedStorageErrorCode(empty, signal), "unavailable");
assert.equal(emptyChunks, 32, "Empty chunks cannot keep diagnostic reads running indefinitely.");
assert.equal(await readProtectedStorageErrorCode(new Response(null, { status: 400 }), signal), "unavailable");
console.log("Protected storage diagnostics passed: allowlisted codes only, split XML, byte/chunk/time bounds, abort and non-blocking cancellation. Synthetic responses only.");
