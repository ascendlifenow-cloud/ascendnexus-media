export function frontendBuildIdentity(environment: Record<string, string | undefined>, fallback?: string) {
  const candidates = [environment.CF_PAGES_COMMIT_SHA, environment.WORKERS_CI_COMMIT_SHA, environment.GIT_COMMIT_SHA, environment.COMMIT_SHA, fallback];
  const commitSha = candidates.find(value => typeof value === "string" && /^[a-f0-9]{40}$/i.test(value))?.toLowerCase() ?? "unidentified";
  return { schemaVersion: 1, component: "frontend", commitSha };
}

export function matchesFrontendRevision(value: unknown, expected: string): boolean {
  if (!/^[a-f0-9]{7,40}$/i.test(expected) || !value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1 && record.component === "frontend" && typeof record.commitSha === "string"
    && /^[a-f0-9]{40}$/i.test(record.commitSha) && record.commitSha.toLowerCase().startsWith(expected.toLowerCase());
}
