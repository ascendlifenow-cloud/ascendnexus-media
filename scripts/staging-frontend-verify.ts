import { matchesFrontendRevision } from "./frontend-build-identity";

try {
  const expected = process.argv.find(arg => arg.startsWith("--expected-commit="))?.slice(18);
  if (!process.argv.includes("--environment=staging") || !expected || !/^[a-f0-9]{7,40}$/i.test(expected)) throw new Error();
  const response = await fetch("https://staging.ascendnexusmedia.com/build-info.json", { redirect: "error", cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error();
  const reader = response.body?.getReader();
  if (!reader) throw new Error();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 4096) throw new Error();
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  const passed = matchesFrontendRevision(JSON.parse(Buffer.concat(chunks).toString("utf8")), expected);
  console.log(JSON.stringify({ environment: "staging", component: "frontend", overallStatus: passed ? "pass" : "blocked", expectedRevisionDeployed: passed, readOnly: true }));
  if (!passed) process.exitCode = 1;
} catch {
  console.error(JSON.stringify({ environment: "staging", component: "frontend", overallStatus: "blocked", error: "Frontend revision could not be verified. No response body was printed.", readOnly: true }));
  process.exitCode = 1;
}
