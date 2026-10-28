export interface ProtectedStreamAuthorization {
  authorized: boolean;
  authorizationReference?: string;
  deliveryMode?: string;
  streamEndpoint?: string;
  downloadEndpoint?: string;
  expiresAt?: string;
  mimeType?: string;
  duration?: number;
  rangeSupported?: boolean;
  contentLength?: number;
  refreshAllowed?: boolean;
  safeAccessState?: string;
  playbackSessionId?: string;
}

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Protected media request failed.");
  return payload.data as T;
};

export const protectedMediaApiService = {
  async playbackState(playbackSessionId: string, status: "playing" | "paused" | "completed" | "failed") {
    return parse<unknown>(await fetch(`/api/member/playback/sessions/${encodeURIComponent(playbackSessionId)}`, { method: "PATCH", credentials: "include", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }));
  },
  async refreshStream(endpoint: string) {
    const prefix = "/api/member/media/stream/";
    if (!endpoint.startsWith(prefix)) throw new Error("Invalid playback source.");
    return parse<{ expiresAt: string }>(await fetch("/api/member/media/stream-refresh", { method: "POST", credentials: "include", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorizationReference: decodeURIComponent(endpoint.slice(prefix.length)) }) }));
  },
  async songUsage(releaseSlugOrId: string, signal?: AbortSignal) {
    return parse<{ canStream: boolean; canContinue: boolean; canDownload: boolean; remainingFullPlays: number | null; mode: string; streamStarts: number; usageStatus: string; authorizationVersion: number }>(await fetch(`/api/member/releases/${encodeURIComponent(releaseSlugOrId)}/usage`, { credentials: "include", cache: "no-store", signal }));
  },
  async authorizeStream(mediaId: string, playbackContext: Record<string, unknown> = {}) {
    return parse<ProtectedStreamAuthorization>(await fetch(`/api/member/media/${encodeURIComponent(mediaId)}/stream-authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Scope": "member" },
      credentials: "include",
      body: JSON.stringify({ playbackContext }),
    }));
  },
  async authorizeReleaseStream(releaseSlugOrId: string, playbackContext: Record<string, unknown> = {}) {
    return parse<ProtectedStreamAuthorization>(await fetch(`/api/member/releases/${encodeURIComponent(releaseSlugOrId)}/stream-authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Scope": "member" },
      credentials: "include",
      body: JSON.stringify({ playbackContext }),
    }));
  },
  async authorizeDownload(mediaId: string) {
    return parse<ProtectedStreamAuthorization>(await fetch(`/api/member/media/${encodeURIComponent(mediaId)}/download-authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Scope": "member" },
      credentials: "include",
      body: "{}",
    }));
  },
};
